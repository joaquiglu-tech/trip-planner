import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { ITEMS } from '../data/items';

export function useSelections(currentUserEmail) {
  const [S, setS] = useState(() => {
    const init = {};
    ITEMS.forEach((it) => { init[it.id] = it.def || ''; });
    return init;
  });
  const [paidPrices, setPaidPricesState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('selections').select('item_id, status, updated_by, paid_price');
      if (data && data.length > 0) {
        setS((prev) => {
          const next = { ...prev };
          data.forEach((row) => { next[row.item_id] = row.status || ''; });
          return next;
        });
        const pp = {};
        data.forEach((row) => { if (row.paid_price) pp[row.item_id] = Number(row.paid_price); });
        setPaidPricesState(pp);
      }
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('selections-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selections' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old.item_id;
          const item = ITEMS.find((i) => i.id === oldId);
          setS((prev) => ({ ...prev, [oldId]: item?.def || '' }));
          setPaidPricesState((prev) => { const n = { ...prev }; delete n[oldId]; return n; });
        } else {
          const { item_id, status, updated_by, paid_price } = payload.new;
          setS((prev) => ({ ...prev, [item_id]: status || '' }));
          if (paid_price) setPaidPricesState((prev) => ({ ...prev, [item_id]: Number(paid_price) }));
          if (updated_by && updated_by !== currentUserEmail) {
            const item = ITEMS.find((i) => i.id === item_id);
            const who = updated_by.split('@')[0];
            const action = status === 'conf' ? 'confirmed' : status === 'sel' ? 'selected' : 'deselected';
            showToast(`${who} ${action} ${item?.name || item_id}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserEmail]);

  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = ITEMS.find((i) => i.id === id);
    if (item?.stayCity && (status === 'sel' || status === 'conf')) {
      const others = ITEMS.filter((i) => i.stayCity === item.stayCity && i.id !== id);
      for (const o of others) { await supabase.from('selections').delete().eq('item_id', o.id); }
      setS((prev) => { const next = { ...prev }; others.forEach((o) => { next[o.id] = ''; }); return next; });
    }
    setS((prev) => ({ ...prev, [id]: status }));
    if (status === '') {
      await supabase.from('selections').delete().eq('item_id', id);
    } else {
      await supabase.from('selections').upsert(
        { item_id: id, status, updated_at: new Date().toISOString(), updated_by: currentUserEmail },
        { onConflict: 'item_id' }
      );
    }
  }, [currentUserEmail]);

  const setPaidPrice = useCallback(async (id, amount) => {
    setPaidPricesState((prev) => ({ ...prev, [id]: amount }));
    await supabase.from('selections').upsert(
      { item_id: id, paid_price: amount, updated_at: new Date().toISOString(), updated_by: currentUserEmail },
      { onConflict: 'item_id' }
    );
  }, [currentUserEmail]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('selections').select('item_id, status, updated_by, paid_price');
    if (data) {
      const next = {}, pp = {};
      ITEMS.forEach((it) => { next[it.id] = it.def || ''; });
      data.forEach((row) => { next[row.item_id] = row.status || ''; if (row.paid_price) pp[row.item_id] = Number(row.paid_price); });
      setS(next);
      setPaidPricesState(pp);
    }
  }, []);

  return { S, setStatus, loaded, paidPrices, setPaidPrice, toast, refresh };
}
