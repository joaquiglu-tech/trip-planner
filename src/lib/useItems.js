import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { ENRICHMENT } from '../data/enrichment';
import { ITEM_COORDS } from '../data/coords';
import { listFiles } from './storage';
import { fetchHotelPrice } from './hotelPrices';

const EUR = 1.17;
export const usd = (e) => Math.round(e * EUR);
export const $f = (n) => '$' + n.toLocaleString();

// Returns the best available cost estimate for budget calculations
export function itemCost(it) {
  // 1. If user confirmed a paid price, use that
  if (it.paid_price > 0) return it.paid_price;
  // 2. If live price available (Xotelo for hotels), use that
  if (it.live_price > 0 && it.type === 'stay') return it.live_price * (it.nights || 1);
  // 3. Use the researched estimated_cost (pre-calculated USD)
  if (it.estimated_cost > 0) return it.estimated_cost;
  // 4. Fallback to EUR conversion
  if (it.type === 'stay') return usd((it.pn || 0) * (it.nights || 1));
  if (it.type === 'activity') return usd((it.eur || 0) * 2);
  if (it.type === 'special') return usd((it.pp_eur || 0) * 2);
  if (it.type === 'dining') return usd((it.eur || 0) * 2);
  return 0;
}

// Price display label for cards
export function priceLabel(it) {
  if (it.paid_price > 0) return { text: $f(it.paid_price), type: 'confirmed' };
  if (it.live_price > 0 && it.type === 'stay') return { text: `${$f(it.live_price)}/n`, type: 'live', source: it.live_price_source };
  if (it.estimated_cost > 0) return { text: $f(it.estimated_cost), type: 'estimate' };
  if (it.price_label) return { text: it.price_label, type: 'estimate' };
  if (it.type === 'stay' && it.pn > 0) return { text: $f(usd(it.pn * (it.nights || 1))), type: 'estimate' };
  if (it.type === 'activity' && it.eur === 0) return { text: 'Free', type: 'estimate' };
  if (it.type === 'activity' && it.eur > 0) return { text: $f(usd(it.eur * 2)), type: 'estimate' };
  if (it.type === 'special' && it.pp_eur > 0) return { text: $f(usd(it.pp_eur * 2)), type: 'estimate' };
  if (it.type === 'dining' && it.eur > 0) return { text: $f(usd(it.eur * 2)), type: 'estimate' };
  return { text: '', type: 'none' };
}

export function useItems(currentUserEmail) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [files, setFilesState] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // Load all items + merge enrichment + load files
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('items').select('*').order('sort_order');
      if (error) { console.warn('Failed to load items:', error); setLoaded(true); return; }
      // Merge enrichment data (read-only reference: quotes, whatToExpect, highlights, options, etc.)
      const merged = (data || []).map(row => {
        const extra = ENRICHMENT[row.id];
        const coord = ITEM_COORDS[row.id];
        return { ...row, ...(extra || {}), coord: coord || null };
      });
      setItems(merged);
      setLoaded(true);

      // Fetch live hotel prices in background (non-blocking)
      const staysWithKeys = merged.filter(it => it.type === 'stay' && it.xotelo_key);
      if (staysWithKeys.length > 0) {
        (async () => {
          for (const stay of staysWithKeys) {
            // Skip if live price was fetched recently (within 24h)
            if (stay.live_price_updated && (Date.now() - new Date(stay.live_price_updated).getTime()) < 86400000) continue;
            const { checkIn, checkOut } = getStayDates(stay);
            try {
              const price = await fetchHotelPrice(stay.xotelo_key, checkIn, checkOut);
              if (price) {
                setItems(prev => prev.map(it => it.id === stay.id ? { ...it, live_price: price.per_night, live_price_source: price.source, live_price_updated: new Date().toISOString() } : it));
                await supabase.from('items').update({ live_price: price.per_night, live_price_source: price.source, live_price_updated: new Date().toISOString() }).eq('id', stay.id);
              }
            } catch { /* skip failures */ }
            await new Promise(r => setTimeout(r, 500));
          }
        })();
      }

      // Load files for confirmed items in parallel (non-blocking)
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
          const oldId = payload.old.id;
          setItems(prev => prev.filter(it => it.id !== oldId));
        } else {
          const row = payload.new;
          const extra = ENRICHMENT[row.id];
          const coord = ITEM_COORDS[row.id];
          const merged = { ...row, ...(extra || {}), coord: coord || null };
          setItems(prev => {
            const idx = prev.findIndex(it => it.id === row.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = merged;
              return next;
            }
            return [...prev, merged];
          });
          // Toast for other user's changes
          if (row.updated_by && row.updated_by !== currentUserEmail) {
            const who = row.updated_by.split('@')[0];
            const action = row.status === 'conf' ? 'booked' : row.status === 'sel' ? 'added' : 'updated';
            showToast(`${who} ${action} ${row.name}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserEmail]);

  // Update any fields on an item
  const updateItem = useCallback(async (id, changes) => {
    // Optimistic update
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...changes } : it));
    const { error } = await supabase.from('items').update({
      ...changes,
      updated_at: new Date().toISOString(),
      updated_by: currentUserEmail,
    }).eq('id', id);
    if (error) console.warn('Failed to update item:', error);
  }, [currentUserEmail]);

  // Set status (with stay mutual exclusion)
  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = items.find(it => it.id === id);
    // Stay mutual exclusion: if selecting a stay, deselect other stays in same city
    if (item?.stay_city && (status === 'sel' || status === 'conf')) {
      const others = items.filter(it => it.stay_city === item.stay_city && it.id !== id && (it.status === 'sel' || it.status === 'conf'));
      if (others.length > 0) {
        setItems(prev => prev.map(it => others.some(o => o.id === it.id) ? { ...it, status: '' } : it));
        await Promise.all(others.map(o => supabase.from('items').update({ status: '', updated_at: new Date().toISOString(), updated_by: currentUserEmail }).eq('id', o.id)));
      }
    }
    await updateItem(id, { status });
  }, [items, currentUserEmail, updateItem]);

  // Add a new item
  const addItem = useCallback(async (itemData) => {
    const newItem = {
      id: crypto.randomUUID(),
      name: itemData.name || '',
      type: itemData.type || 'dining',
      city: itemData.city || '',
      description: itemData.desc_text || itemData.description || '',
      dish: itemData.dish || '',
      link: itemData.link || '',
      image_url: itemData.image_url || '',
      price_label: itemData.price_label || '',
      status: 'sel',
      created_by: currentUserEmail,
      updated_by: currentUserEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('items').insert(newItem).select().single();
    if (error) throw error;
    const merged = { ...data, ...(ENRICHMENT[data.id] || {}), coord: ITEM_COORDS[data.id] || null };
    setItems(prev => [...prev, merged]);
    return data;
  }, [currentUserEmail]);

  // Delete an item
  const deleteItem = useCallback(async (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
    await supabase.from('items').delete().eq('id', id);
  }, []);

  // File management
  const setFile = useCallback((id, fileData) => {
    setFilesState(prev => {
      const existing = prev[id] || [];
      if (fileData === null) return { ...prev, [id]: [] };
      if (Array.isArray(fileData)) return { ...prev, [id]: fileData };
      return { ...prev, [id]: [...existing, fileData] };
    });
  }, []);

  const removeFile = useCallback((id, filePath) => {
    setFilesState(prev => {
      const existing = prev[id] || [];
      return { ...prev, [id]: existing.filter(f => f.path !== filePath) };
    });
  }, []);

  return { items, loaded, files, toast, updateItem, setStatus, addItem, deleteItem, setFile, removeFile, itemCost: itemCost };
}

// Date helpers for Xotelo check-in/out calculation
// City → check-in date + nights (from allDays trip structure)
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

function getStayDates(stay) {
  // Use city to determine check-in/out dates
  const cityKey = stay.stay_city || stay.city;
  const cityDates = CITY_DATES[cityKey];
  if (cityDates) {
    const checkOut = addDays(cityDates.checkIn, stay.nights || cityDates.nights);
    return { checkIn: cityDates.checkIn, checkOut };
  }
  // Fallback: use day_n to estimate
  if (stay.day_n) {
    const base = new Date('2026-07-12');
    base.setDate(base.getDate() + (stay.day_n - 1));
    const checkIn = base.toISOString().split('T')[0];
    return { checkIn, checkOut: addDays(checkIn, stay.nights || 1) };
  }
  return { checkIn: '2026-07-20', checkOut: '2026-07-24' };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
