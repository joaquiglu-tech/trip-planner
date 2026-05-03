import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { ENRICHMENT } from '../data/enrichment';
import { ITEM_COORDS } from '../data/coords';
import { listFiles } from './storage';

const EUR = 1.17;
export const usd = (e) => Math.round(e * EUR);
export const $f = (n) => '$' + n.toLocaleString();

export function itemCost(it) {
  if (it.type === 'stay') return usd((it.pn || 0) * (it.nights || 1));
  if (it.type === 'activity') return usd((it.eur || 0) * 2);
  if (it.type === 'special') return usd((it.pp_eur || 0) * 2);
  if (it.type === 'dining') return usd((it.eur || 0) * 2);
  return 0;
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
