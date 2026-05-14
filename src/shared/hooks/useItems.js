import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { enrichItem } from '../../services/enrichItem';

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

function mergeItem(row, stopName, existingCity) {
  const coord = (row.lat && row.lng) ? { lat: Number(row.lat), lng: Number(row.lng) } : null;
  const originCoord = (row.origin_lat && row.origin_lng) ? { lat: Number(row.origin_lat), lng: Number(row.origin_lng) } : null;
  const destCoord = (row.dest_lat && row.dest_lng) ? { lat: Number(row.dest_lat), lng: Number(row.dest_lng) } : null;
  const routeLabel = (row.origin_name && row.dest_name)
    ? `${row.origin_name} \u2192 ${row.dest_name}`
    : row.route || '';
  return {
    ...row,
    coord, originCoord, destCoord, routeLabel,
    city: stopName || existingCity || '',
    whatToExpect: row.what_to_expect ? row.what_to_expect.split('|').map(s => s.trim()).filter(Boolean) : null,
    proTips: row.pro_tips ? row.pro_tips.split('|').map(s => s.trim()).filter(Boolean) : null,
    highlights: row.highlights ? row.highlights.split('|').map(s => s.trim()).filter(Boolean) : null,
    quoteSource: row.quote_source || '',
    options: row.booking_options?.length > 0 ? row.booking_options : null,
    reserveNote: row.reserve_note || '',
    start_time: row.start_time || row.depart_time || '',
    end_time: row.end_time || row.arrive_time || '',
  };
}

export function useItems(currentUserEmail, showToast) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [loaded, setLoaded] = useState(false);
  const stopsMapRef = useRef({});
  const stopsDataRef = useRef([]);

  // Load items + stops for city derivation
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [itemsRes, stopsRes] = await Promise.all([
        supabase.from('items').select('*').order('sort_order'),
        supabase.from('stops').select('id, name, start_date, end_date').order('sort_order'),
      ]);
      if (cancelled) return;
      if (itemsRes.error) { console.warn('Failed to load items:', itemsRes.error); setLoaded(true); return; }
      const stopsMap = {};
      (stopsRes.data || []).forEach(s => { stopsMap[s.id] = s; });
      stopsMapRef.current = stopsMap;
      stopsDataRef.current = stopsRes.data || [];
      const merged = (itemsRes.data || []).map(row => {
        const firstStopId = row.stop_ids?.[0];
        const stop = firstStopId ? stopsMap[firstStopId] : null;
        return mergeItem(row, stop?.name || '', '');
      });
      setItems(merged);
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel('items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(it => it.id !== payload.old.id));
        } else {
          const firstStopId = payload.new.stop_ids?.[0];
          const stopName = firstStopId ? stopsMapRef.current[firstStopId]?.name || '' : '';
          setItems(prev => {
            const idx = prev.findIndex(it => it.id === payload.new.id);
            const existingCity = idx >= 0 ? prev[idx].city : '';
            const merged = mergeItem(payload.new, stopName, existingCity);
            if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...merged }; return next; }
            return [...prev, merged];
          });
          if (showToast && payload.new.updated_by && payload.new.updated_by !== currentUserEmail) {
            const who = payload.new.updated_by.split('@')[0];
            const action = payload.new.status === 'conf' ? 'booked' : payload.new.status === 'sel' ? 'added' : 'updated';
            showToast(`${who} ${action} ${payload.new.name}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserEmail, showToast]);

  const updateItem = useCallback(async (id, changes) => {
    let prev;
    setItems(p => p.map(it => {
      if (it.id === id) { prev = it; return { ...it, ...changes }; }
      return it;
    }));
    const { error } = await supabase.from('items').update({
      ...changes, updated_at: new Date().toISOString(), updated_by: currentUserEmail,
    }).eq('id', id);
    if (error) {
      if (prev) setItems(p => p.map(it => it.id === id ? prev : it));
      throw error;
    }
  }, [currentUserEmail]);

  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = itemsRef.current.find(it => it.id === id);
    const itemStops = item?.stop_ids || [];
    if (item?.type === 'stay' && itemStops.length > 0 && (status === 'sel' || status === 'conf')) {
      const others = itemsRef.current.filter(it => it.type === 'stay' && it.id !== id && (it.status === 'sel' || it.status === 'conf') && it.stop_ids?.some(s => itemStops.includes(s)));
      if (others.length > 0) {
        setItems(prev => prev.map(it => others.some(o => o.id === it.id) ? { ...it, status: '' } : it));
        try {
          await Promise.all(others.map(o => supabase.from('items').update({ status: '', updated_at: new Date().toISOString(), updated_by: currentUserEmail }).eq('id', o.id)));
        } catch (err) {
          console.warn('Failed to deselect conflicting stays:', err);
        }
        if (showToast) {
          const names = others.map(o => o.name).join(', ');
          showToast(`Deselected ${names} (only one stay per stop)`);
        }
      }
    }
    await updateItem(id, { status });
  }, [currentUserEmail, updateItem, showToast]);

  const addItem = useCallback(async (itemData) => {
    const newItem = {
      id: crypto.randomUUID(),
      name: itemData.name || '',
      type: itemData.type || 'food',
      description: itemData.desc_text || itemData.description || '',
      link: itemData.link || '',
      estimated_cost: itemData.estimated_cost || 0,
      dish: itemData.dish || '', subcat: itemData.subcat || '', tier: itemData.tier || '',
      route: itemData.route || '', transport_mode: itemData.transport_mode || '',
      is_rental: itemData.is_rental || false,
      xotelo_key: itemData.xotelo_key || null,
      origin_name: itemData.origin_name || '', origin_lat: itemData.origin_lat || null, origin_lng: itemData.origin_lng || null,
      dest_name: itemData.dest_name || '', dest_lat: itemData.dest_lat || null, dest_lng: itemData.dest_lng || null,
      hrs: itemData.hrs || null, notes: itemData.notes || '',
      start_time: itemData.start_time || null, end_time: itemData.end_time || null,
      stop_ids: itemData.stop_ids || [],
      status: 'sel',
      created_by: currentUserEmail, updated_by: currentUserEmail,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('items').insert(newItem).select().single();
    if (error) throw error;
    const firstStopId = data.stop_ids?.[0];
    const stopName = firstStopId ? stopsMapRef.current[firstStopId]?.name || '' : '';
    const merged = mergeItem(data, stopName, '');
    setItems(prev => [...prev, merged]);
    enrichItem(data).then(changes => {
      if (Object.keys(changes).length > 0) {
        updateItem(data.id, changes).catch(err =>
          console.warn('enrichItem updateItem failed for', data.name, err));
      }
    }).catch(err => console.warn('enrichItem failed for', data.name, err));
    return data;
  }, [currentUserEmail, updateItem]);

  const deleteItem = useCallback(async (id) => {
    let prev;
    setItems(p => {
      prev = p.find(it => it.id === id);
      return p.filter(it => it.id !== id);
    });
    try {
      await supabase.from('expenses').delete().eq('item_id', id);
      await supabase.from('place_cache').delete().eq('item_id', id);
      try {
        const { data: storageFiles } = await supabase.storage.from('reservations').list(id);
        if (storageFiles?.length > 0) {
          await supabase.storage.from('reservations').remove(storageFiles.map(f => `${id}/${f.name}`));
        }
      } catch (storageErr) { console.warn('Storage cleanup failed for item', id, storageErr); }
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.warn('Failed to delete item:', error);
        if (prev) setItems(p => [...p, prev]);
      }
    } catch (err) {
      console.warn('deleteItem cascade error:', err);
      if (prev) setItems(p => [...p, prev]);
    }
  }, []);

  // Memoized derived data for live prices hook
  const staysWithKeys = useMemo(() => items.filter(it => it.type === 'stay' && it.xotelo_key), [items]);
  const stopsData = stopsDataRef.current;

  return { items, loaded, updateItem, setStatus, addItem, deleteItem, staysWithKeys, stopsData };
}
