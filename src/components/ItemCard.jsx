import { useState, useRef } from 'react';
import { $f, usd, TYPE_LABEL, SUBCAT_BADGE } from '../data/items';
import { uploadFile, deleteFile } from '../lib/storage';

export default function ItemCard({ it, status, setStatus, updatedBy }) {
  const st = status || '';
  const stClass = st === 'conf' ? 'conf' : st === 'sel' ? 'sel' : '';
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef(null);
  const touchDelta = useRef(0);
  const cardRef = useRef(null);

  // Tap-to-toggle: cycle none → sel → conf → none
  function handleTap(e) {
    // Don't toggle if clicking a button, link, or input
    if (e.target.closest('button, a, input, label')) return;
    const next = st === '' ? 'sel' : st === 'sel' ? 'conf' : '';
    setStatus(it.id, next);
  }

  // Swipe handling
  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
    touchDelta.current = 0;
  }
  function onTouchMove(e) {
    if (touchStart.current === null) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current;
  }
  function onTouchEnd() {
    if (Math.abs(touchDelta.current) > 60) {
      if (touchDelta.current > 0 && st === '') {
        setStatus(it.id, 'sel');
      } else if (touchDelta.current > 0 && st === 'sel') {
        setStatus(it.id, 'conf');
      } else if (touchDelta.current < 0 && st !== '') {
        setStatus(it.id, st === 'conf' ? 'sel' : '');
      }
    }
    touchStart.current = null;
  }

  // Price - compact
  let price = '';
  if (it.type === 'stay') price = `${$f(usd(it.pn || 0))}/n`;
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur)) + '/pp';
  else if (it.type === 'special') price = $f(usd(it.ppEur || 0)) + '/pp';
  else if (it.type === 'dining') price = $f(usd(it.eur || 0)) + '/pp';
  else if (it.priceLabel) price = it.priceLabel;

  // Who changed initial
  const whoInitial = updatedBy ? updatedBy.split('@')[0][0]?.toUpperCase() : null;

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const result = await uploadFile(it.id, f);
      setFile(result);
      if (st !== 'conf') setStatus(it.id, 'conf');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  async function handleRemoveFile() {
    if (file) {
      try { await deleteFile(file.path); } catch {}
      setFile(null);
    }
  }

  return (
    <div
      ref={cardRef}
      className={`ic-compact ${stClass}`}
      onClick={handleTap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Status indicator bar */}
      <div className={`ic-status-bar ${st === 'conf' ? 'bar-conf' : st === 'sel' ? 'bar-sel' : ''}`} />

      <div className="ic-compact-body">
        <div className="ic-compact-top">
          <div className="ic-compact-info">
            {it.urgent && <span className="badge b-urgent" style={{ fontSize: 8, padding: '1px 5px' }}>⚠️</span>}
            <span className="ic-compact-name">{it.name}</span>
          </div>
          <div className="ic-compact-right">
            <span className="ic-compact-price">{price}</span>
            {whoInitial && <span className="who-badge">{whoInitial}</span>}
          </div>
        </div>

        {it.dish && <div className="ic-compact-dish">↳ {it.dish}</div>}

        <div className="ic-compact-badges">
          {it.subcat && SUBCAT_BADGE[it.subcat] && <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`} style={{ fontSize: 8, padding: '1px 5px' }}>{SUBCAT_BADGE[it.subcat].label}</span>}
          {it.tier && <span className="badge b-bar" style={{ fontSize: 8, padding: '1px 5px' }}>{it.tier}</span>}
          <span className="badge b-city" style={{ fontSize: 8, padding: '1px 5px' }}>{it.city}</span>
        </div>

        {/* Expand for details */}
        {expanded && (
          <div className="ic-expanded">
            <div className="ic-desc">{it.desc || ''}</div>
            {it.src && <div className="ic-src">Source: {it.src}</div>}
            {it.hrs && <div className="ic-src">⏱ {it.hrs}h</div>}
            <div className="ic-actions">
              {it.link && <a href={it.link} target="_blank" rel="noopener" className="btn-link">Book ↗</a>}
              <label className="btn-upload">
                {uploading ? '...' : '📎'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleUpload} />
              </label>
            </div>
            {file && (
              <div className="file-chip" style={{ marginTop: 4 }}>
                <span>📄</span>
                <span className="file-chip-name">{file.name}</span>
                <a href={file.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#1967d2' }}>↓</a>
                <button onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <button
        className="ic-expand-btn"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? '▲' : '▼'}
      </button>
    </div>
  );
}
