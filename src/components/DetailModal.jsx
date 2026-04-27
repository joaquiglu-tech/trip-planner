import { useState } from 'react';
import { $f, usd, TYPE_LABEL, SUBCAT_BADGE } from '../data/items';
import { uploadFile, deleteFile } from '../lib/storage';

export default function DetailModal({ it, status, setStatus, updatedBy, onClose }) {
  const st = status || '';
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!it) return null;

  function cycleStatus() {
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
  const statusClass = st === 'conf' ? 'detail-btn conf' : st === 'sel' ? 'detail-btn sel' : 'detail-btn';

  // Build image URL: use item's imageUrl, or fallback to Google favicon of link domain
  const imageUrl = it.imageUrl || null;
  const faviconUrl = it.link ? `https://www.google.com/s2/favicons?domain=${new URL(it.link).hostname}&sz=64` : null;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="detail-close" onClick={onClose}>✕</button>

        {/* Hero image */}
        {imageUrl && (
          <div className="detail-hero">
            <img src={imageUrl} alt={it.name} onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="detail-hero-gradient" />
          </div>
        )}

        {/* Content */}
        <div className="detail-content">
          {/* Badges */}
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type]}</span>
            <span className="badge b-city">{it.city}</span>
            {it.urgent && <span className="badge b-urgent">⚠️ Book Now</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && (
              <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`}>{SUBCAT_BADGE[it.subcat].label}</span>
            )}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
          </div>

          {/* Name */}
          <h2 className="detail-name">{it.name}</h2>

          {/* Address */}
          {it.address && <div className="detail-address">📍 {it.address}</div>}

          {/* Dish */}
          {it.dish && (
            <div className="detail-dish-block">
              <span className="detail-dish-label">What to order</span>
              <span className="detail-dish-text">{it.dish}</span>
            </div>
          )}

          {/* Description */}
          <p className="detail-desc-full">{it.desc}</p>

          {/* Quote (Bourdain etc.) */}
          {it.quote && (
            <blockquote className="detail-quote">
              "{it.quote}"
              {it.quoteSource && <cite>— {it.quoteSource}</cite>}
            </blockquote>
          )}

          {/* Price info table */}
          <div className="detail-price-table">
            {it.type === 'stay' && (
              <>
                <div className="dpt-row"><span>Per night</span><span>{$f(usd(it.pn || 0))}</span></div>
                <div className="dpt-row"><span>Nights</span><span>{it.nights}</span></div>
                <div className="dpt-row total"><span>Total</span><span>{$f(usd((it.pn || 0) * (it.nights || 1)))}</span></div>
              </>
            )}
            {it.type === 'activity' && (
              <>
                <div className="dpt-row"><span>Per person</span><span>{it.eur === 0 ? 'Free' : $f(usd(it.eur))}</span></div>
                {it.eur > 0 && <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>}
                {it.hrs && <div className="dpt-row"><span>Duration</span><span>{it.hrs}h</span></div>}
              </>
            )}
            {it.type === 'special' && (
              <>
                <div className="dpt-row"><span>Per person</span><span>{$f(usd(it.ppEur || 0))}</span></div>
                <div className="dpt-row total"><span>Couple</span><span>{$f(usd((it.ppEur || 0) * 2))}</span></div>
              </>
            )}
            {it.type === 'dining' && (
              <>
                <div className="dpt-row"><span>Avg per person</span><span>{$f(usd(it.eur || 0))}</span></div>
                {it.eur > 0 && <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>}
              </>
            )}
            {it.type === 'transport' && it.priceLabel && (
              <div className="dpt-row total"><span>Est. cost</span><span>{it.priceLabel}</span></div>
            )}
            <div className="dpt-row"><span>Location</span><span>{it.city}</span></div>
          </div>

          {/* Source */}
          {it.src && (
            <div className="detail-source-block">
              <span className="detail-source-label">Recommended by</span>
              <div className="detail-source-val">{it.src}</div>
            </div>
          )}

          {/* Reserve info */}
          {it.reserveNote && (
            <div className="detail-reserve-note">⚠️ {it.reserveNote}</div>
          )}

          {/* Link with favicon */}
          {it.link && (
            <a href={it.link} target="_blank" rel="noopener" className="detail-book-link">
              {faviconUrl && <img src={faviconUrl} alt="" className="detail-favicon" />}
              <span>Book / Reserve ↗</span>
            </a>
          )}

          {/* Upload */}
          <div className="detail-upload-row">
            <label className="detail-upload-btn">
              {uploading ? 'Uploading...' : '📎 Upload reservation / confirmation'}
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

        {/* Sticky bottom action bar */}
        <div className="detail-action-bar">
          <button className={statusClass} onClick={cycleStatus}>{statusBtn}</button>
        </div>
      </div>
    </div>
  );
}
