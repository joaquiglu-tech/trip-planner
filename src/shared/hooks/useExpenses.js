import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../services/supabase";

// Max 1 expense per item (M01). Unlinked expenses (null item_id) are unlimited.
export function itemHasExpense(expenses, itemId) {
  return !!itemId && (expenses || []).some((e) => e.item_id === itemId);
}

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loadKey, setLoadKey] = useState(0);
  const expensesRef = useRef(expenses);
  useEffect(() => {
    expensesRef.current = expenses;
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("Failed to load expenses:", error);
        setError("Failed to load expenses");
        setLoaded(true);
        return;
      }
      if (data) setExpenses(data);
      setLoaded(true);
    }
    load();

    const channel = supabase
      .channel("expenses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setExpenses((prev) => prev.filter((e) => e.id !== payload.old.id));
          } else if (payload.eventType === "INSERT") {
            setExpenses((prev) => {
              if (prev.some((e) => e.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setExpenses((prev) =>
              prev.map((e) =>
                e.id === payload.new.id ? { ...e, ...payload.new } : e,
              ),
            );
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [loadKey]);

  const addExpense = useCallback(async (expense) => {
    // M01: enforce max 1 expense per item at the single creation choke point.
    if (itemHasExpense(expensesRef.current, expense.item_id)) {
      throw new Error(
        "This item already has an expense. Edit the existing one instead.",
      );
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert(expense)
      .select()
      .single();
    if (error) throw error;
    setExpenses((prev) => {
      if (prev.some((e) => e.id === data.id)) return prev;
      return [data, ...prev];
    });
    return data;
  }, []);

  const updateExpense = useCallback(async (id, changes) => {
    const { data, error } = await supabase
      .from("expenses")
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e)),
    );
    return data;
  }, []);

  const deleteExpense = useCallback(async (id) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setLoadKey((k) => k + 1);
  }, []);

  return {
    expenses,
    loaded,
    error,
    retry,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
