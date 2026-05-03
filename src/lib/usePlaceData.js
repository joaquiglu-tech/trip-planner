import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { fetchPlaceData } from './googlePlaces';

export function usePlaceData() {
  const [places, setPlaces] = useState({});
  const prefetching = useRef(false);

  // Load cache on mount, then pre-fetch missing items from DB in background
  useEffect(() => {
    async function loadAndPrefetch() {
      // Load existing cache
      const { data } = await supabase.from('place_cache').select('*');
      const map = {};
      if (data) data.forEach((row) => {
        if (row.photo_urls && typeof row.photo_urls === 'string') {
          try { row.photo_urls = JSON.parse(row.photo_urls); } catch { row.photo_urls = []; }
        }
        map[row.item_id] = row;
      });
      setPlaces(map);

      // Pre-fetch from items table (reads all non-transport items)
      if (prefetching.current) return;
      prefetching.current = true;

      const { data: items } = await supabase.from('items').select('id, name, city, type').neq('type', 'transport');
      if (!items) return;
      const toFetch = items.filter((it) => !map[it.id]?.photo_url);
      for (let i = 0; i < Math.min(toFetch.length, 40); i++) {
        const it = toFetch[i];
        try {
          const result = await fetchPlaceData(it.id, it.name, it.city);
          if (result) setPlaces((prev) => ({ ...prev, [it.id]: result }));
        } catch { /* skip failures */ }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    loadAndPrefetch();
  }, []);

  const getPlaceData = useCallback(async (itemId, name, city) => {
    if (places[itemId]?.photo_url) return places[itemId];
    try {
      const result = await fetchPlaceData(itemId, name, city);
      if (result) setPlaces((prev) => ({ ...prev, [itemId]: result }));
      return result;
    } catch { return null; }
  }, [places]);

  return { places, getPlaceData };
}
