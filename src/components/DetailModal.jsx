import { useState, useEffect } from 'react';
import { $f, usd } from '../lib/useItems';
import { uploadFile, deleteFile } from '../lib/storage';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', special: 'Special Meal', dining: 'Dining' };
const SUBCAT_BADGE = {
  bourdain: { cls: 'b-bourdain', label: 'Bourdain' },
  michelin: { cls: 'b-michelin', label: 'Michelin' },
  local: { cls: 'b-local', label: 'Local pick' },
  bar: { cls: 'b-bar', label: 'Bar/Aperitivo' },
  cheap: { cls: 'b-cheap', label: 'Cheap eats' },
};

export default function DetailModal({ it, status, setStatus, updateItem, onClose, onDelete, files, setFile, removeFile, placeData, getPlaceData }) {
  const st = status || it.status || '';
  const [uploading, setUploading] = useState(false);
  const [costInput, setCostInput] = useState(it.paid_price ? String(it.paid_price) : '');
  const [noteText, setNoteText] = useState(it.notes || '');
  const [place, setPlace] = useState(placeData || null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [saved, setSaved] = useState('');
  const itemFiles = files || [];

  function showSaved(label) { setSaved(label); setTimeout(() => setSaved(''), 1500); }

  useEffect(() => {
    window.history.pushState({ modal: true }, '', '');
    function handlePop() { onClose(); }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [onClose]);

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

  const heroImage = place?.photo_url || it.image_url || it.imageUrl || null;
  const photoUrls = place?.photo_urls?.length > 0 ? place.photo_urls : (heroImage ? [heroImage] : []);
  const googleRating = place?.rating || null;
  const googleAddress = place?.address || it.address || null;
  const googlePhone = place?.phone || null;
  const googleHours = place?.hours?.length ? place.hours : null;
  const faviconUrl = it.link ? (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(it.link).hostname}&sz=64`; } catch { return null; } })() : null;

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
      if (setFile) setFile(it.id, result);
      if (st !== 'conf') setStatus(it.id, 'conf');
    } catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
  }

  async function handleRemoveFile(filePath) {
    try { await deleteFile(filePath); } catch {}
    if (removeFile) removeFile(it.id, filePath);
  }

  const desc = it.description || it.desc || '';

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose}>✕</button>

        {photoUrls.length > 1 ? (
          <div className="detail-carousel">
            <div className="detail-carousel-track">
              {photoUrls.map((url, i) => (
                <div key={i} className="detail-carousel-slide">
                  <img src={url} alt={`${it.name} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
            <div className="detail-carousel-dots">
              {photoUrls.map((_, i) => <span key={i} className="carousel-dot" />)}
            </div>
          </div>
        ) : heroImage ? (
          <div className="detail-hero">
            <img src={heroImage} alt={it.name} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
            <div className="detail-hero-gradient" />
          </div>
        ) : loadingPlace ? (
          <div className="detail-hero-loading" />
        ) : null}

        {/* Action bar — top */}
        <div className="detail-action-top">
          {!st && <button className="detail-btn sel" onClick={handleSelect}>Add to our trip</button>}
          {st === 'sel' && (
            <>
              <div className="status-banner sel-banner">
                <span>Added to trip</span>
                <button className="status-change-btn" onClick={handleSelect}>Remove</button>
              </div>
              <button className="detail-btn conf" onClick={handleConfirm}>Mark as booked</button>
            </>
          )}
          {st === 'conf' && (
            <div className="status-banner conf-banner">
              <span>Booked</span>
              <button className="status-change-btn" onClick={() => setStatus(it.id, 'sel')}>Change status</button>
            </div>
          )}
        </div>

        <div className="detail-content">
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type] || it.type}</span>
            {it.city && <span className="badge b-city">{it.city}</span>}
            {googleRating && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Rating {googleRating}</span>}
            {it.urgent && <span className="badge b-urgent">Book Now</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`}>{SUBCAT_BADGE[it.subcat].label}</span>}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
          </div>

          <h2 className="detail-name">{it.name}</h2>
          {googleAddress && <div className="detail-address">{googleAddress}</div>}
          {googlePhone && <div className="detail-address">{googlePhone}</div>}

          {googleHours && (
            <details className="detail-hours">
              <summary>Opening hours</summary>
              <ul>{googleHours.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </details>
          )}

          {/* Transport */}
          {it.type === 'transport' && (
            <>
              {(it.departTime || it.route) && (
                <div className="detail-times-bar">
                  {it.route && <span className="detail-route">{it.route}</span>}
                  {it.departTime && <span className="detail-time">Depart: {it.departTime}</span>}
                  {it.arriveTime && <span className="detail-time">Arrive: {it.arriveTime}</span>}
                </div>
              )}
              {desc && <p className="detail-desc-full">{desc}</p>}
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
            </>
          )}

          {/* Stay */}
          {it.type === 'stay' && (
            <>
              {(it.check_in || it.check_out || it.nights) && (
                <div className="detail-times-bar">
                  {it.nights > 0 && <span className="detail-time">{it.nights} nights</span>}
                  {it.check_in && <span className="detail-time">Check-in: {it.check_in}</span>}
                  {it.check_out && <span className="detail-time">Check-out: {it.check_out}</span>}
                </div>
              )}
              {desc && <p className="detail-desc-full">{desc}</p>}
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
              {it.pn > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title">Pricing</div>
                  <div className="detail-price-table">
                    <div className="dpt-row"><span>Tier</span><span>{it.tier}</span></div>
                    <div className="dpt-row"><span>Per night</span><span>{$f(usd(it.pn))}</span></div>
                    <div className="dpt-row"><span>Nights</span><span>{it.nights}</span></div>
                    <div className="dpt-row total"><span>Total</span><span>{$f(usd(it.pn * (it.nights || 1)))}</span></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Activity */}
          {it.type === 'activity' && (
            <>
              {desc && <p className="detail-desc-full">{desc}</p>}
              {it.whatToExpect && (
                <details className="detail-section detail-collapsible">
                  <summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>What to expect</summary>
                  <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
              <div className="detail-section">
                <div className="detail-section-title">Details</div>
                <div className="detail-price-table">
                  {it.hrs > 0 && <div className="dpt-row"><span>Duration</span><span>{it.hrs} hours</span></div>}
                  <div className="dpt-row"><span>Per person</span><span>{it.eur === 0 ? 'Free' : $f(usd(it.eur))}</span></div>
                  {it.eur > 0 && <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>}
                </div>
              </div>
            </>
          )}

          {/* Dining / Special */}
          {(it.type === 'dining' || it.type === 'special') && (
            <>
              {it.dish && (
                <div className="detail-dish-block">
                  <span className="detail-dish-label">What to order</span>
                  <span className="detail-dish-text">{it.dish}</span>
                </div>
              )}
              {desc && <p className="detail-desc-full">{desc}</p>}
              {it.quote && (
                <blockquote className="detail-quote">
                  "{it.quote}"
                  {it.quoteSource && <cite>— {it.quoteSource}</cite>}
                </blockquote>
              )}
              {(it.whatToExpect || it.proTips) && (
                <details className="detail-section detail-collapsible">
                  <summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>More details</summary>
                  {it.whatToExpect && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                  {it.proTips && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.proTips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
                </details>
              )}
              <div className="detail-section">
                <div className="detail-section-title">Pricing</div>
                <div className="detail-price-table">
                  {it.type === 'special' ? (
                    <>
                      <div className="dpt-row"><span>Per person</span><span>{$f(usd(it.pp_eur || 0))}</span></div>
                      <div className="dpt-row total"><span>Couple</span><span>{$f(usd((it.pp_eur || 0) * 2))}</span></div>
                    </>
                  ) : it.eur > 0 ? (
                    <>
                      <div className="dpt-row"><span>Avg per person</span><span>{$f(usd(it.eur))}</span></div>
                      <div className="dpt-row total"><span>Couple</span><span>{$f(usd(it.eur * 2))}</span></div>
                    </>
                  ) : null}
                  <div className="dpt-row"><span>Location</span><span>{it.city}</span></div>
                </div>
              </div>
            </>
          )}

          {saved && <div className="detail-saved">{saved}</div>}

          {it.reserveNote && <div className="detail-reserve-note">{it.reserveNote}</div>}

          {it.src && (
            <div className="detail-source-block">
              <span className="detail-source-label">Recommended by</span>
              <div className="detail-source-val">{it.src}</div>
            </div>
          )}

          {it.link && (
            <a href={it.link} target="_blank" rel="noopener" className="detail-book-link">
              {faviconUrl && <img src={faviconUrl} alt="" className="detail-favicon" />}
              <span>Book / Reserve</span>
            </a>
          )}

          {/* Files — multiple */}
          {itemFiles.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Attachments ({itemFiles.length})</div>
              {itemFiles.map((f, i) => (
                <div key={i} className="file-chip" style={{ marginBottom: 4 }}>
                  <span className="file-chip-name">{f.name}</span>
                  <a href={f.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#1967d2' }}>Open</a>
                  <button onClick={() => handleRemoveFile(f.path)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Upload — always available when selected or confirmed */}
          {(st === 'sel' || st === 'conf') && (
            <div className="detail-upload-row">
              <label className="detail-upload-btn">
                {uploading ? 'Uploading...' : `Upload ${itemFiles.length > 0 ? 'another ' : ''}file`}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleUpload} />
              </label>
            </div>
          )}

          {/* Notes */}
          {(st === 'sel' || st === 'conf') && updateItem && (
            <div className="detail-section" style={{ marginTop: 8 }}>
              <div className="detail-section-title">Notes</div>
              <textarea
                className="note-input"
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={() => { updateItem(it.id, { notes: noteText }); if (noteText) showSaved('Note saved'); }}
                rows={2}
              />
            </div>
          )}

          {/* Cost */}
          {(st === 'sel' || st === 'conf') && updateItem && (
            <div className="detail-section" style={{ marginTop: 8 }}>
              <div className="detail-section-title">Actual Cost Paid (USD)</div>
              <div className="cost-input-row">
                <span className="cost-input-prefix">$</span>
                <input
                  type="number" className="cost-input" placeholder="0"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(costInput);
                    if (!isNaN(val) && val > 0) { updateItem(it.id, { paid_price: val }); showSaved('Cost saved'); }
                    else if (costInput === '' || costInput === '0') updateItem(it.id, { paid_price: 0 });
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {onDelete && (
          <div style={{ padding: '0 16px 16px' }}>
            <button className="detail-btn-delete" onClick={() => { if (confirm('Remove this item?')) onDelete(); }}>Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}
