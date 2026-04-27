import { useState, useEffect } from 'react';
import { $f, usd, TYPE_LABEL, SUBCAT_BADGE } from '../data/items';
import { uploadFile, deleteFile } from '../lib/storage';

export default function DetailModal({ it, status, setStatus, onClose, onDelete, paidPrice, setPaidPrice, placeData, getPlaceData, note, setNote, existingFile, onFileChange }) {
  const st = status || '';
  const [file, setFileLocal] = useState(existingFile || null);
  const [uploading, setUploading] = useState(false);
  const [costInput, setCostInput] = useState(paidPrice ? String(paidPrice) : '');
  const [noteText, setNoteText] = useState(note || '');
  const [place, setPlace] = useState(placeData || null);
  const [loadingPlace, setLoadingPlace] = useState(false);

  // Back button closes modal
  useEffect(() => {
    window.history.pushState({ modal: true }, '', '');
    function handlePop() { onClose(); }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [onClose]);

  // Fetch place data from Google on open
  useEffect(() => {
    if (!it || it.type === 'transport' || place?.photo_url) return;
    if (!getPlaceData) return;
    setLoadingPlace(true);
    getPlaceData(it.id, it.name, it.city).then((result) => {
      if (result) setPlace(result);
      setLoadingPlace(false);
    });
  }, [it?.id]);

  if (!it) return null;

  const heroImage = place?.photo_url || it.imageUrl || null;
  const googleRating = place?.rating || null;
  const googleAddress = place?.address || it.address || null;
  const googlePhone = place?.phone || null;
  const googleHours = place?.hours?.length ? place.hours : null;
  const faviconUrl = it.link ? `https://www.google.com/s2/favicons?domain=${new URL(it.link).hostname}&sz=64` : null;

  function handleSelect() {
    if (navigator.vibrate) navigator.vibrate(15);
    setStatus(it.id, st ? '' : 'sel');
  }
  function handleConfirm() {
    if (navigator.vibrate) navigator.vibrate(15);
    setStatus(it.id, st === 'conf' ? 'sel' : 'conf');
  }

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const result = await uploadFile(it.id, f);
      setFileLocal(result);
      if (onFileChange) onFileChange(it.id, result);
      if (st !== 'conf') setStatus(it.id, 'conf');
    } catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
  }

  async function handleRemoveFile() {
    if (file) {
      try { await deleteFile(file.path); } catch {}
      setFileLocal(null);
      if (onFileChange) onFileChange(it.id, null);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>

        {/* Hero image — Google Places photo or fallback */}
        {heroImage && (
          <div className="detail-hero">
            <img src={heroImage} alt={it.name} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
            <div className="detail-hero-gradient" />
          </div>
        )}
        {loadingPlace && !heroImage && (
          <div className="detail-hero-loading" />
        )}

        <div className="detail-content">
          {/* Badges + rating */}
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type]}</span>
            <span className="badge b-city">{it.city}</span>
            {googleRating && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>⭐ {googleRating}</span>}
            {it.urgent && <span className="badge b-urgent">⚠️ Book Now</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`}>{SUBCAT_BADGE[it.subcat].label}</span>}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
          </div>

          <h2 className="detail-name">{it.name}</h2>
          {googleAddress && <div className="detail-address">📍 {googleAddress}</div>}
          {googlePhone && <div className="detail-address">📞 {googlePhone}</div>}

          {/* Opening hours */}
          {googleHours && (
            <details className="detail-hours">
              <summary>🕐 Opening hours</summary>
              <ul>{googleHours.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </details>
          )}

          {/* ═══ TRANSPORT — comparison view ═══ */}
          {it.type === 'transport' && (
            <>
              <p className="detail-desc-full">{it.desc}</p>
              {it.options && (
                <div className="detail-section">
                  <div className="detail-section-title">Compare & Book</div>
                  {it.options.map((opt, i) => (
                    <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                      <div className="transport-option-info">
                        <span className="transport-option-name">{opt.name}</span>
                        {opt.detail && <span className="transport-option-detail">{opt.detail}</span>}
                      </div>
                      <span className="transport-option-price">{opt.price}</span>
                    </a>
                  ))}
                </div>
              )}
              {it.tips && (
                <div className="detail-section">
                  <div className="detail-section-title">Tips</div>
                  <ul className="detail-tips">{it.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
            </>
          )}

          {/* ═══ STAY — hotel/apartment detail ═══ */}
          {it.type === 'stay' && (
            <>
              <p className="detail-desc-full">{it.desc}</p>
              {it.options && (
                <div className="detail-section">
                  <div className="detail-section-title">Compare & Book</div>
                  {it.options.map((opt, i) => (
                    <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                      <div className="transport-option-info">
                        <span className="transport-option-name">{opt.name}</span>
                        {opt.detail && <span className="transport-option-detail">{opt.detail}</span>}
                      </div>
                      <span className="transport-option-price">{opt.price}</span>
                    </a>
                  ))}
                </div>
              )}
              {it.highlights && (
                <div className="detail-section">
                  <div className="detail-section-title">Highlights</div>
                  <ul className="detail-tips">{it.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </div>
              )}
              <div className="detail-section">
                <div className="detail-section-title">Pricing</div>
                <div className="detail-price-table">
                  <div className="dpt-row"><span>Tier</span><span>{it.tier}</span></div>
                  <div className="dpt-row"><span>Per night</span><span>{$f(usd(it.pn || 0))}</span></div>
                  <div className="dpt-row"><span>Nights</span><span>{it.nights}</span></div>
                  <div className="dpt-row total"><span>Total</span><span>{$f(usd((it.pn || 0) * (it.nights || 1)))}</span></div>
                </div>
              </div>
            </>
          )}

          {/* ═══ ACTIVITY ═══ */}
          {it.type === 'activity' && (
            <>
              <p className="detail-desc-full">{it.desc}</p>
              {it.whatToExpect && (
                <div className="detail-section">
                  <div className="detail-section-title">What to Expect</div>
                  <ul className="detail-tips">{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              <div className="detail-section">
                <div className="detail-section-title">Details</div>
                <div className="detail-price-table">
                  {it.hrs && <div className="dpt-row"><span>Duration</span><span>{it.hrs} hours</span></div>}
                  <div className="dpt-row"><span>Per person</span><span>{it.eur === 0 ? 'Free' : $f(usd(it.eur))}</span></div>
                  {it.eur > 0 && <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>}
                </div>
              </div>
            </>
          )}

          {/* ═══ DINING / SPECIAL MEAL ═══ */}
          {(it.type === 'dining' || it.type === 'special') && (
            <>
              {it.dish && (
                <div className="detail-dish-block">
                  <span className="detail-dish-label">What to order</span>
                  <span className="detail-dish-text">{it.dish}</span>
                </div>
              )}
              <p className="detail-desc-full">{it.desc}</p>
              {it.quote && (
                <blockquote className="detail-quote">
                  "{it.quote}"
                  {it.quoteSource && <cite>— {it.quoteSource}</cite>}
                </blockquote>
              )}
              {it.whatToExpect && (
                <div className="detail-section">
                  <div className="detail-section-title">What You'll Find</div>
                  <ul className="detail-tips">{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {it.proTips && (
                <div className="detail-section">
                  <div className="detail-section-title">Pro Tips</div>
                  <ul className="detail-tips">{it.proTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              <div className="detail-section">
                <div className="detail-section-title">Pricing</div>
                <div className="detail-price-table">
                  {it.type === 'special' ? (
                    <>
                      <div className="dpt-row"><span>Per person</span><span>{$f(usd(it.ppEur || 0))}</span></div>
                      <div className="dpt-row total"><span>Couple</span><span>{$f(usd((it.ppEur || 0) * 2))}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="dpt-row"><span>Avg per person</span><span>{$f(usd(it.eur || 0))}</span></div>
                      {it.eur > 0 && <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>}
                    </>
                  )}
                  <div className="dpt-row"><span>Location</span><span>{it.city}</span></div>
                </div>
              </div>
            </>
          )}

          {/* ═══ COMMON: Reserve note ═══ */}
          {it.reserveNote && <div className="detail-reserve-note">⚠️ {it.reserveNote}</div>}

          {/* Source */}
          {it.src && (
            <div className="detail-source-block">
              <span className="detail-source-label">Recommended by</span>
              <div className="detail-source-val">{it.src}</div>
            </div>
          )}

          {/* Book link */}
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

          {/* Notes */}
          {(st === 'sel' || st === 'conf') && setNote && (
            <div className="detail-section" style={{ marginTop: 8 }}>
              <div className="detail-section-title">Notes</div>
              <textarea
                className="note-input"
                placeholder="Add a note... (e.g. 'Ask for terrace table', 'Ania's pick')"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={() => setNote(it.id, noteText)}
                rows={2}
              />
            </div>
          )}

          {/* Actual cost input */}
          {(st === 'sel' || st === 'conf') && setPaidPrice && (
            <div className="detail-section" style={{ marginTop: 8 }}>
              <div className="detail-section-title">Actual Cost Paid (USD)</div>
              <div className="cost-input-row">
                <span className="cost-input-prefix">$</span>
                <input
                  type="number"
                  className="cost-input"
                  placeholder="0"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(costInput);
                    if (!isNaN(val) && val > 0) setPaidPrice(it.id, val);
                    else if (costInput === '' || costInput === '0') setPaidPrice(it.id, 0);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky action bar — clear status + actions */}
        <div className="detail-action-bar">
          {!st && (
            <button className="detail-btn sel" onClick={handleSelect}>Add to our trip</button>
          )}
          {st === 'sel' && (
            <>
              <div className="status-banner sel-banner">
                <span>✓ Added to trip</span>
                <button className="status-change-btn" onClick={handleSelect}>Remove</button>
              </div>
              <button className="detail-btn conf" onClick={handleConfirm}>Mark as booked</button>
            </>
          )}
          {st === 'conf' && (
            <>
              <div className="status-banner conf-banner">
                <span>✓ Booked</span>
                <button className="status-change-btn" onClick={() => { setStatus(it.id, 'sel'); }}>Change status</button>
              </div>
              {!file && (
                <label className="detail-btn upload-cta">
                  📎 Attach ticket or confirmation
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleUpload} />
                </label>
              )}
            </>
          )}
          {onDelete && (
            <button className="detail-btn-delete" onClick={() => { if (confirm('Remove this item?')) onDelete(); }}>Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}
