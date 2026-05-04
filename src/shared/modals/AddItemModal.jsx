import { useState } from 'react';
import PlaceSearch from '../components/PlaceSearch';
import { extractXoteloKey, fetchStayEstimate } from '../../services/xotelo';

const TYPES = [
  { value: 'food', label: 'Food' }, { value: 'stay', label: 'Stay' },
  { value: 'activity', label: 'Activity' }, { value: 'transport', label: 'Transport' },
];
const SUBCAT_OPTIONS = [
  { value: '', label: 'None' }, { value: 'bourdain', label: 'Bourdain' }, { value: 'michelin', label: 'Michelin' },
  { value: 'local', label: 'Local pick' }, { value: 'bar', label: 'Bar/Aperitivo' }, { value: 'cheap', label: 'Cheap eats' },
];
const TIER_OPTIONS = [
  { value: '', label: 'None' }, { value: 'Budget', label: 'Budget' }, { value: 'Mid-range', label: 'Mid-range' },
  { value: 'Boutique', label: 'Boutique' }, { value: 'Luxury', label: 'Luxury' },
];
const TRANSPORT_MODES = [
  { value: 'flight', label: 'Flight' }, { value: 'train', label: 'Train' }, { value: 'bus', label: 'Bus' },
  { value: 'rental', label: 'Rental' }, { value: 'drive', label: 'Drive' }, { value: 'ferry', label: 'Ferry' }, { value: 'taxi', label: 'Taxi' },
];

const EMPTY_FORM = { name: '', type: 'food', stop_ids: [], desc_text: '', dish: '', subcat: '', tier: '', hrs: '',
  transport_mode: '', is_rental: false, origin: null, dest: null, start_time: '', end_time: '',
  link: '', estimated_cost: '', notes: '', tripadvisor_url: '', xotelo_key: '' };

export default function AddItemModal({ onClose, onAdd, stops, userEmail }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [xoteloStatus, setXoteloStatus] = useState(''); // '' | 'searching' | 'found' | 'not_found'

  function updateForm(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'stop_ids' && next.type === 'transport' && Array.isArray(val) && val.length >= 2) {
        const s1 = (stops || []).find(s => s.id === val[0]);
        const s2 = (stops || []).find(s => s.id === val[val.length - 1]);
        if (s1 && !next.origin) next.origin = { name: s1.name, lat: s1.lat, lng: s1.lng };
        if (s2 && !next.dest) next.dest = { name: s2.name, lat: s2.lat, lng: s2.lng };
      }
      return next;
    });
  }

  // Handle TripAdvisor URL paste — extract key and fetch rates
  async function handleTripAdvisorUrl(url) {
    updateForm('tripadvisor_url', url);
    const key = extractXoteloKey(url);
    if (!key) {
      if (url.length > 10) setXoteloStatus('not_found');
      return;
    }
    updateForm('xotelo_key', key);
    setXoteloStatus('searching');
    // Get check-in/check-out from selected stop dates
    const firstStop = (stops || []).find(s => form.stop_ids.includes(s.id));
    const checkIn = firstStop ? String(firstStop.start_date).substring(0, 10) : null;
    const checkOut = firstStop ? String(firstStop.end_date).substring(0, 10) : null;
    if (checkIn && checkOut) {
      const estimate = await fetchStayEstimate(key, checkIn, checkOut);
      if (estimate) {
        updateForm('estimated_cost', String(estimate.estimated_cost));
        setXoteloStatus('found');
      } else {
        setXoteloStatus('not_found');
      }
    } else {
      setXoteloStatus('found');
    }
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const originName = form.origin?.name || '';
      const destName = form.dest?.name || '';
      await onAdd({
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        hrs: parseFloat(form.hrs) || null,
        stop_ids: form.stop_ids,
        xotelo_key: form.xotelo_key || null,
        origin_name: originName, origin_lat: form.origin?.lat || null, origin_lng: form.origin?.lng || null,
        dest_name: destName, dest_lat: form.dest?.lat || null, dest_lng: form.dest?.lng || null,
        route: [originName, destName].filter(Boolean).join(' \u2192 '),
      });
      onClose();
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-content">
          <h2 className="detail-name" style={{ fontSize: 18 }}>Add New Item</h2>

          <div className="add-form">
            <label className="add-label">Name *</label>
            <input className="add-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Hotel Smeraldo" autoFocus />

            <label className="add-label">Type</label>
            <select className="add-input" value={form.type} onChange={(e) => updateForm('type', e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <label className="add-label">Stops</label>
            <div className="edit-stop-chips">
              {(stops || []).map(s => {
                const selected = form.stop_ids.includes(s.id);
                return (
                  <button key={s.id} type="button" className={`stop-chip ${selected ? 'stop-chip-active' : ''}`} onClick={() => {
                    updateForm('stop_ids', selected ? form.stop_ids.filter(id => id !== s.id) : [...form.stop_ids, s.id]);
                  }}>{selected ? '✓ ' : ''}{s.name}</button>
                );
              })}
            </div>

            <label className="add-label">Description</label>
            <textarea className="add-input" rows={2} value={form.desc_text} onChange={(e) => updateForm('desc_text', e.target.value)} placeholder="What is it? Why go?" />

            {/* Type-specific fields */}
            {form.type === 'food' && (
              <>
                <label className="add-label">What to order</label>
                <input className="add-input" value={form.dish} onChange={(e) => updateForm('dish', e.target.value)} placeholder="e.g. Carbonara, Bistecca" />
                <label className="add-label">Category</label>
                <select className="add-input" value={form.subcat} onChange={(e) => updateForm('subcat', e.target.value)}>
                  {SUBCAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </>
            )}
            {form.type === 'stay' && (
              <>
                <div className="edit-row-2">
                  <div><label className="add-label">Tier</label>
                    <select className="add-input" value={form.tier} onChange={(e) => updateForm('tier', e.target.value)}>
                      {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div></div>
                </div>
                <label className="add-label">TripAdvisor link (for live prices)</label>
                <input className="add-input" value={form.tripadvisor_url} onChange={(e) => handleTripAdvisorUrl(e.target.value)} placeholder="Paste TripAdvisor hotel URL..." />
                {xoteloStatus === 'searching' && <div style={{ fontSize: 11, color: 'var(--accent)', padding: '4px 0' }}>Searching for live prices...</div>}
                {xoteloStatus === 'found' && <div style={{ fontSize: 11, color: 'var(--green)', padding: '4px 0' }}>Live prices connected {form.estimated_cost && `· Est. $${form.estimated_cost}/night`}</div>}
                {xoteloStatus === 'not_found' && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>No live prices found — you can enter an estimate manually</div>}
              </>
            )}
            {form.type === 'transport' && (
              <>
                <div className="edit-row-2">
                  <div><label className="add-label">Mode</label>
                    <select className="add-input" value={form.transport_mode} onChange={(e) => { updateForm('transport_mode', e.target.value); updateForm('is_rental', e.target.value === 'rental'); }}>
                      <option value="">Select...</option>
                      {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div><label className="add-label">Rental</label>
                    <button type="button" className={`fp ${form.is_rental ? 'fp-urgent-active' : 'fp-urgent'}`} onClick={() => updateForm('is_rental', !form.is_rental)} style={{ width: '100%' }}>
                      {form.is_rental ? 'Yes — booking' : 'No — route'}
                    </button>
                  </div>
                </div>
                <PlaceSearch label="Origin" value={form.origin} onChange={v => updateForm('origin', v)} stops={stops} placeholder="Airport, station, city..." />
                <PlaceSearch label="Destination" value={form.dest} onChange={v => updateForm('dest', v)} stops={stops} placeholder="Airport, station, city..." />
              </>
            )}
            {form.type === 'activity' && (
              <div className="edit-row-2">
                <div><label className="add-label">Duration (hours)</label>
                  <input className="add-input" type="number" step="0.5" value={form.hrs} onChange={(e) => updateForm('hrs', e.target.value)} placeholder="2" />
                </div>
                <div></div>
              </div>
            )}

            {/* Schedule */}
            <div className="edit-row-2">
              <div><label className="add-label">Start</label>
                <input className="add-input" type="datetime-local" value={form.start_time || ''} onChange={(e) => updateForm('start_time', e.target.value)} />
              </div>
              <div><label className="add-label">End</label>
                <input className="add-input" type="datetime-local" value={form.end_time || ''} onChange={(e) => updateForm('end_time', e.target.value)} />
              </div>
            </div>

            {/* Link + cost (for types without inline cost) */}
            <label className="add-label">Link</label>
            <input className="add-input" value={form.link} onChange={(e) => updateForm('link', e.target.value)} placeholder="https://..." />

            <label className="add-label">Notes</label>
            <textarea className="add-input" rows={2} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Any notes..." />

            <button className="detail-btn sel" onClick={handleSave} disabled={saving} style={{ marginTop: 14 }}>{saving ? 'Saving...' : 'Save Item'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
