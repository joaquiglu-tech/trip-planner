import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const API_KEY = 'AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA';

// Fetch Google Place ID for a city name
async function fetchPlaceId(name) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.location',
      },
      body: JSON.stringify({ textQuery: name, maxResultCount: 1 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return { placeId: place.id, lat: place.location?.latitude, lng: place.location?.longitude };
  } catch { return null; }
}

export function useStops() {
  const [stops, setStops] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('stops').select('*').order('sort_order');
      if (error) { console.warn('Failed to load stops:', error); setLoaded(true); return; }
      setStops(data || []);
      setLoaded(true);

      // Auto-populate google_place_id for stops that don't have one
      const missing = (data || []).filter(s => !s.google_place_id);
      if (missing.length > 0) {
        for (const stop of missing) {
          const result = await fetchPlaceId(stop.name);
          if (result) {
            await supabase.from('stops').update({ google_place_id: result.placeId }).eq('id', stop.id);
            setStops(prev => prev.map(s => s.id === stop.id ? { ...s, google_place_id: result.placeId, _lat: result.lat, _lng: result.lng } : s));
          }
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
    load();

    const channel = supabase
      .channel('stops-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stops' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStop = useCallback(async (id, changes) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const { error } = await supabase.from('stops').update(changes).eq('id', id);
    if (error) console.warn('Failed to update stop:', error);
  }, []);

  return { stops, loaded, updateStop };
}
