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

      // Auto-populate google_place_id and lat/lng for stops missing them
      const needsPlaceId = (data || []).filter(s => !s.google_place_id);
      const needsCoords = (data || []).filter(s => !s.lat && s.google_place_id);
      const toFetch = [...needsPlaceId, ...needsCoords];
      if (toFetch.length > 0) {
        for (const stop of toFetch) {
          const result = await fetchPlaceId(stop.name);
          if (result) {
            const updates = {};
            if (!stop.google_place_id) updates.google_place_id = result.placeId;
            if (!stop.lat && result.lat) { updates.lat = result.lat; updates.lng = result.lng; }
            if (Object.keys(updates).length > 0) {
              await supabase.from('stops').update(updates).eq('id', stop.id);
              setStops(prev => prev.map(s => s.id === stop.id ? { ...s, ...updates } : s));
            }
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
    // If name changed, re-fetch google place ID + coords
    if (changes.name) {
      const result = await fetchPlaceId(changes.name);
      if (result) {
        const updates = { google_place_id: result.placeId };
        if (result.lat) { updates.lat = result.lat; updates.lng = result.lng; }
        await supabase.from('stops').update(updates).eq('id', id);
        setStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      }
    }
  }, []);

  const addStop = useCallback(async (stopData) => {
    const maxSort = stops.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    const newStop = {
      id: `stop-${stopData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      name: stopData.name,
      start_date: stopData.start_date,
      end_date: stopData.end_date,
      google_place_id: stopData.google_place_id || '',
      lat: stopData.lat || null,
      lng: stopData.lng || null,
      trip_id: 'trip-1',
      sort_order: maxSort + 1,
      tips: [],
    };
    const { data, error } = await supabase.from('stops').insert(newStop).select().single();
    if (error) throw error;
    setStops(prev => [...prev, data].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
    return data;
  }, [stops]);

  const deleteStop = useCallback(async (id) => {
    setStops(prev => prev.filter(s => s.id !== id));
    await supabase.from('stops').delete().eq('id', id);
  }, []);

  return { stops, loaded, updateStop, addStop, deleteStop };
}
