import { useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { fetchPlaceData } from '../../services/googlePlaces';

export function usePlaceData() {
  const [places, setPlaces] = useState({});

  // Lazy fetch: only load place data when a card is opened
  const getPlaceData = useCallback(async (itemId, name, city) => {
    // Return from memory cache if available
    if (places[itemId]?.photo_url) return places[itemId];

    // Check Supabase cache first
    try {
      const { data: cached } = await supabase.from('place_cache').select('*').eq('item_id', itemId).single();
      if (cached?.photo_url) {
        if (cached.photo_urls && typeof cached.photo_urls === 'string') {
          try { cached.photo_urls = JSON.parse(cached.photo_urls); } catch { cached.photo_urls = []; }
        }
        setPlaces(prev => ({ ...prev, [itemId]: cached }));
        return cached;
      }
    } catch { /* not cached yet */ }

    // Fetch from Google Places API
    try {
      const result = await fetchPlaceData(itemId, name, city);
      if (result) {
        setPlaces(prev => ({ ...prev, [itemId]: result }));
        return result;
      }
    } catch { /* skip */ }
    return null;
  }, [places]);

  return { places, getPlaceData };
}
