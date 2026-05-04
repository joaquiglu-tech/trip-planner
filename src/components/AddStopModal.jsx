import { useState } from 'react';

export default function AddStopModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), start_date: startDate, end_date: endDate });
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-content">
          <h2 className="detail-name" style={{ fontSize: 18 }}>Add Stop</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Add a city or town to your trip.</p>

          <label className="add-label">Name *</label>
          <input className="add-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rome, Bellagio, Lima" autoFocus />

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

          <button className="detail-btn sel" onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate} style={{ marginTop: 14 }}>
            {saving ? 'Adding...' : 'Add Stop'}
          </button>
        </div>
      </div>
    </div>
  );
}
