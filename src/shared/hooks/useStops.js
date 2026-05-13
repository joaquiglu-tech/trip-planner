import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, GOOGLE_MAPS_API_KEY as API_KEY } from '../../services/supabase';

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
  } catch (err) { console.warn('fetchPlaceId failed for', name, err); return null; }
}

export function useStops() {
  const [stops, setStops] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const enrichCancelledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    enrichCancelledRef.current = false;

    async function load() {
      const { data, error } = await supabase.from('stops').select('*').order('sort_order');
      if (cancelled) return;
      if (error) { console.warn('Failed to load stops:', error); setLoaded(true); return; }
      setStops(data || []);
      setLoaded(true);

      // Auto-populate google_place_id and lat/lng for stops missing them
      const needsPlaceId = (data || []).filter(s => !s.google_place_id);
      const needsCoords = (data || []).filter(s => !s.lat && s.google_place_id);
      const toFetch = [...needsPlaceId, ...needsCoords];
      if (toFetch.length > 0) {
        for (const stop of toFetch) {
          if (enrichCancelledRef.current) break;
          const result = await fetchPlaceId(stop.name);
          if (result) {
            const updates = {};
            if (!stop.google_place_id) updates.google_place_id = result.placeId;
            if (!stop.lat && result.lat) { updates.lat = result.lat; updates.lng = result.lng; }
            if (Object.keys(updates).length > 0) {
              const { error: updateErr } = await supabase.from('stops').update(updates).eq('id', stop.id);
              if (updateErr) console.warn('Failed to enrich stop', stop.name, updateErr);
              else setStops(prev => prev.map(s => s.id === stop.id ? { ...s, ...updates } : s));
            }
          }
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
    load();

    // Incremental realtime — merge individual changes instead of full reload
    const channel = supabase
      .channel('stops-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stops' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setStops(prev => prev.filter(s => s.id !== payload.old.id));
        } else if (payload.eventType === 'INSERT') {
          setStops(prev => {
            if (prev.some(s => s.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          });
        } else if (payload.eventType === 'UPDATE') {
          setStops(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
        }
      })
      .subscribe();
    return () => { cancelled = true; enrichCancelledRef.current = true; supabase.removeChannel(channel); };
  }, []);

  const updateStop = useCallback(async (id, changes) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    const { error } = await supabase.from('stops').update(changes).eq('id', id);
    if (error) {
      console.warn('Failed to update stop:', error);
      throw error;
    }
    // If name changed, re-fetch google place ID + coords
    if (changes.name) {
      const result = await fetchPlaceId(changes.name);
      if (result) {
        const updates = { google_place_id: result.placeId };
        if (result.lat) { updates.lat = result.lat; updates.lng = result.lng; }
        const { error: enrichErr } = await supabase.from('stops').update(updates).eq('id', id);
        if (!enrichErr) setStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
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
    const { error } = await supabase.from('stops').delete().eq('id', id);
    if (error) {
      console.warn('Failed to delete stop:', error);
      // Realtime will re-add if delete failed
    }
  }, []);

  return { stops, loaded, updateStop, addStop, deleteStop };
}
