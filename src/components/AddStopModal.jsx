import { useState, useRef, useEffect } from 'react';

const API_KEY = 'AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA';

export default function AddStopModal({ onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Debounced Google Places search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
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
          body: JSON.stringify({
            textQuery: query,
            maxResultCount: 5,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setResults((data.places || []).map(p => ({
            placeId: p.id,
            name: p.displayName?.text || '',
            address: p.formattedAddress || '',
            lat: p.location?.latitude,
            lng: p.location?.longitude,
          })));
        }
      } catch { /* skip */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function selectPlace(place) {
    setSelected(place);
    setQuery(place.name);
    setResults([]);
  }

  async function handleSave() {
    if (!selected || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onAdd({
        name: selected.name,
        start_date: startDate,
        end_date: endDate,
        google_place_id: selected.placeId,
        lat: selected.lat,
        lng: selected.lng,
      });
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-content">
          <h2 className="detail-name" style={{ fontSize: 18 }}>Add Stop</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Search for a city, town, or place.</p>

          <label className="add-label">Location *</label>
          <input
            className="add-input"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="Search a city or town..."
            autoFocus
          />

          {/* Search results dropdown */}
          {results.length > 0 && !selected && (
            <div className="place-results">
              {results.map(r => (
                <div key={r.placeId} className="place-result" onClick={() => selectPlace(r)}>
                  <div className="place-result-name">{r.name}</div>
                  <div className="place-result-addr">{r.address}</div>
                </div>
              ))}
            </div>
          )}
          {searching && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 4 }}>Searching...</div>}

          {selected && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0 8px' }}>
              {selected.address}
            </div>
          )}

          <div className="edit-row-2">
            <div>
              <label className="add-label">Start date *</label>
              <input className="add-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="add-label">End date *</label>
              <input className="add-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <button className="detail-btn sel" onClick={handleSave} disabled={saving || !selected || !startDate || !endDate} style={{ marginTop: 14 }}>
            {saving ? 'Adding...' : 'Add Stop'}
          </button>
        </div>
      </div>
    </div>
  );
}
