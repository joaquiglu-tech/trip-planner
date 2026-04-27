import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { fetchPlaceData } from './googlePlaces';

// Load all cached place data on mount, fetch missing on demand
export function usePlaceData() {
  const [places, setPlaces] = useState({});

  // Load cache on mount
  useEffect(() => {
    async function loadCache() {
      const { data } = await supabase.from('place_cache').select('*');
      if (data) {
        const map = {};
        data.forEach((row) => { map[row.item_id] = row; });
        setPlaces(map);
      }
    }
    loadCache();
  }, []);

  // Fetch place data for a specific item (called from DetailModal)
  const getPlaceData = useCallback(async (itemId, name, city) => {
    // Already have it
    if (places[itemId]?.photo_url) return places[itemId];

    const result = await fetchPlaceData(itemId, name, city);
    if (result) {
      setPlaces((prev) => ({ ...prev, [itemId]: result }));
    }
    return result;
  }, [places]);

  return { places, getPlaceData };
}
