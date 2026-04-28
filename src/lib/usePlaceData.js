import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { fetchPlaceData } from './googlePlaces';
import { ITEMS } from '../data/items';

export function usePlaceData() {
  const [places, setPlaces] = useState({});
  const prefetching = useRef(false);

  // Load cache on mount, then pre-fetch missing items in background
  useEffect(() => {
    async function loadAndPrefetch() {
      // Load existing cache
      const { data } = await supabase.from('place_cache').select('*');
      const map = {};
      if (data) data.forEach((row) => {
        // Parse photo_urls from JSON string
        if (row.photo_urls && typeof row.photo_urls === 'string') {
          try { row.photo_urls = JSON.parse(row.photo_urls); } catch { row.photo_urls = []; }
        }
        map[row.item_id] = row;
      });
      setPlaces(map);

      // Pre-fetch missing items in background (non-transport only)
      if (prefetching.current) return;
      prefetching.current = true;

      const toFetch = ITEMS.filter((it) => it.type !== 'transport' && !map[it.id]?.photo_url);
      // Fetch in small batches to stay within free tier
      for (let i = 0; i < Math.min(toFetch.length, 30); i++) {
        const it = toFetch[i];
        try {
          const result = await fetchPlaceData(it.id, it.name, it.city);
          if (result) setPlaces((prev) => ({ ...prev, [it.id]: result }));
        } catch { /* skip failures */ }
        // Small delay to avoid rate limiting
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
