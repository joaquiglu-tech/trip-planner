import { useState, useEffect } from 'react';
import { fetchUrlMeta } from '../../services/fetchMeta';
import PlaceSearch from '../components/PlaceSearch';

const TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'stay', label: 'Stay' },
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
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

export default function AddItemModal({ onClose, onAdd, stops, userEmail }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    const meta = await fetchUrlMeta(url.trim());
    setForm({
      name: meta.title || '',
      type: 'food',
      stop_ids: [],
      desc_text: meta.description || '',
      dish: '', subcat: '', tier: '', hrs: '',
      transport_mode: '', is_rental: false, origin: null, dest: null,
      start_time: '', end_time: '',
      link: url.trim(),
      estimated_cost: '', notes: '',
    });
    setLoading(false);
  }

  function updateForm(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      // Auto-fill origin/dest from stops when 2 stops selected for transport
      if (key === 'stop_ids' && next.type === 'transport' && Array.isArray(val) && val.length >= 2) {
        const s1 = (stops || []).find(s => s.id === val[0]);
        const s2 = (stops || []).find(s => s.id === val[val.length - 1]);
        if (s1 && !next.origin) next.origin = { name: s1.name, lat: s1.lat, lng: s1.lng };
        if (s2 && !next.dest) next.dest = { name: s2.name, lat: s2.lat, lng: s2.lng };
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      const originName = form.origin?.name || '';
      const destName = form.dest?.name || '';
      await onAdd({
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        hrs: parseFloat(form.hrs) || null,
        stop_ids: form.stop_ids,
        origin_name: originName,
        origin_lat: form.origin?.lat || null,
        origin_lng: form.origin?.lng || null,
        dest_name: destName,
        dest_lat: form.dest?.lat || null,
        dest_lng: form.dest?.lng || null,
        route: [originName, destName].filter(Boolean).join(' → '),
      });
      onClose();
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-content">
          <h2 className="detail-name" style={{ fontSize: 18 }}>Add New Item</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Paste a URL or add manually.</p>

          {!form && (
            <>
              <input type="url" className="add-url-input" placeholder="Paste a URL here..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFetch()} autoFocus />
              <button className="detail-btn sel" onClick={handleFetch} disabled={loading || !url.trim()} style={{ marginTop: 10 }}>
                {loading ? 'Fetching...' : 'Fetch Details'}
              </button>
              <div style={{ textAlign: 'center', margin: '14px 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>or</div>
              <button className="detail-btn" onClick={() => setForm({ name: '', type: 'food', stop_ids: [], desc_text: '', dish: '', subcat: '', tier: '', hrs: '', transport_mode: '', is_rental: false, origin: null, dest: null, depart_time: '', arrive_time: '', link: '', estimated_cost: '', notes: '' })}>
                Add Manually
              </button>
            </>
          )}

          {form && (
            <div className="add-form">
              <label className="add-label">Name *</label>
              <input className="add-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Ristorante La Pergola" />

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
                <div className="edit-row-2">
                  <div><label className="add-label">Tier</label>
                    <select className="add-input" value={form.tier} onChange={(e) => updateForm('tier', e.target.value)}>
                      {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div><label className="add-label">Est. cost (USD)</label>
                    <input className="add-input" type="number" value={form.estimated_cost} onChange={(e) => updateForm('estimated_cost', e.target.value)} placeholder="0" />
                  </div>
                </div>
              )}
              {form.type === 'transport' && (
                <>
                  <div className="edit-row-2">
                    <div><label className="add-label">Mode</label>
                      <select className="add-input" value={form.transport_mode} onChange={(e) => {
                        updateForm('transport_mode', e.target.value);
                        updateForm('is_rental', e.target.value === 'rental');
                      }}>
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
                  <div className="edit-row-2">
                    <div><label className="add-label">Depart</label>
                      <input className="add-input" type="time" value={form.start_time || ''} onChange={(e) => updateForm('start_time', e.target.value)} />
                    </div>
                    <div><label className="add-label">Arrive</label>
                      <input className="add-input" type="time" value={form.end_time || ''} onChange={(e) => updateForm('end_time', e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              {form.type === 'activity' && (
                <div className="edit-row-2">
                  <div><label className="add-label">Duration (hours)</label>
                    <input className="add-input" type="number" step="0.5" value={form.hrs} onChange={(e) => updateForm('hrs', e.target.value)} placeholder="2" />
                  </div>
                  <div><label className="add-label">Est. cost (USD)</label>
                    <input className="add-input" type="number" value={form.estimated_cost} onChange={(e) => updateForm('estimated_cost', e.target.value)} placeholder="0" />
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div className="edit-row-2">
                <div><label className="add-label">Start time</label>
                  <input className="add-input" type="time" value={form.start_time || ''} onChange={(e) => updateForm('start_time', e.target.value)} />
                </div>
                <div><label className="add-label">End time</label>
                  <input className="add-input" type="time" value={form.end_time || ''} onChange={(e) => updateForm('end_time', e.target.value)} />
                </div>
              </div>

              {form.type !== 'stay' && form.type !== 'activity' && (
                <div className="edit-row-2">
                  <div><label className="add-label">Est. cost (USD)</label>
                    <input className="add-input" type="number" value={form.estimated_cost} onChange={(e) => updateForm('estimated_cost', e.target.value)} placeholder="0" />
                  </div>
                  <div><label className="add-label">Link</label>
                    <input className="add-input" value={form.link} onChange={(e) => updateForm('link', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              )}
              {(form.type === 'stay' || form.type === 'activity') && (
                <><label className="add-label">Link</label>
                <input className="add-input" value={form.link} onChange={(e) => updateForm('link', e.target.value)} placeholder="https://..." /></>
              )}

              <label className="add-label">Notes</label>
              <textarea className="add-input" rows={2} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Any notes..." />

              <button className="detail-btn sel" onClick={handleSave} style={{ marginTop: 14 }}>Save Item</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
