import { useState } from 'react';
import { fetchUrlMeta } from '../../services/fetchMeta';

const TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'stay', label: 'Stay' },
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
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
      dish: '',
      link: url.trim(),
      estimated_cost: '',
    });
    setLoading(false);
  }

  function updateForm(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await onAdd({
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        stop_ids: form.stop_ids,
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
              <button className="detail-btn" onClick={() => setForm({ name: '', type: 'food', stop_ids: [], desc_text: '', dish: '', link: '', estimated_cost: '' })}>
                Add Manually
              </button>
            </>
          )}

          {form && (
            <div className="add-form">
              <label className="add-label">Name *</label>
              <input className="add-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Ristorante La Pergola" />

              <div className="edit-row-2">
                <div>
                  <label className="add-label">Type</label>
                  <select className="add-input" value={form.type} onChange={(e) => updateForm('type', e.target.value)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="add-label">Stop</label>
                  <select className="add-input" value={form.stop_ids[0] || ''} onChange={(e) => updateForm('stop_ids', e.target.value ? [e.target.value] : [])}>
                    <option value="">Select stop...</option>
                    {(stops || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="add-label">Description</label>
              <textarea className="add-input" rows={2} value={form.desc_text} onChange={(e) => updateForm('desc_text', e.target.value)} placeholder="What is it? Why go?" />

              {form.type === 'food' && (
                <>
                  <label className="add-label">What to order</label>
                  <input className="add-input" value={form.dish} onChange={(e) => updateForm('dish', e.target.value)} placeholder="e.g. Carbonara, Bistecca" />
                </>
              )}

              <div className="edit-row-2">
                <div>
                  <label className="add-label">Start time</label>
                  <input className="add-input" type="time" value={form.start_time || ''} onChange={(e) => updateForm('start_time', e.target.value)} />
                </div>
                <div>
                  <label className="add-label">End time</label>
                  <input className="add-input" type="time" value={form.end_time || ''} onChange={(e) => updateForm('end_time', e.target.value)} />
                </div>
              </div>

              <div className="edit-row-2">
                <div>
                  <label className="add-label">Est. cost (USD)</label>
                  <input className="add-input" type="number" value={form.estimated_cost} onChange={(e) => updateForm('estimated_cost', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="add-label">Link</label>
                  <input className="add-input" value={form.link} onChange={(e) => updateForm('link', e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <button className="detail-btn sel" onClick={handleSave} style={{ marginTop: 14 }}>Save Item</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
