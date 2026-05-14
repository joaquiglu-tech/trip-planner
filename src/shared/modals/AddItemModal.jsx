import { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import PlaceSearch from '../components/PlaceSearch';
import { extractXoteloKey, fetchStayEstimate } from '../../services/xotelo';
import { uploadFile } from '../../services/storage';

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
  link: '', estimated_cost: '', notes: '', tripadvisor_url: '', xotelo_key: '',
  status: 'sel', confirmed_cost: '', expense_note: '' };

export default function AddItemModal({ onClose, onAdd, addExpense, setFile, stops, userEmail }) {
  const trapRef = useFocusTrap();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [xoteloStatus, setXoteloStatus] = useState(''); // '' | 'searching' | 'found' | 'not_found'

  useEffect(() => {
    window.history.pushState({ modal: true }, '', '');
    function handlePop() { onClose(); }
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('popstate', handlePop);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  function updateForm(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'stop_ids' && next.type === 'transport' && Array.isArray(val) && val.length >= 2) {
        const s1 = (stops || []).find(s => s.id === val[0]);
        const s2 = (stops || []).find(s => s.id === val[val.length - 1]);
        if (s1 && !next.origin) next.origin = { name: s1.name, lat: s1.lat, lng: s1.lng };
        if (s2 && !next.dest) next.dest = { name: s2.name, lat: s2.lat, lng: s2.lng };
      }
      // Re-fetch Xotelo rates when stop changes and we have a key
      if (key === 'stop_ids' && next.xotelo_key && next.type === 'stay') {
        fetchXoteloPrices(next.xotelo_key, val);
      }
      return next;
    });
  }

  // Fetch Xotelo prices for a key + stop dates
  async function fetchXoteloPrices(key, stopIds) {
    const firstStop = (stops || []).find(s => (stopIds || []).includes(s.id));
    if (!firstStop) return;
    const checkIn = String(firstStop.start_date).substring(0, 10);
    const checkOut = String(firstStop.end_date).substring(0, 10);
    setXoteloStatus('searching');
    const estimate = await fetchStayEstimate(key, checkIn, checkOut);
    if (estimate) {
      setForm(f => ({ ...f, estimated_cost: String(Math.round(estimate.estimated_cost)) }));
      setXoteloStatus('found');
    } else {
      setXoteloStatus('found');
    }
  }

  // Handle TripAdvisor URL paste — extract key and fetch rates
  async function handleTripAdvisorUrl(url) {
    setForm(f => ({ ...f, tripadvisor_url: url }));
    const key = extractXoteloKey(url);
    if (!key) {
      if (url.length > 10) setXoteloStatus('not_found');
      else setXoteloStatus('');
      return;
    }
    setForm(f => ({ ...f, xotelo_key: key }));
    // Try to fetch immediately with current stop selection
    fetchXoteloPrices(key, form.stop_ids);
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const originName = form.origin?.name || '';
      const destName = form.dest?.name || '';
      const newItem = await onAdd({
        ...form,
        status: form.status,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        hrs: parseFloat(form.hrs) || null,
        stop_ids: form.stop_ids,
        xotelo_key: form.xotelo_key || null,
        origin_name: originName, origin_lat: form.origin?.lat || null, origin_lng: form.origin?.lng || null,
        dest_name: destName, dest_lat: form.dest?.lat || null, dest_lng: form.dest?.lng || null,
        route: [originName, destName].filter(Boolean).join(' \u2192 '),
      });

      // Create expense if confirmed with a cost
      const cost = parseFloat(form.confirmed_cost);
      if (form.status === 'conf' && cost > 0 && addExpense) {
        await addExpense({
          amount: cost,
          category: form.type,
          note: form.expense_note || form.name,
          item_id: newItem.id,
          stop_id: form.stop_ids[0] || '',
          created_by: userEmail,
        });
      }

      // Upload pending files
      if (pendingFiles.length > 0 && setFile) {
        for (const file of pendingFiles) {
          try {
            const result = await uploadFile(newItem.id, file);
            setFile(newItem.id, result);
          } catch (err) {
            console.warn('File upload failed:', err);
          }
        }
      }

      onClose();
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Add new item" onClick={onClose}>
      <div className="detail-sheet" ref={trapRef} style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" aria-label="Close" onClick={onClose}>✕</button>
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

            <label className="add-label">Status</label>
            <div className="status-selector">
              {[{ value: '', label: 'Not added', cls: '' }, { value: 'sel', label: 'Selected', cls: 'sel' }, { value: 'conf', label: 'Confirmed', cls: 'conf' }].map(opt => (
                <button key={opt.value} type="button"
                  className={`status-option ${opt.cls} ${form.status === opt.value ? 'active' : ''}`}
                  onClick={() => updateForm('status', opt.value)}>
                  {opt.value === 'conf' ? '✓' : opt.value === 'sel' ? '●' : '○'} {opt.label}
                </button>
              ))}
            </div>
            {form.status === 'conf' && (
              <>
                <label className="add-label">Confirmed cost</label>
                <div className="cost-input-row" style={{ marginBottom: 8 }}>
                  <span className="cost-input-prefix">$</span>
                  <input type="number" className="cost-input" placeholder="0"
                    value={form.confirmed_cost} onChange={e => updateForm('confirmed_cost', e.target.value)} />
                </div>
                <input className="add-input" placeholder="Expense note (optional)"
                  value={form.expense_note} onChange={e => updateForm('expense_note', e.target.value)}
                  style={{ marginBottom: 8 }} />
                <label className="add-label">Attachments</label>
                {pendingFiles.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="file-chip" style={{ marginBottom: 4 }}>
                        <span className="file-chip-name">{f.name}</span>
                        <button type="button" className="file-remove-btn"
                          onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>x</button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="detail-upload-btn" style={{ marginBottom: 8 }}>
                  Upload file
                  <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden-input"
                    onChange={e => { if (e.target.files[0]) { setPendingFiles(prev => [...prev, e.target.files[0]]); e.target.value = ''; } }} />
                </label>
              </>
            )}

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
                {xoteloStatus === 'found' && <div style={{ fontSize: 11, color: 'var(--green)', padding: '4px 0' }}>Live prices connected{form.estimated_cost ? ` · Est. $${Number(form.estimated_cost).toLocaleString()} total` : ' · Select a stop to see prices'}</div>}
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
                    <button type="button" className={`fp ${form.is_rental ? 'fp-urgent-active' : 'fp-urgent'}`} disabled style={{ width: '100%', opacity: form.transport_mode === 'rental' ? 1 : 0.5 }}>
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

            <button className="detail-btn sel" onClick={handleSave} disabled={saving} style={{ marginTop: 14 }}>
              {saving ? 'Saving...' : form.status === 'conf' && form.confirmed_cost ? 'Save & Confirm' : 'Save Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
