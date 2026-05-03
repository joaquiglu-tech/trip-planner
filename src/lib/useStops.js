import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useStops() {
  const [stops, setStops] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('stops').select('*').order('sort_order');
      if (error) { console.warn('Failed to load stops:', error); setLoaded(true); return; }
      setStops(data || []);
      setLoaded(true);
    }
    load();

    // Real-time sync
    const channel = supabase
      .channel('stops-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stops' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { stops, loaded };
}
