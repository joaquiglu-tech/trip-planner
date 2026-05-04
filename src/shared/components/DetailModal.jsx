import { useState, useEffect, useRef } from 'react';
import { $f, priceLabel } from '../hooks/useItems';
import { uploadFile, deleteFile } from '../../services/storage';
import PlaceSearch from './PlaceSearch';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', food: 'Food' };
const TYPE_OPTIONS = [
  { value: 'food', label: 'Food' }, { value: 'stay', label: 'Stay' }, { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport' },
];
const SUBCAT_OPTIONS = [
  { value: '', label: 'None' }, { value: 'bourdain', label: 'Bourdain' }, { value: 'michelin', label: 'Michelin' },
  { value: 'local', label: 'Local pick' }, { value: 'bar', label: 'Bar/Aperitivo' }, { value: 'cheap', label: 'Cheap eats' },
];
const TIER_OPTIONS = [
  { value: '', label: 'None' }, { value: 'Budget', label: 'Budget' }, { value: 'Mid-range', label: 'Mid-range' },
  { value: 'Boutique', label: 'Boutique' }, { value: 'Luxury', label: 'Luxury' },
];
const TRANSPORT_MODES = [
  { value: 'flight', label: 'Flight' }, { value: 'train', label: 'Train' }, { value: 'bus', label: 'Bus' },
  { value: 'rental', label: 'Rental' }, { value: 'drive', label: 'Drive' }, { value: 'ferry', label: 'Ferry' }, { value: 'taxi', label: 'Taxi' },
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

export default function DetailModal({ it, status, setStatus, updateItem, onClose, onDelete, files, setFile, removeFile, placeData, getPlaceData, livePrice, livePriceRates, expenseAmount, itemExpenses, addExpense, updateExpense, stops }) {
  const st = status || it.status || '';
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [place, setPlace] = useState(placeData || null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [saved, setSaved] = useState('');
  const [paidInput, setPaidInput] = useState('');
  const itemFiles = files || [];

  function showSaved(label) { setSaved(label); setTimeout(() => setSaved(''), 1500); }

  // Save a single field on blur
  function saveField(key, value) {
    if (String(value ?? '') !== String(it[key] ?? '')) {
      updateItem(it.id, { [key]: value });
      showSaved('Saved');
    }
  }

  // Save transport origin/dest from PlaceSearch
  function saveOrigin(v) {
    const changes = { origin_name: v?.name || '', origin_lat: v?.lat || null, origin_lng: v?.lng || null };
    const derivedRoute = [v?.name || '', it.dest_name || ''].filter(Boolean).join(' \u2192 ');
    if (derivedRoute) changes.route = derivedRoute;
    updateItem(it.id, changes);
    showSaved('Saved');
  }
  function saveDest(v) {
    const changes = { dest_name: v?.name || '', dest_lat: v?.lat || null, dest_lng: v?.lng || null };
    const derivedRoute = [it.origin_name || '', v?.name || ''].filter(Boolean).join(' \u2192 ');
    if (derivedRoute) changes.route = derivedRoute;
    updateItem(it.id, changes);
    showSaved('Saved');
  }

  // Expense handling: create or update
  function handlePaidBlur() {
    const val = parseFloat(paidInput);
    if (isNaN(val) || val < 0) { setPaidInput(expenseAmount > 0 ? String(expenseAmount) : ''); return; }
    const existing = (itemExpenses || [])[0];
    if (existing && val > 0) {
      if (val !== Number(existing.amount)) updateExpense(existing.id, { amount: val });
    } else if (!existing && val > 0) {
      addExpense({ amount: val, category: it.type === 'food' ? 'food' : it.type, note: it.name, item_id: it.id, stop_id: it.stop_ids?.[0] || '', created_by: '' });
    }
    showSaved('Saved');
  }

  useEffect(() => {
    setPaidInput(expenseAmount > 0 ? String(expenseAmount) : '');
  }, [expenseAmount]);

  useEffect(() => {
    window.history.pushState({ modal: true }, '', '');
    function handlePop() { onClose(); }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [onClose]);

  useEffect(() => {
    if (!it || place?.photo_url) return;
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

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const result = await uploadFile(it.id, f);
      if (setFile) setFile(it.id, result);
    } catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
  }

  async function handleRemoveFile(filePath) {
    try { await deleteFile(filePath); } catch {}
    if (removeFile) removeFile(it.id, filePath);
  }

  return (
    <div className="detail-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Item details">
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>

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

        {/* Status selector */}
        <div className="detail-action-top">
          <div className="status-selector">
            {[
              { value: '', label: 'Not added', cls: '' },
              { value: 'sel', label: 'Selected', cls: 'sel' },
              { value: 'conf', label: 'Confirmed', cls: 'conf' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`status-option ${opt.cls} ${st === opt.value ? 'active' : ''}`}
                onClick={() => {
                  if (opt.value === st) return;
                  if (navigator.vibrate) navigator.vibrate(15);
                  if (opt.value === 'conf' && st !== 'conf') { setConfirming(true); return; }
                  if (st === 'conf' && opt.value !== 'conf' && expenseAmount > 0) {
                    if (!confirm(`This item has ${$f(expenseAmount)} in expenses. Changing status will keep the expenses. Continue?`)) return;
                  }
                  setStatus(it.id, opt.value);
                }}
              >
                {opt.value === 'conf' ? '✓' : opt.value === 'sel' ? '●' : '○'} {opt.label}
              </button>
            ))}
          </div>
          {confirming && (
            <div className="detail-booking-prompt" style={{ marginTop: 8 }}>
              <div className="detail-section-title" style={{ marginBottom: 8 }}>How much did you pay?</div>
              <div className="cost-input-row" style={{ marginBottom: 8 }}>
                <span className="cost-input-prefix">$</span>
                <input type="number" className="cost-input" placeholder="0 (optional)" value={costInput} onChange={e => setCostInput(e.target.value)} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="detail-btn" onClick={() => setConfirming(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="detail-btn conf" onClick={async () => {
                  const val = parseFloat(costInput);
                  if (val > 0 && addExpense) {
                    await addExpense({ amount: val, category: it.type === 'food' ? 'food' : it.type, note: it.name, item_id: it.id, stop_id: it.stop_ids?.[0] || '', created_by: '' });
                  }
                  setStatus(it.id, 'conf');
                  setCostInput(''); setConfirming(false);
                  showSaved(val > 0 ? 'Confirmed & paid' : 'Booked');
                }} style={{ flex: 1 }}>Confirm{costInput ? ` & pay ${$f(parseFloat(costInput) || 0)}` : ''}</button>
              </div>
            </div>
          )}
        </div>

        <div className="detail-content">
          {saved && <div className="detail-saved">{saved}</div>}

          {/* Badges (read-only enrichment) */}
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>{TYPE_LABEL[it.type] || it.type}</span>
            {it.city && <span className="badge b-city">{it.city}</span>}
            {googleRating && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Rating {googleRating}</span>}
            {priceLvl && <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>{priceLvl}</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && <span className="badge">{SUBCAT_BADGE[it.subcat]}</span>}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
          </div>

          {/* Google Places info (read-only) */}
          {googleAddress && <div className="detail-address">{googleAddress}</div>}
          {googlePhone && <div className="detail-address">{googlePhone}</div>}
          {googleHours && (
            <details className="detail-hours"><summary>Opening hours</summary>
              <ul>{googleHours.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </details>
          )}

          {/* ═══ EDITABLE FIELDS ═══ */}
          <div className="edit-section-title" style={{ marginTop: 12 }}>Details</div>

          {/* Name */}
          <label className="edit-label">Name</label>
          <input className="edit-input" defaultValue={it.name || ''} onBlur={e => saveField('name', e.target.value)} />

          {/* Type + Stops */}
          <div className="edit-row-2">
            <div><label className="edit-label">Type</label>
              <select className="edit-input" defaultValue={it.type || 'food'} onChange={e => saveField('type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div></div>
          </div>

          {/* Stops multi-select */}
          <label className="edit-label">Stops</label>
          <StopChips stops={stops} stopIds={it.stop_ids || []} onSave={ids => saveField('stop_ids', ids)} />

          {/* Description */}
          <label className="edit-label">Description</label>
          <textarea className="edit-textarea" defaultValue={it.description || ''} onBlur={e => saveField('description', e.target.value)} rows={2} />

          {/* ═══ TYPE-SPECIFIC FIELDS ═══ */}
          {it.type === 'food' && (
            <>
              <label className="edit-label">What to order</label>
              <input className="edit-input" defaultValue={it.dish || ''} onBlur={e => saveField('dish', e.target.value)} placeholder="Signature dish" />
              <label className="edit-label">Category</label>
              <select className="edit-input" defaultValue={it.subcat || ''} onChange={e => saveField('subcat', e.target.value)}>
                {SUBCAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </>
          )}

          {it.type === 'stay' && (
            <>
              <div className="edit-row-2">
                <div><label className="edit-label">Tier</label>
                  <select className="edit-input" defaultValue={it.tier || ''} onChange={e => saveField('tier', e.target.value)}>
                    {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div></div>
              </div>
              {it.highlights && <ul className="detail-tips">{it.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
            </>
          )}

          {it.type === 'transport' && (
            <>
              <div className="edit-row-2">
                <div><label className="edit-label">Mode</label>
                  <select className="edit-input" defaultValue={it.transport_mode || ''} onChange={e => {
                    saveField('transport_mode', e.target.value);
                    if (e.target.value === 'rental') saveField('is_rental', true);
                    else if (it.is_rental) saveField('is_rental', false);
                  }}>
                    <option value="">Select...</option>
                    {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div><label className="edit-label">Rental</label>
                  <button className={`fp ${it.is_rental ? 'fp-urgent-active' : 'fp-urgent'}`} onClick={() => saveField('is_rental', !it.is_rental)} style={{ width: '100%' }}>
                    {it.is_rental ? 'Yes — booking' : 'No — route'}
                  </button>
                </div>
              </div>
              <PlaceSearch label="Origin" value={it.origin_name ? { name: it.origin_name, lat: it.origin_lat, lng: it.origin_lng } : null} onChange={saveOrigin} stops={stops} placeholder="Airport, station, city..." />
              <PlaceSearch label="Destination" value={it.dest_name ? { name: it.dest_name, lat: it.dest_lat, lng: it.dest_lng } : null} onChange={saveDest} stops={stops} placeholder="Airport, station, city..." />
              {it.options?.map((opt, i) => (
                <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                  <div className="transport-option-info"><span className="transport-option-name">{opt.name}</span>{opt.detail && <span className="transport-option-detail">{opt.detail}</span>}</div>
                  <span className="transport-option-price">{opt.price}</span>
                </a>
              ))}
            </>
          )}

          {it.type === 'activity' && (
            <>
              <div className="edit-row-2">
                <div><label className="edit-label">Duration (hours)</label>
                  <input className="edit-input" defaultValue={it.hrs ? String(it.hrs) : ''} onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) saveField('hrs', v); }} type="number" step="0.5" placeholder="2" />
                </div>
                <div></div>
              </div>
              {it.whatToExpect && (
                <details className="detail-section detail-collapsible"><summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>What to expect</summary>
                  <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
            </>
          )}

          {/* Food-specific read-only content */}
          {it.type === 'food' && it.quote && (
            <blockquote className="detail-quote">"{it.quote}"{it.quoteSource && <cite>— {it.quoteSource}</cite>}</blockquote>
          )}
          {it.type === 'food' && (it.whatToExpect || it.proTips) && (
            <details className="detail-section detail-collapsible"><summary className="detail-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>More details</summary>
              {it.whatToExpect && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.whatToExpect.map((w, i) => <li key={i}>{w}</li>)}</ul>}
              {it.proTips && <ul className="detail-tips" style={{ marginTop: 6 }}>{it.proTips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
            </details>
          )}

          {/* Schedule — all types */}
          <div className="edit-section-title">Schedule</div>
          <div className="edit-row-2">
            <div><label className="edit-label">Start</label>
              <input className="edit-input" defaultValue={it.start_time || ''} onBlur={e => saveField('start_time', e.target.value || null)} type="datetime-local" />
            </div>
            <div><label className="edit-label">End</label>
              <input className="edit-input" defaultValue={it.end_time || ''} onBlur={e => saveField('end_time', e.target.value || null)} type="datetime-local" />
            </div>
          </div>

          {/* Pricing */}
          <div className="edit-section-title">Pricing</div>
          <div className="detail-price-display">
            {it.estimated_cost > 0 && (
              <div className="detail-est-price"><span>Estimate: {$f(it.estimated_cost)}</span></div>
            )}
            {livePrice > 0 && it.type === 'stay' && (
              <div className="detail-live-price">
                <span className="detail-live-label">Live price</span>
                <span className="detail-live-value">{$f(livePrice)}/night</span>
              </div>
            )}
          </div>
          <label className="edit-label">Confirmed cost (paid)</label>
          <div className="cost-input-row" style={{ margin: 0 }}>
            <span className="cost-input-prefix">$</span>
            <input type="number" className="cost-input" style={{ fontSize: 13 }} placeholder="0" value={paidInput} onChange={e => setPaidInput(e.target.value)} onBlur={handlePaidBlur} />
          </div>

          {/* Stay: booking rates */}
          {it.type === 'stay' && livePriceRates && livePriceRates.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Book — live prices per night</div>
              {livePriceRates.map((rate, i) => (
                <a key={i} href={getBookingUrl(rate.source, it.name, it.city)} target="_blank" rel="noopener" className="transport-option">
                  <div className="transport-option-info"><span className="transport-option-name">{rate.source}</span><span className="transport-option-detail">Per night incl. tax</span></div>
                  <span className="transport-option-price">{$f(rate.per_night)}</span>
                </a>
              ))}
            </div>
          )}
          {it.type === 'stay' && !livePriceRates?.length && it.options?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Compare & Book</div>
              {it.options.map((opt, i) => (
                <a key={i} href={opt.url} target="_blank" rel="noopener" className="transport-option">
                  <div className="transport-option-info"><span className="transport-option-name">{opt.name}</span>{opt.detail && <span className="transport-option-detail">{opt.detail}</span>}</div>
                  <span className="transport-option-price">{opt.price}</span>
                </a>
              ))}
            </div>
          )}

          {/* Links & Source */}
          <div className="edit-section-title">Links</div>
          <label className="edit-label">Link</label>
          <input className="edit-input" defaultValue={it.link || ''} onBlur={e => saveField('link', e.target.value)} placeholder="https://..." type="url" />
          {it.link && (
            <a href={it.link} target="_blank" rel="noopener" className="detail-book-link" style={{ marginTop: 4 }}>
              {faviconUrl && <img src={faviconUrl} alt="" className="detail-favicon" />}<span>Book / Reserve</span>
            </a>
          )}
          <label className="edit-label">Source</label>
          <input className="edit-input" defaultValue={it.src || ''} onBlur={e => saveField('src', e.target.value)} placeholder="Where you found this" />
          <label className="edit-label">Reservation note</label>
          <input className="edit-input" defaultValue={it.reserve_note || ''} onBlur={e => saveField('reserve_note', e.target.value)} placeholder="e.g. Book 2 weeks ahead" />

          {/* Notes */}
          <div className="edit-section-title">Notes</div>
          <textarea className="edit-textarea" defaultValue={it.notes || ''} onBlur={e => saveField('notes', e.target.value)} rows={2} placeholder="Any notes..." />

          {/* Files */}
          {itemFiles.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Attachments ({itemFiles.length})</div>
              {itemFiles.map((f, i) => (
                <div key={i} className="file-chip" style={{ marginBottom: 4 }}>
                  <span className="file-chip-name">{f.name}</span>
                  <a href={f.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#1967d2' }}>Open</a>
                  <button onClick={() => handleRemoveFile(f.path)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
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
        </div>

        {onDelete && (
          <div style={{ padding: '0 16px 16px' }}>
            <button className="detail-btn-delete" onClick={() => { if (confirm('Delete this item permanently? This cannot be undone.')) onDelete(); }}>Delete permanently</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Stop chips sub-component with local state for immediate UI feedback
function StopChips({ stops, stopIds, onSave }) {
  const [ids, setIds] = useState(stopIds);
  useEffect(() => { setIds(stopIds); }, [stopIds]);
  function toggle(stopId) {
    const next = ids.includes(stopId) ? ids.filter(id => id !== stopId) : [...ids, stopId];
    setIds(next);
    onSave(next);
  }
  return (
    <div className="edit-stop-chips">
      {(stops || []).map(s => (
        <button key={s.id} className={`stop-chip ${ids.includes(s.id) ? 'stop-chip-active' : ''}`} onClick={() => toggle(s.id)}>
          {ids.includes(s.id) ? '✓ ' : ''}{s.name}
        </button>
      ))}
    </div>
  );
}
