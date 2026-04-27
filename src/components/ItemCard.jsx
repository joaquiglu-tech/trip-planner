import { useState } from 'react';
import { $f, usd, TYPE_LABEL, SUBCAT_BADGE } from '../data/items';
import { uploadFile, deleteFile } from '../lib/storage';

// Generate a Google Places photo search URL based on name + city
function getPhotoUrl(it) {
  const q = encodeURIComponent(`${it.name} ${it.city} Italy`);
  return `https://source.unsplash.com/400x200/?${q}`;
}

export default function ItemCard({ it, status, setStatus, updatedBy }) {
  const st = status || '';
  const stClass = st === 'conf' ? 'conf' : st === 'sel' ? 'sel' : '';
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Price
  let price = '';
  if (it.type === 'stay') price = `${$f(usd(it.pn || 0))}/n`;
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur)) + '/pp';
  else if (it.type === 'special') price = $f(usd(it.ppEur || 0)) + '/pp';
  else if (it.type === 'dining') price = $f(usd(it.eur || 0)) + '/pp';
  else if (it.priceLabel) price = it.priceLabel;

  // Total for couple
  let total = '';
  if (it.type === 'stay') total = $f(usd((it.pn || 0) * (it.nights || 1))) + ' total';
  else if (it.type === 'activity' && it.eur) total = $f(usd(it.eur * 2)) + ' couple';
  else if (it.type === 'special') total = $f(usd((it.ppEur || 0) * 2)) + ' couple';
  else if (it.type === 'dining' && it.eur) total = $f(usd(it.eur * 2)) + ' couple';

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

  const statusBtn = st === 'conf' ? '✓ Confirmed' : st === 'sel' ? '● Selected' : 'Select';
  const statusBtnClass = st === 'conf' ? 'sq-status-btn conf' : st === 'sel' ? 'sq-status-btn sel' : 'sq-status-btn';

  return (
    <div className={`sq-card ${stClass} ${expanded ? 'expanded' : ''}`} onClick={handleCardClick}>
      {/* Collapsed view */}
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

      <div className="sq-name">{it.name}</div>

      {it.dish && <div className="sq-dish">{it.dish}</div>}
      {!it.dish && it.type === 'stay' && <div className="sq-dish">{it.city} · {it.nights}n · {it.tier}</div>}
      {!it.dish && it.type === 'transport' && <div className="sq-dish">{it.city}</div>}
      {!it.dish && it.type === 'activity' && <div className="sq-dish">{it.city}{it.hrs ? ` · ${it.hrs}h` : ''}</div>}
      {!it.dish && it.type === 'special' && <div className="sq-dish">{it.city} · {it.subcat}</div>}

      <div className="sq-bottom">
        <div className="sq-price">
          <span className="sq-price-main">{price}</span>
          {total && <span className="sq-price-total">{total}</span>}
        </div>
        <button className={statusBtnClass} onClick={cycleStatus}>{statusBtn}</button>
      </div>

      {/* ═══ EXPANDED DETAIL VIEW ═══ */}
      {expanded && (
        <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
          {/* Photo */}
          {!imgError && (
            <div className="detail-photo">
              <img
                src={getPhotoUrl(it)}
                alt={it.name}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </div>
          )}

          {/* Type + City header */}
          <div className="detail-meta">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type]}</span>
            <span className="badge b-city">{it.city}</span>
            {it.subcat && SUBCAT_BADGE[it.subcat] && (
              <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`}>{SUBCAT_BADGE[it.subcat].label}</span>
            )}
          </div>

          {/* Dish / cuisine */}
          {it.dish && (
            <div className="detail-row">
              <span className="detail-label">Dish</span>
              <span className="detail-value">{it.dish}</span>
            </div>
          )}

          {/* Description */}
          <div className="detail-desc">{it.desc}</div>

          {/* Info rows */}
          <div className="detail-info">
            {it.type === 'stay' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Tier</span>
                  <span className="detail-value">{it.tier}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nights</span>
                  <span className="detail-value">{it.nights}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Per night</span>
                  <span className="detail-value">{$f(usd(it.pn || 0))}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total (couple)</span>
                  <span className="detail-value" style={{ fontWeight: 700 }}>{$f(usd((it.pn || 0) * (it.nights || 1)))}</span>
                </div>
              </>
            )}
            {it.type === 'activity' && (
              <>
                {it.hrs && <div className="detail-row"><span className="detail-label">Duration</span><span className="detail-value">{it.hrs} hours</span></div>}
                <div className="detail-row">
                  <span className="detail-label">Per person</span>
                  <span className="detail-value">{it.eur === 0 ? 'Free' : $f(usd(it.eur))}</span>
                </div>
                {it.eur > 0 && <div className="detail-row"><span className="detail-label">Couple</span><span className="detail-value" style={{ fontWeight: 700 }}>{$f(usd(it.eur * 2))}</span></div>}
              </>
            )}
            {it.type === 'special' && (
              <>
                <div className="detail-row"><span className="detail-label">Per person</span><span className="detail-value">{$f(usd(it.ppEur || 0))}</span></div>
                <div className="detail-row"><span className="detail-label">Couple</span><span className="detail-value" style={{ fontWeight: 700 }}>{$f(usd((it.ppEur || 0) * 2))}</span></div>
              </>
            )}
            {it.type === 'dining' && (
              <>
                <div className="detail-row"><span className="detail-label">Avg per person</span><span className="detail-value">{$f(usd(it.eur || 0))}</span></div>
                {it.eur > 0 && <div className="detail-row"><span className="detail-label">Couple</span><span className="detail-value" style={{ fontWeight: 700 }}>{$f(usd(it.eur * 2))}</span></div>}
              </>
            )}
            {it.type === 'transport' && it.priceLabel && (
              <div className="detail-row"><span className="detail-label">Est. cost</span><span className="detail-value">{it.priceLabel}</span></div>
            )}
            <div className="detail-row">
              <span className="detail-label">Location</span>
              <span className="detail-value">{it.city}</span>
            </div>
          </div>

          {/* Source / recommendation */}
          {it.src && (
            <div className="detail-source">
              <span className="detail-label">Recommended by</span>
              <div className="detail-source-text">{it.src}</div>
            </div>
          )}

          {/* Actions */}
          <div className="detail-actions">
            <button className={statusBtnClass} onClick={cycleStatus} style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}>{statusBtn}</button>
            {it.link && <a href={it.link} target="_blank" rel="noopener" className="btn-link" style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: 12 }}>Book ↗</a>}
          </div>

          <div className="detail-actions" style={{ marginTop: 6 }}>
            <label className="btn-upload" style={{ flex: 1, textAlign: 'center', padding: '7px 12px' }}>
              {uploading ? 'Uploading...' : '📎 Upload reservation'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          </div>

          {file && (
            <div className="file-chip" style={{ marginTop: 8 }}>
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
