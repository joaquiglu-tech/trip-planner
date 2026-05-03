import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { ENRICHMENT } from '../data/enrichment';
import { ITEM_COORDS } from '../data/coords';
import { listFiles } from './storage';
import { fetchHotelPrice } from './hotelPrices';
import { enrichItem } from './enrichItem';

export const $f = (n) => '$' + (n || 0).toLocaleString();

// Estimated cost — single source of truth
export function itemCost(it) {
  return Number(it.estimated_cost) || 0;
}

// Price display for cards
export function priceLabel(it, livePrice, expenseAmount) {
  if (expenseAmount > 0) return { text: $f(expenseAmount), type: 'confirmed' };
  if (livePrice > 0 && it.type === 'stay') return { text: `${$f(livePrice)}/n`, type: 'live' };
  if (it.estimated_cost > 0) return { text: $f(it.estimated_cost), type: 'estimate' };
  if (it.type === 'activity' && it.estimated_cost === 0) return { text: 'Free', type: 'estimate' };
  return { text: '', type: 'none' };
}

// Merge DB row with enrichment fallbacks
function mergeItem(row) {
  const extra = ENRICHMENT[row.id] || {};
  const coord = (row.lat && row.lng) ? { lat: Number(row.lat), lng: Number(row.lng) } : ITEM_COORDS[row.id] || null;
  return {
    ...row,
    ...extra,
    coord,
    // DB columns override enrichment.js when populated
    ...(row.reserve_note ? { reserveNote: row.reserve_note } : {}),
    ...(row.depart_time ? { departTime: row.depart_time } : {}),
    ...(row.arrive_time ? { arriveTime: row.arrive_time } : {}),
    ...(row.route ? { route: row.route } : {}),
  };
}

export function useItems(currentUserEmail) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [files, setFilesState] = useState({});
  const [livePrices, setLivePrices] = useState({}); // in-memory only, keyed by item id
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // Load all items
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('items').select('*').order('sort_order');
      if (error) { console.warn('Failed to load items:', error); setLoaded(true); return; }
      const merged = (data || []).map(mergeItem);
      setItems(merged);
      setLoaded(true);

      // Fetch live hotel prices in background (in-memory only)
      const staysWithKeys = merged.filter(it => it.type === 'stay' && it.xotelo_key);
      if (staysWithKeys.length > 0) {
        (async () => {
          for (const stay of staysWithKeys) {
            try {
              const dates = getStayDates(stay);
              const price = await fetchHotelPrice(stay.xotelo_key, dates.checkIn, dates.checkOut);
              if (price) {
                setLivePrices(prev => ({ ...prev, [stay.id]: { perNight: price.per_night, source: price.source, allRates: price.all_rates } }));
              }
            } catch { /* skip */ }
            await new Promise(r => setTimeout(r, 500));
          }
        })();
      }

      // Load files for confirmed items
      const confItems = merged.filter(it => it.status === 'conf');
      if (confItems.length > 0) {
        Promise.allSettled(confItems.map(it => listFiles(it.id).then(f => ({ id: it.id, files: f }))))
          .then(results => {
            const fm = {};
            results.forEach(r => { if (r.status === 'fulfilled' && r.value.files.length > 0) fm[r.value.id] = r.value.files; });
            setFilesState(fm);
          });
      }
    }
    load();
  }, []);

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel('items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(it => it.id !== payload.old.id));
        } else {
          const merged = mergeItem(payload.new);
          setItems(prev => {
            const idx = prev.findIndex(it => it.id === merged.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = merged; return next; }
            return [...prev, merged];
          });
          if (payload.new.updated_by && payload.new.updated_by !== currentUserEmail) {
            const who = payload.new.updated_by.split('@')[0];
            const action = payload.new.status === 'conf' ? 'booked' : payload.new.status === 'sel' ? 'added' : 'updated';
            showToast(`${who} ${action} ${payload.new.name}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserEmail]);

  const updateItem = useCallback(async (id, changes) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...changes } : it));
    const { error } = await supabase.from('items').update({
      ...changes, updated_at: new Date().toISOString(), updated_by: currentUserEmail,
    }).eq('id', id);
    if (error) console.warn('Failed to update item:', error);
  }, [currentUserEmail]);

  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = items.find(it => it.id === id);
    // Stay mutual exclusion
    if (item?.type === 'stay' && item?.city && (status === 'sel' || status === 'conf')) {
      const others = items.filter(it => it.type === 'stay' && it.city === item.city && it.id !== id && (it.status === 'sel' || it.status === 'conf'));
      if (others.length > 0) {
        setItems(prev => prev.map(it => others.some(o => o.id === it.id) ? { ...it, status: '' } : it));
        await Promise.all(others.map(o => supabase.from('items').update({ status: '', updated_at: new Date().toISOString(), updated_by: currentUserEmail }).eq('id', o.id)));
      }
    }
    await updateItem(id, { status });
  }, [items, currentUserEmail, updateItem]);

  const addItem = useCallback(async (itemData) => {
    const newItem = {
      id: crypto.randomUUID(),
      name: itemData.name || '',
      type: itemData.type || 'dining',
      city: itemData.city || '',
      description: itemData.desc_text || itemData.description || '',
      dish: itemData.dish || '',
      link: itemData.link || '',
      estimated_cost: itemData.estimated_cost || 0,
      status: 'sel',
      created_by: currentUserEmail,
      updated_by: currentUserEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('items').insert(newItem).select().single();
    if (error) throw error;
    const merged = mergeItem(data);
    setItems(prev => [...prev, merged]);
    enrichItem(data).then(changes => {
      if (Object.keys(changes).length > 0) {
        setItems(prev => prev.map(it => it.id === data.id ? { ...it, ...changes } : it));
      }
    });
    return data;
  }, [currentUserEmail]);

  const deleteItem = useCallback(async (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
    await supabase.from('items').delete().eq('id', id);
  }, []);

  const setFile = useCallback((id, fileData) => {
    setFilesState(prev => {
      const existing = prev[id] || [];
      if (fileData === null) return { ...prev, [id]: [] };
      if (Array.isArray(fileData)) return { ...prev, [id]: fileData };
      return { ...prev, [id]: [...existing, fileData] };
    });
  }, []);

  const removeFile = useCallback((id, filePath) => {
    setFilesState(prev => ({ ...prev, [id]: (prev[id] || []).filter(f => f.path !== filePath) }));
  }, []);

  return { items, loaded, files, livePrices, toast, updateItem, setStatus, addItem, deleteItem, setFile, removeFile };
}

// Stay date lookup from stops (loaded separately)
function getStayDates(stay) {
  // City-based date lookup for Xotelo
  const CITY_DATES = {
    'Rome': { checkIn: '2026-07-20', nights: 4 },
    'Florence': { checkIn: '2026-07-24', nights: 2 },
    'Montepulciano': { checkIn: '2026-07-25', nights: 1 },
    "Val d'Orcia": { checkIn: '2026-07-26', nights: 1 },
    'Lerici': { checkIn: '2026-07-27', nights: 1 },
    'Bergamo Alta': { checkIn: '2026-07-28', nights: 1 },
    'Bellagio': { checkIn: '2026-07-29', nights: 1 },
    'Sirmione': { checkIn: '2026-07-30', nights: 1 },
    'Verona': { checkIn: '2026-07-31', nights: 1 },
    'Venice': { checkIn: '2026-08-01', nights: 1 },
  };
  const cityDates = CITY_DATES[stay.city];
  if (cityDates) {
    const d = new Date(cityDates.checkIn);
    d.setDate(d.getDate() + cityDates.nights);
    return { checkIn: cityDates.checkIn, checkOut: d.toISOString().split('T')[0] };
  }
  return { checkIn: '2026-07-20', checkOut: '2026-07-24' };
}
