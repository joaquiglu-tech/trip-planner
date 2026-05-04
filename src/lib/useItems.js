import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { listFiles } from './storage';
import { fetchHotelPrice } from './hotelPrices';
import { enrichItem } from './enrichItem';

export const $f = (n) => '$' + (n || 0).toLocaleString();

export function itemCost(it) {
  return Number(it.estimated_cost) || 0;
}

export function priceLabel(it, livePrice, expenseAmount) {
  if (expenseAmount > 0) return { text: $f(expenseAmount), type: 'confirmed' };
  if (livePrice > 0 && it.type === 'stay') return { text: `${$f(livePrice)}/n`, type: 'live' };
  if (it.estimated_cost > 0) return { text: $f(Number(it.estimated_cost)), type: 'estimate' };
  if (it.type === 'activity' && !it.estimated_cost) return { text: 'Free', type: 'estimate' };
  return { text: '', type: 'none' };
}

// Merge DB row — add computed fields
function mergeItem(row, stopName) {
  const coord = (row.lat && row.lng) ? { lat: Number(row.lat), lng: Number(row.lng) } : null;
  return {
    ...row,
    coord,
    city: stopName || '',
    // Parse pipe-delimited text fields into arrays for display
    whatToExpect: row.what_to_expect ? row.what_to_expect.split('|').map(s => s.trim()).filter(Boolean) : null,
    proTips: row.pro_tips ? row.pro_tips.split('|').map(s => s.trim()).filter(Boolean) : null,
    highlights: row.highlights ? row.highlights.split('|').map(s => s.trim()).filter(Boolean) : null,
    quoteSource: row.quote_source || '',
    options: row.booking_options?.length > 0 ? row.booking_options : null,
    reserveNote: row.reserve_note || '',
    departTime: row.depart_time || '',
    arriveTime: row.arrive_time || '',
  };
}

export function useItems(currentUserEmail) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [files, setFilesState] = useState({});
  const [livePrices, setLivePrices] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      const [itemsRes, stopsRes] = await Promise.all([
        supabase.from('items').select('*').order('sort_order'),
        supabase.from('stops').select('id, name, start_date, end_date').order('sort_order'),
      ]);
      if (itemsRes.error) { console.warn('Failed to load items:', itemsRes.error); setLoaded(true); return; }
      const stopsMap = {};
      (stopsRes.data || []).forEach(s => { stopsMap[s.id] = s; });
      const merged = (itemsRes.data || []).map(row => {
        const firstStopId = row.stop_ids?.[0];
        const stop = firstStopId ? stopsMap[firstStopId] : null;
        return mergeItem(row, stop?.name || '');
      });
      setItems(merged);
      setLoaded(true);

      // Fetch live hotel prices in background
      const staysWithKeys = merged.filter(it => it.type === 'stay' && it.xotelo_key);
      if (staysWithKeys.length > 0) {
        const stopsLookup = stopsRes.data || [];
        (async () => {
          for (const stay of staysWithKeys) {
            try {
              const dates = getStayDates(stay, stopsLookup);
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
          const merged = mergeItem(payload.new, '');
          setItems(prev => {
            const idx = prev.findIndex(it => it.id === merged.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...merged }; return next; }
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
    const itemStops = item?.stop_ids || [];
    if (item?.type === 'stay' && itemStops.length > 0 && (status === 'sel' || status === 'conf')) {
      const others = items.filter(it => it.type === 'stay' && it.id !== id && (it.status === 'sel' || it.status === 'conf') && it.stop_ids?.some(s => itemStops.includes(s)));
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
      type: itemData.type || 'food',
      description: itemData.desc_text || itemData.description || '',
      link: itemData.link || '',
      estimated_cost: itemData.estimated_cost || 0,
      dish: itemData.dish || '',
      stop_ids: itemData.stop_ids || [],
      status: 'sel',
      created_by: currentUserEmail,
      updated_by: currentUserEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('items').insert(newItem).select().single();
    if (error) throw error;
    const merged = mergeItem(data, '');
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

// Stay date lookup from stops table
function getStayDates(stay, stops) {
  const firstStopId = stay.stop_ids?.[0];
  if (firstStopId) {
    const byId = stops.find(s => s.id === firstStopId);
    if (byId) return { checkIn: String(byId.start_date).substring(0, 10), checkOut: String(byId.end_date).substring(0, 10) };
  }
  const stop = stops.find(s => s.name === stay.city || s.name?.includes(stay.city));
  if (stop) return { checkIn: String(stop.start_date).substring(0, 10), checkOut: String(stop.end_date).substring(0, 10) };
  if (stops.length > 0) return { checkIn: String(stops[0].start_date).substring(0, 10), checkOut: String(stops[stops.length - 1].end_date).substring(0, 10) };
  return { checkIn: '2026-07-20', checkOut: '2026-07-24' };
}
