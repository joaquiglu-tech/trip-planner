import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (data) setExpenses(data);
    }
    load();

    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addExpense = useCallback(async (expense) => {
    const { data, error } = await supabase.from('expenses').insert(expense).select().single();
    if (error) throw error;
    setExpenses((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateExpense = useCallback(async (id, changes) => {
    const { data, error } = await supabase.from('expenses').update(changes).eq('id', id).select().single();
    if (error) throw error;
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, ...data } : e));
    return data;
  }, []);

  const deleteExpense = useCallback(async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, addExpense, updateExpense, deleteExpense };
}
