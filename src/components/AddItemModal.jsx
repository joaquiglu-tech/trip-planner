import { useState } from 'react';
import { fetchUrlMeta } from '../lib/fetchMeta';

const TYPES = [
  { value: 'dining', label: '🍝 Restaurant / Bar' },
  { value: 'stay', label: '🏨 Stay' },
  { value: 'activity', label: '🎟️ Activity' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'special', label: '⭐ Special Meal' },
];

export default function AddItemModal({ onClose, onAdd, userEmail }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    const meta = await fetchUrlMeta(url.trim());
    setForm({
      name: meta.title || '',
      type: 'dining',
      city: '',
      desc_text: meta.description || '',
      dish: '',
      link: url.trim(),
      image_url: meta.image || '',
      price_label: '',
      created_by: userEmail,
    });
    setLoading(false);
  }

  function updateForm(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await onAdd(form);
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
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Paste a URL from any booking site, restaurant, or activity and we'll pull in the details.</p>

          {/* Step 1: Paste URL */}
          {!form && (
            <>
              <input
                type="url"
                className="add-url-input"
                placeholder="Paste a URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                autoFocus
              />
              <button
                className="detail-btn sel"
                onClick={handleFetch}
                disabled={loading || !url.trim()}
                style={{ marginTop: 10 }}
              >
                {loading ? 'Fetching...' : 'Fetch Details'}
              </button>
              <div style={{ textAlign: 'center', margin: '14px 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>or</div>
              <button
                className="detail-btn"
                onClick={() => setForm({ name: '', type: 'dining', city: '', desc_text: '', dish: '', link: '', image_url: '', price_label: '', created_by: userEmail })}
              >
                Add Manually
              </button>
            </>
          )}

          {/* Step 2: Edit form */}
          {form && (
            <div className="add-form">
              {form.image_url && (
                <div className="detail-hero" style={{ borderRadius: 8, marginBottom: 12 }}>
                  <img src={form.image_url} alt="" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                </div>
              )}

              <label className="add-label">Name *</label>
              <input className="add-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Ristorante La Pergola" />

              <label className="add-label">Type</label>
              <select className="add-input" value={form.type} onChange={(e) => updateForm('type', e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <label className="add-label">City</label>
              <input className="add-input" value={form.city} onChange={(e) => updateForm('city', e.target.value)} placeholder="e.g. Rome, Florence, Venice" />

              <label className="add-label">Description</label>
              <textarea className="add-input" rows={3} value={form.desc_text} onChange={(e) => updateForm('desc_text', e.target.value)} placeholder="What is it? Why go?" />

              {(form.type === 'dining' || form.type === 'special') && (
                <>
                  <label className="add-label">What to order</label>
                  <input className="add-input" value={form.dish} onChange={(e) => updateForm('dish', e.target.value)} placeholder="e.g. Carbonara, Bistecca" />
                </>
              )}

              <label className="add-label">Price</label>
              <input className="add-input" value={form.price_label} onChange={(e) => updateForm('price_label', e.target.value)} placeholder="e.g. ~$50/pp, €140/night, Free" />

              <label className="add-label">Link</label>
              <input className="add-input" value={form.link} onChange={(e) => updateForm('link', e.target.value)} placeholder="https://..." />

              <label className="add-label">Image URL</label>
              <input className="add-input" value={form.image_url} onChange={(e) => updateForm('image_url', e.target.value)} placeholder="https://... (auto-filled from URL)" />

              <button className="detail-btn sel" onClick={handleSave} style={{ marginTop: 14 }}>
                Save Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
