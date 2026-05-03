import { useState, useEffect } from 'react';
import { $f, priceLabel } from '../lib/useItems';
import { uploadFile, deleteFile } from '../lib/storage';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', special: 'Special Meal', dining: 'Dining' };
const TYPE_OPTIONS = [
  { value: 'dining', label: 'Dining' }, { value: 'stay', label: 'Stay' }, { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' }, { value: 'special', label: 'Special Meal' },
];
const SUBCAT_BADGE = {
  bourdain: 'Bourdain', michelin: 'Michelin', local: 'Local pick', bar: 'Bar/Aperitivo', cheap: 'Cheap eats',
};
const PRICE_LEVEL_LABEL = { PRICE_LEVEL_FREE: 'Free', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' };

function getBookingUrl(source, hotelName, city) {
  const q = encodeURIComponent(`${hotelName} ${city}`);
  if (source === 'Booking.com') return `https://www.booking.com/searchresults.html?ss=${q}`;
  if (source === 'Agoda.com') return `https://www.agoda.com/search?q=${q}`;
  if (source === 'Trip.com') return `https://www.trip.com/hotels/?keyword=${q}`;
  if (source === 'Vio.com') return `https://www.vio.com/hotels?q=${q}`;
  if (source === 'Hotels.com') return `https://www.hotels.com/search.do?q-destination=${q}`;
  if (source === 'Expedia') return `https://www.expedia.com/Hotel-Search?destination=${q}`;
  return `https://www.google.com/travel/hotels?q=${q}`;
}

export default function DetailModal({ it, status, setStatus, updateItem, onClose, onDelete, files, setFile, removeFile, placeData, getPlaceData, livePrice, livePriceRates, expenseAmount, addExpense }) {
  const st = status || it.status || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [uploading, setUploading] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [place, setPlace] = useState(placeData || null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [saved, setSaved] = useState('');
  const itemFiles = files || [];

  function showSaved(label) { setSaved(label); setTimeout(() => setSaved(''), 1500); }

  function startEdit() {
    setDraft({
      name: it.name || '', type: it.type || 'dining', city: it.city || '',
      description: it.description || '', dish: it.dish || '', link: it.link || '',
      notes: it.notes || '',
      estimated_cost: it.estimated_cost ? String(it.estimated_cost) : '',
      day_n: it.day_n ? String(it.day_n) : '', start_time: it.start_time || '', end_time: it.end_time || '',
      check_in: it.check_in || '', check_out: it.check_out || '',
      urgent: !!it.urgent, src: it.src || '',
    });
    setEditing(true);
  }

  function saveEdit() {
    const changes = {};
    if (draft.name !== (it.name || '')) changes.name = draft.name;
    if (draft.type !== (it.type || 'dining')) changes.type = draft.type;
    if (draft.city !== (it.city || '')) changes.city = draft.city;
    if (draft.description !== (it.description || '')) changes.description = draft.description;
    if (draft.dish !== (it.dish || '')) changes.dish = draft.dish;
    if (draft.link !== (it.link || '')) changes.link = draft.link;
    if (draft.notes !== (it.notes || '')) changes.notes = draft.notes;
    const ec = parseFloat(draft.estimated_cost);
    if (!isNaN(ec) && ec !== (it.estimated_cost || 0)) changes.estimated_cost = ec;
    const dn = draft.day_n ? parseInt(draft.day_n) : null;
    if (dn !== it.day_n) changes.day_n = dn;
    if (draft.start_time !== (it.start_time || '')) changes.start_time = draft.start_time || null;
    if (draft.end_time !== (it.end_time || '')) changes.end_time = draft.end_time || null;
    if (draft.check_in !== (it.check_in || '')) changes.check_in = draft.check_in;
    if (draft.check_out !== (it.check_out || '')) changes.check_out = draft.check_out;
    if (draft.urgent !== !!it.urgent) changes.urgent = draft.urgent;
    if (draft.src !== (it.src || '')) changes.src = draft.src;
    if (Object.keys(changes).length > 0) {
      updateItem(it.id, changes);
      showSaved('Saved');
    }
    setEditing(false);
  }

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
    getPlaceData(it.id, it.name, it.city).then((result) => { if (result) setPlace(result); setLoadingPlace(false); });
  }, [it?.id]);

  if (!it) return null;

  const heroImage = place?.photo_url || it.imageUrl || null;
  const photoUrls = place?.photo_urls?.length > 0 ? place.photo_urls : (heroImage ? [heroImage] : []);
  const googleRating = place?.rating || null;
  const googleAddress = place?.address || it.address || null;
  const googlePhone = place?.phone || null;
  const googleHours = place?.hours?.length ? place.hours : null;
  const priceLvl = place?.price_level ? PRICE_LEVEL_LABEL[place.price_level] : null;
  const faviconUrl = it.link ? (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(it.link).hostname}&sz=64`; } catch { return null; } })() : null;
  const price = priceLabel(it);
  const desc = it.description || it.desc || '';

  function handleSelect() { if (navigator.vibrate) navigator.vibrate(15); setStatus(it.id, st ? '' : 'sel'); }
  function handleConfirm() { if (navigator.vibrate) navigator.vibrate(15); setStatus(it.id, st === 'conf' ? 'sel' : 'conf'); }

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

  // ═══ EDIT MODE ═══
  if (editing) {
    const u = (key, val) => setDraft(d => ({ ...d, [key]: val }));
    return (
      <div className="detail-overlay" onClick={onClose}>
        <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="detail-handle" />
          <div className="detail-action-top">
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="detail-btn" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="detail-btn sel" onClick={saveEdit} style={{ flex: 1 }}>Save</button>
            </div>
          </div>
          <div className="detail-content">
            {/* Basic info */}
            <div className="edit-section-title">Basic Info</div>
            <label className="edit-label">Name</label>
            <input className="edit-input" value={draft.name} onChange={e => u('name', e.target.value)} />
            <div className="edit-row-2">
              <div><label className="edit-label">Type</label>
                <select className="edit-input" value={draft.type} onChange={e => u('type', e.target.value)}>
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="edit-label">City</label>
                <input className="edit-input" value={draft.city} onChange={e => u('city', e.target.value)} />
              </div>
            </div>
            <label className="edit-label">Description</label>
            <textarea className="edit-textarea" value={draft.description} onChange={e => u('description', e.target.value)} rows={3} />
            {(draft.type === 'dining' || draft.type === 'special') && (
              <><label className="edit-label">What to order</label>
              <input className="edit-input" value={draft.dish} onChange={e => u('dish', e.target.value)} placeholder="Signature dish" /></>
            )}
            <label className="edit-label">Link</label>
            <input className="edit-input" value={draft.link} onChange={e => u('link', e.target.value)} placeholder="https://..." type="url" />
            <label className="edit-label">Source</label>
            <input className="edit-input" value={draft.src} onChange={e => u('src', e.target.value)} placeholder="Where you found this" />
            <div className="edit-row-2">
              <div><label className="edit-label">Urgent</label>
                <button className={`fp ${draft.urgent ? 'fp-urgent-active' : 'fp-urgent'}`} onClick={() => u('urgent', !draft.urgent)} style={{ width: '100%' }}>
                  {draft.urgent ? 'Yes — Book now' : 'No'}
                </button>
              </div>
              <div></div>
            </div>

            {/* Schedule */}
            <div className="edit-section-title">Schedule</div>
            <div className="edit-row-3">
              <div><label className="edit-label">Day #</label>
                <input className="edit-input" value={draft.day_n} onChange={e => u('day_n', e.target.value)} type="number" placeholder="1-17" />
              </div>
              <div><label className="edit-label">Start</label>
                <input className="edit-input" value={draft.start_time} onChange={e => u('start_time', e.target.value)} type="time" />
              </div>
              <div><label className="edit-label">End</label>
                <input className="edit-input" value={draft.end_time} onChange={e => u('end_time', e.target.value)} type="time" />
              </div>
            </div>
            {draft.type === 'stay' && (
              <div className="edit-row-2">
                <div><label className="edit-label">Check-in</label>
                  <input className="edit-input" value={draft.check_in} onChange={e => u('check_in', e.target.value)} placeholder="3:00 PM" />
                </div>
                <div><label className="edit-label">Check-out</label>
                  <input className="edit-input" value={draft.check_out} onChange={e => u('check_out', e.target.value)} placeholder="11:00 AM" />
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="edit-section-title">Pricing</div>
            <div className="edit-row-2">
              <div><label className="edit-label">Estimated cost (USD)</label>
                <input className="edit-input" value={draft.estimated_cost} onChange={e => u('estimated_cost', e.target.value)} type="number" placeholder="0" />
              </div>
              <div></div>
            </div>

            {/* Notes */}
            <div className="edit-section-title">Notes</div>
            <textarea className="edit-textarea" value={draft.notes} onChange={e => u('notes', e.target.value)} rows={3} placeholder="Any notes..." />
          </div>
        </div>
      </div>
    );
  }

  // ═══ VIEW MODE ═══
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose}>✕</button>

        {/* Photos */}
        {photoUrls.length > 1 ? (
          <div className="detail-carousel">
            <div className="detail-carousel-track">
              {photoUrls.map((url, i) => (
                <div key={i} className="detail-carousel-slide">
                  <img src={url} alt={`${it.name} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        ) : heroImage ? (
          <div className="detail-hero">
            <img src={heroImage} alt={it.name} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
            <div className="detail-hero-gradient" />
          </div>
        ) : loadingPlace ? (<div className="detail-hero-loading" />) : null}

        {/* Actions */}
        <div className="detail-action-top">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              {!st && <button className="detail-btn sel" onClick={handleSelect}>Add to our trip</button>}
              {st === 'sel' && (
                <>
                  <div className="status-banner sel-banner"><span>Added to trip</span><button className="status-change-btn" onClick={handleSelect}>Remove</button></div>
                  <button className="detail-btn conf" onClick={handleConfirm} style={{ marginTop: 6 }}>Mark as booked</button>
                </>
              )}
              {st === 'conf' && (
                <div className="status-banner conf-banner"><span>Booked</span><button className="status-change-btn" onClick={() => setStatus(it.id, 'sel')}>Change</button></div>
              )}
            </div>
            <button className="edit-toggle-btn" onClick={startEdit}>Edit</button>
          </div>
        </div>

        <div className="detail-content">
          {/* Badges */}
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type] || it.type}</span>
            {it.city && <span className="badge b-city">{it.city}</span>}
            {googleRating && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Rating {googleRating}</span>}
            {priceLvl && <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>{priceLvl}</span>}
            {it.urgent && <span className="badge b-urgent">Book Now</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && <span className="badge">{SUBCAT_BADGE[it.subcat]}</span>}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
          </div>

          <h2 className="detail-name">{it.name}</h2>
          {googleAddress && <div className="detail-address">{googleAddress}</div>}
          {googlePhone && <div className="detail-address">{googlePhone}</div>}
          {googleHours && (
            <details className="detail-hours"><summary>Opening hours</summary>
              <ul>{googleHours.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </details>
          )}

          {/* Price display */}
          {(it.estimated_cost > 0 || livePrice > 0 || expenseAmount > 0) && (
            <div className="detail-price-display">
              {livePrice > 0 && it.type === 'stay' && (
                <div className="detail-live-price">
                  <span className="detail-live-label">Live price</span>
                  <span className="detail-live-value">{$f(livePrice)}/night</span>
                </div>
              )}
              {it.estimated_cost > 0 && (
                <div className="detail-est-price">
                  <span>Estimate: {$f(it.estimated_cost)}</span>
                </div>
              )}
              {expenseAmount > 0 && (
                <div className="detail-paid-price">
                  <span>Paid: {$f(expenseAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Type-specific content */}
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
              {it.options?.map((opt, i) => (
                <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                  <div className="transport-option-info"><span className="transport-option-name">{opt.name}</span>{opt.detail && <span className="transport-option-detail">{opt.detail}</span>}</div>
                  <span className="transport-option-price">{opt.price}</span>
                </a>
              ))}
            </>
          )}

          {it.type === 'stay' && (
            <>
              {(it.check_in || it.check_out) && (
                <div className="detail-times-bar">
                  {it.check_in && <span className="detail-time">Check-in: {it.check_in}</span>}
                  {it.check_out && <span className="detail-time">Check-out: {it.check_out}</span>}
                </div>
              )}
              {desc && <p className="detail-desc-full">{desc}</p>}
              {it.highlights && <ul className="detail-tips">{it.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
              {/* Live booking rates from Xotelo — standardized for all stays */}
              {livePriceRates && livePriceRates.length > 0 ? (
                <div className="detail-section">
                  <div className="detail-section-title">Book — live prices per night</div>
                  {livePriceRates.map((rate, i) => (
                    <a key={i} href={getBookingUrl(rate.source, it.name, it.city)} target="_blank" rel="noopener" className="transport-option">
                      <div className="transport-option-info"><span className="transport-option-name">{rate.source}</span><span className="transport-option-detail">Per night incl. tax</span></div>
                      <span className="transport-option-price">{$f(rate.per_night)}</span>
                    </a>
                  ))}
                </div>
              ) : it.options?.length > 0 ? (
                <div className="detail-section">
                  <div className="detail-section-title">Compare & Book</div>
                  {it.options.map((opt, i) => (
                    <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                      <div className="transport-option-info"><span className="transport-option-name">{opt.name}</span>{opt.detail && <span className="transport-option-detail">{opt.detail}</span>}</div>
                      <span className="transport-option-price">{opt.price}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {it.type === 'activity' && (
            <>
              {desc && <p className="detail-desc-full">{desc}</p>}
              {it.whatToExpect && (
                <details className="detail-section detail-collapsible"><summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>What to expect</summary>
                  <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
            </>
          )}

          {(it.type === 'dining' || it.type === 'special') && (
            <>
              {it.dish && (<div className="detail-dish-block"><span className="detail-dish-label">What to order</span><span className="detail-dish-text">{it.dish}</span></div>)}
              {desc && <p className="detail-desc-full">{desc}</p>}
              {it.quote && (<blockquote className="detail-quote">"{it.quote}"{it.quoteSource && <cite>— {it.quoteSource}</cite>}</blockquote>)}
              {(it.whatToExpect || it.proTips) && (
                <details className="detail-section detail-collapsible"><summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>More details</summary>
                  {it.whatToExpect && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                  {it.proTips && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.proTips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
                </details>
              )}
            </>
          )}

          {saved && <div className="detail-saved">{saved}</div>}
          {it.reserveNote && <div className="detail-reserve-note">{it.reserveNote}</div>}
          {it.src && <div className="detail-source-block"><span className="detail-source-label">Recommended by</span><div className="detail-source-val">{it.src}</div></div>}
          {it.link && (
            <a href={it.link} target="_blank" rel="noopener" className="detail-book-link">
              {faviconUrl && <img src={faviconUrl} alt="" className="detail-favicon" />}<span>Book / Reserve</span>
            </a>
          )}

          {/* Files */}
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

          {(st === 'sel' || st === 'conf') && (
            <div className="detail-upload-row">
              <label className="detail-upload-btn">
                {uploading ? 'Uploading...' : `Upload ${itemFiles.length > 0 ? 'another ' : ''}file`}
                <input type="file" accept="*/*" style={{ display: 'none' }} onChange={handleUpload} />
              </label>
            </div>
          )}

          {/* Log payment — when confirmed and no expense yet */}
          {st === 'conf' && expenseAmount === 0 && addExpense && (
            <div className="detail-booking-prompt">
              <div className="detail-section-title" style={{ marginBottom: 8 }}>How much did you pay?</div>
              <div className="cost-input-row" style={{ marginBottom: 8 }}>
                <span className="cost-input-prefix">$</span>
                <input type="number" className="cost-input" placeholder="0" value={costInput} onChange={e => setCostInput(e.target.value)} />
              </div>
              <button className="detail-btn sel" onClick={async () => {
                const val = parseFloat(costInput);
                if (!val || val <= 0) return;
                await addExpense({ amount: val, category: it.type, note: it.name, item_id: it.id, stop_id: it.stop_id, created_by: '' });
                setCostInput('');
                showSaved('Payment logged');
              }}>Log payment</button>
            </div>
          )}

          {it.notes && !editing && (
            <div className="detail-section" style={{ marginTop: 8 }}>
              <div className="detail-section-title">Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{it.notes}</div>
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
