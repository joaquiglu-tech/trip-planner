import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export function useCustomItems() {
  const [customItems, setCustomItems] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('custom_items').select('*').order('created_at', { ascending: false });
      if (data) setCustomItems(data);
    }
    load();

    // Real-time
    const channel = supabase
      .channel('custom-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_items' }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addItem = useCallback(async (item) => {
    const { data, error } = await supabase.from('custom_items').insert(item).select().single();
    if (error) throw error;
    setCustomItems((prev) => [data, ...prev]);
    return data;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await supabase.from('custom_items').delete().eq('id', id);
    setCustomItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { customItems, addItem, deleteItem };
}
