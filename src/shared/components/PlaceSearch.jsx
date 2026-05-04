import { useState, useRef, useEffect } from 'react';

const API_KEY = 'AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA';

// Reusable place search with Google Places + optional stops list
// Returns: { name, lat, lng, placeId, address }
export default function PlaceSearch({ value, onChange, stops, placeholder, label }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value?.name || '');
  }, [value?.name]);

  // Debounced Google Places search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || !focused) { setResults([]); return; }
    // Don't search if query matches current selection
    if (value?.name === query) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
          },
          body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
        });
        if (res.ok) {
          const data = await res.json();
          setResults((data.places || []).map(p => ({
            placeId: p.id,
            name: p.displayName?.text || '',
            address: p.formattedAddress || '',
            lat: p.location?.latitude,
            lng: p.location?.longitude,
            isStop: false,
          })));
        }
      } catch { /* skip */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, focused, value?.name]);

  // Filter matching stops
  const matchingStops = (stops || []).filter(s =>
    query.length >= 1 && s.name.toLowerCase().includes(query.toLowerCase())
  ).map(s => ({
    placeId: s.google_place_id || s.id,
    name: s.name,
    address: `Stop: ${s.start_date || ''} — ${s.end_date || ''}`,
    lat: s.lat,
    lng: s.lng,
    isStop: true,
    stopId: s.id,
  }));

  const allResults = [...matchingStops, ...results];

  function selectPlace(place) {
    setQuery(place.name);
    setResults([]);
    setFocused(false);
    onChange({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
      address: place.address,
      stopId: place.stopId || null,
    });
  }

  function handleClear() {
    setQuery('');
    onChange(null);
  }

  return (
    <div className="place-search-wrap">
      {label && <label className="edit-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          className="edit-input"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) onChange(null); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder || 'Search a place...'}
        />
        {value?.name && (
          <button onClick={handleClear} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>x</button>
        )}
      </div>
      {searching && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}>Searching...</div>}
      {allResults.length > 0 && focused && (
        <div className="place-results">
          {allResults.map((r, i) => (
            <div key={r.placeId + i} className="place-result" onMouseDown={() => selectPlace(r)}>
              <div className="place-result-name">{r.isStop ? '📍 ' : ''}{r.name}</div>
              <div className="place-result-addr">{r.address}</div>
            </div>
          ))}
        </div>
      )}
      {value?.address && !focused && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}>{value.address}</div>
      )}
    </div>
  );
}
