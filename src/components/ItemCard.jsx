import { useState } from 'react';
import { $f, usd, TYPE_LABEL, SUBCAT_BADGE } from '../data/items';
import { uploadFile, deleteFile } from '../lib/storage';

export default function ItemCard({ it, status, setStatus, updatedBy }) {
  const st = status || '';
  const stClass = st === 'conf' ? 'conf' : st === 'sel' ? 'sel' : '';
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Price
  let price = '';
  if (it.type === 'stay') price = `${$f(usd(it.pn || 0))}/n`;
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur)) + '/pp';
  else if (it.type === 'special') price = $f(usd(it.ppEur || 0)) + '/pp';
  else if (it.type === 'dining') price = $f(usd(it.eur || 0)) + '/pp';
  else if (it.priceLabel) price = it.priceLabel;

  // Total for couple
  let total = '';
  if (it.type === 'stay') total = $f(usd((it.pn || 0) * (it.nights || 1)));
  else if (it.type === 'activity' && it.eur) total = $f(usd(it.eur * 2));
  else if (it.type === 'special') total = $f(usd((it.ppEur || 0) * 2));
  else if (it.type === 'dining' && it.eur) total = $f(usd(it.eur * 2));

  const whoInitial = updatedBy ? updatedBy.split('@')[0][0]?.toUpperCase() : null;

  function handleCardClick(e) {
    if (e.target.closest('button, a, input, label')) return;
    setExpanded(!expanded);
  }

  function cycleStatus(e) {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(15);
    const next = st === '' ? 'sel' : st === 'sel' ? 'conf' : '';
    setStatus(it.id, next);
  }

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const result = await uploadFile(it.id, f);
      setFile(result);
      if (st !== 'conf') setStatus(it.id, 'conf');
    } catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
  }

  async function handleRemoveFile() {
    if (file) { try { await deleteFile(file.path); } catch {} setFile(null); }
  }

  // Status button label
  const statusBtn = st === 'conf' ? '✓ Confirmed' : st === 'sel' ? '● Selected' : 'Select';
  const statusBtnClass = st === 'conf' ? 'sq-status-btn conf' : st === 'sel' ? 'sq-status-btn sel' : 'sq-status-btn';

  return (
    <div className={`sq-card ${stClass}`} onClick={handleCardClick}>
      {/* Header row: badges + price */}
      <div className="sq-header">
        <div className="sq-badges">
          {it.urgent && <span className="badge b-urgent" style={{ fontSize: 8, padding: '1px 5px' }}>⚠️</span>}
          {it.subcat && SUBCAT_BADGE[it.subcat] && (
            <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`} style={{ fontSize: 8, padding: '1px 5px' }}>{SUBCAT_BADGE[it.subcat].label}</span>
          )}
          {it.tier && <span className="badge b-bar" style={{ fontSize: 8, padding: '1px 5px' }}>{it.tier}</span>}
        </div>
        {whoInitial && <span className="who-badge">{whoInitial}</span>}
      </div>

      {/* Name */}
      <div className="sq-name">{it.name}</div>

      {/* Key info line */}
      {it.dish && <div className="sq-dish">{it.dish}</div>}
      {!it.dish && it.type === 'stay' && <div className="sq-dish">{it.city} · {it.nights}n · {it.tier}</div>}
      {!it.dish && it.type === 'transport' && <div className="sq-dish">{it.city}</div>}
      {!it.dish && it.type === 'activity' && <div className="sq-dish">{it.city}{it.hrs ? ` · ${it.hrs}h` : ''}</div>}
      {!it.dish && it.type === 'special' && <div className="sq-dish">{it.city} · {it.subcat}</div>}

      {/* Price + status row */}
      <div className="sq-bottom">
        <div className="sq-price">
          <span className="sq-price-main">{price}</span>
          {total && <span className="sq-price-total">{total} couple</span>}
        </div>
        <button className={statusBtnClass} onClick={cycleStatus}>{statusBtn}</button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="sq-expanded" onClick={(e) => e.stopPropagation()}>
          <div className="sq-desc">{it.desc}</div>
          {it.src && <div className="sq-src">Source: {it.src}</div>}
          {it.hrs && <div className="sq-src">⏱ {it.hrs}h</div>}
          <div className="sq-actions">
            {it.link && <a href={it.link} target="_blank" rel="noopener" className="btn-link">Book ↗</a>}
            <label className="btn-upload">
              {uploading ? '...' : '📎 Upload'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          </div>
          {file && (
            <div className="file-chip" style={{ marginTop: 6 }}>
              <span>📄</span>
              <span className="file-chip-name">{file.name}</span>
              <a href={file.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#1967d2' }}>↓</a>
              <button onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>×</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
