import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export function useSchedule() {
  const [schedule, setSchedule] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('schedule').select('*').order('sort_order');
      if (error) { console.warn('Failed to load schedule:', error); setLoaded(true); return; }
      const byDay = {};
      (data || []).forEach(row => {
        if (!byDay[row.day_n]) byDay[row.day_n] = [];
        byDay[row.day_n].push(row);
      });
      // Sort each day by start_time then sort_order
      Object.keys(byDay).forEach(d => {
        byDay[d].sort((a, b) => {
          if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
          if (a.start_time) return -1;
          if (b.start_time) return 1;
          return a.sort_order - b.sort_order;
        });
      });
      setSchedule(byDay);
      setLoaded(true);
    }
    load();
  }, []);

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel('schedule-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old;
          setSchedule(prev => {
            const next = { ...prev };
            if (next[old.day_n]) {
              next[old.day_n] = next[old.day_n].filter(r => r.id !== old.id);
            }
            return next;
          });
        } else {
          const row = payload.new;
          setSchedule(prev => {
            const next = { ...prev };
            if (!next[row.day_n]) next[row.day_n] = [];
            const idx = next[row.day_n].findIndex(r => r.id === row.id);
            if (idx >= 0) next[row.day_n][idx] = row;
            else next[row.day_n] = [...next[row.day_n], row];
            // Re-sort
            next[row.day_n].sort((a, b) => {
              if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
              if (a.start_time) return -1;
              if (b.start_time) return 1;
              return a.sort_order - b.sort_order;
            });
            return next;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Get schedule entries for a specific day, filtered by item status
  const getForDay = useCallback((dayN, S, statusFilter) => {
    const entries = schedule[dayN] || [];
    return entries.filter(entry => {
      const st = S[entry.item_id] || '';
      if (statusFilter === 'all') return st === 'sel' || st === 'conf';
      if (statusFilter === 'sel') return st === 'sel';
      if (statusFilter === 'conf') return st === 'conf';
      return st === 'sel' || st === 'conf';
    });
  }, [schedule]);

  return { schedule, loaded, getForDay };
}
