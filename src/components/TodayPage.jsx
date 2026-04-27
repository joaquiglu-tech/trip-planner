import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL, $f, usd, itemCost } from '../data/items';
import { ITEM_COORDS } from '../data/coords';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { TRIP } from '../data/trip';
import DetailModal from './DetailModal';

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };
const PHASE_LABEL = { spain: 'Spain', rome: 'Rome', roadtrip: 'Road Trip', venice: 'Venice' };
const TYPE_ICON = { stay: '🏨', activity: '🎟️', special: '⭐', dining: '🍝' };

const DAY_TIPS = {
  'Spain': ['Tipping: not expected, round up or leave loose change', 'Tapas crawl: order 1-2 plates per bar, then move on', 'Siesta hours (2-5pm): many shops close'],
  'Rome': ['Cover knees + shoulders for churches — they WILL turn you away', 'Free water: Rome has ~2,500 nasoni drinking fountains', 'Bus 64 to Vatican is a pickpocket hotspot — walk or take a taxi', 'Avoid restaurants near the Colosseum with picture menus in 5 languages'],
  'Florence': ['Friendship bracelet scam near Duomo — keep hands in pockets', 'Trattoria Mario is cash only, lunch only', 'Uffizi: book 8:15am slot, done by 11am'],
  'Montepulciano': ['Park OUTSIDE the walls — ZTL cameras will fine you $100-300', 'Wine cellars are walk-in, no appointment needed'],
  "Val d'Orcia": ['Drive to Podere Il Casale SOBER first thing, then drink all day', 'Stop in Pienza: free pecorino tastings'],
  'Lerici': ['Skip Cinque Terre in July (overcrowded)', 'Walk to Tellaro — one of Italy\'s most beautiful villages'],
  'Bergamo Alta': ['Take the funicular up, don\'t drive', 'Park OUTSIDE the walls — ZTL enforced'],
  'Bellagio': ['Tour buses arrive 10am, leave 5pm — go early or late', 'Buy the ferry day pass, not single tickets'],
  'Sirmione': ['Walk to Grotte di Catullo at the tip — almost nobody goes', 'Park OUTSIDE medieval walls'],
  'Verona': ['Park at Parcheggio Arena — OUTSIDE ZTL', 'Valpolicella wine region is 20min away'],
  'Venice': ['Venice entry fee does NOT apply after Jul 26', 'No eating/drinking while sitting on monuments — fine', 'Gondola: agree on price BEFORE boarding ($80/30min)'],
};

function getSelectedForCity(city, S) {
  return ITEMS.filter((it) => {
    if (it.type === 'transport') return false;
    const st = S[it.id] || '';
    if (st !== 'sel' && st !== 'conf') return false;
    if (it.city === city) return true;
    if (city === 'Montepulciano' && it.city === 'Tuscany') return true;
    return false;
  });
}

function getTodayDayIndex() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < ALL_DAYS.length; i++) {
    const start = new Date(ALL_DAYS[i].startDate);
    const end = new Date(ALL_DAYS[i].endDate);
    if (today >= start && today < end) return i;
  }
  return null;
}

function getDaysUntilTrip() {
  return Math.ceil((new Date(TRIP.startDate) - new Date()) / 86400000);
}

// ═══ MAP ═══
function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps);
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => { if (window.google?.maps) { setReady(true); clearInterval(interval); } }, 300);
    return () => clearInterval(interval);
  }, [ready]);
  return ready;
}

function DayMap({ day, selections, visible }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const prevKey = useRef(null);
  const mapsReady = useGoogleMapsReady();
  const key = `${day.n}-${selections.map(s => s.id).join(',')}`;

  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || !day.lat) return;
    if (prevKey.current !== key) { markersRef.current.forEach(m => m.setMap(null)); markersRef.current = []; mapInstance.current = null; prevKey.current = key; }
    if (mapInstance.current) { window.google.maps.event.trigger(mapInstance.current, 'resize'); return; }

    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: day.lat, lng: day.lng }, zoom: day.zoom || 14,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP, streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
    });
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: day.lat, lng: day.lng });
    let hasExtra = false;

    // Center marker
    const cm = new window.google.maps.Marker({ position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: PHASE_COLOR[day.phase], fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    markersRef.current.push(cm);

    // Drive route
    if (day.driveFrom) {
      const path = [day.driveFrom, ...(day.driveVia || []), { lat: day.lat, lng: day.lng }];
      new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.8, strokeWeight: 3, map: m });
      bounds.extend(day.driveFrom);
      if (day.driveVia) day.driveVia.forEach(v => bounds.extend(v));
      hasExtra = true;
    }

    // Selection markers
    selections.forEach((it) => {
      const coord = ITEM_COORDS[it.id];
      if (!coord) return;
      const color = it.type === 'stay' ? '#7C3AED' : it.type === 'dining' || it.type === 'special' ? '#D97706' : '#16A34A';
      const marker = new window.google.maps.Marker({ position: coord, map: m, title: it.name,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      markersRef.current.push(marker);
      bounds.extend(coord);
      hasExtra = true;
    });

    if (hasExtra) {
      m.fitBounds(bounds, 40);
      const listener = window.google.maps.event.addListener(m, 'idle', () => { if (m.getZoom() > 16) m.setZoom(16); window.google.maps.event.removeListener(listener); });
    }
    mapInstance.current = m;
  }, [visible, key, mapsReady]);

  if (!day.lat) return null;
  return <div ref={mapRef} className="map-wrap" style={{ height: 220 }}></div>;
}

function RouteMap({ visible }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapsReady = useGoogleMapsReady();

  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || mapInstance.current) return;
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: 44.0, lng: 11.0 }, zoom: 6,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP, streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    ROUTE_LINES.forEach((seg) => {
      new window.google.maps.Polyline({ path: seg.path, geodesic: true, strokeColor: seg.color,
        strokeOpacity: seg.dash ? 0 : 0.7, strokeWeight: seg.w,
        icons: seg.dash ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '14px' }] : [], map: m });
    });
    ROUTE_STOPS.forEach((s) => {
      new window.google.maps.Marker({ position: { lat: s.lat, lng: s.lng }, map: m, title: s.label,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: s.big ? 6 : 4, fillColor: s.color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 } });
    });
    mapInstance.current = m;
  }, [visible, mapsReady]);

  return <div ref={mapRef} className="map-wrap" style={{ height: 200, marginBottom: 12 }}></div>;
}

// ═══ DRIVE TIME ═══
function DriveInfo({ day }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!day.driveFrom) return;
    import('../lib/googlePlaces').then(({ fetchDriveTime }) => {
      fetchDriveTime(day.driveFrom.lat, day.driveFrom.lng, day.lat, day.lng).then((r) => { if (r) setInfo(r); });
    });
  }, [day.n]);
  if (!day.driveFrom || !info) return null;
  return <div className="drive-info-bar"><span>🚗</span><span>{info.durationText}</span><span className="drive-info-dist">{info.distanceKm} km</span></div>;
}

// ═══ OVERVIEW VIEW ═══
function OverviewView({ S, paidPrices, onItemTap, visible }) {
  const daysLeft = getDaysUntilTrip();
  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    const needsAttention = [];
    ITEMS.forEach((it) => {
      const st = S[it.id] || '';
      if (st === 'sel' || st === 'conf') {
        selected++; estimated += itemCost(it);
        if (st === 'conf') { booked++; confirmed += paidPrices[it.id] || itemCost(it); }
        if (st === 'sel' && it.urgent) needsAttention.push(it);
      }
    });
    return { selected, booked, estimated, confirmed, needsAttention };
  }, [S, paidPrices]);
  const pct = stats.selected ? Math.round((stats.booked / stats.selected) * 100) : 0;
  const phases = ['spain', 'rome', 'roadtrip', 'venice'];

  return (
    <>
      {daysLeft > 0 && (
        <div className="today-countdown">
          <div className="today-countdown-num">{daysLeft}</div>
          <div className="today-countdown-label">days until your trip</div>
        </div>
      )}

      <div className="today-progress-card">
        <div className="today-progress-ring">
          <svg viewBox="0 0 36 36" className="today-ring-svg">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--green)" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
          </svg>
          <span className="today-ring-text">{pct}%</span>
        </div>
        <div className="today-progress-info">
          <div className="today-progress-title">{stats.booked} of {stats.selected} booked</div>
          <div className="today-progress-sub">Est: {$f(stats.estimated)} · Confirmed: {$f(stats.confirmed)}</div>
        </div>
      </div>

      {stats.needsAttention.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Needs attention</div>
          {stats.needsAttention.map((it) => (
            <div key={it.id} className="today-attention-item" onClick={() => onItemTap(it)}>
              <span className="today-attention-badge">Book now</span>
              <span className="today-attention-name">{it.name}</span>
              <span className="today-attention-arrow">→</span>
            </div>
          ))}
        </div>
      )}

      <RouteMap visible={visible} />

      {phases.map((phase) => {
        const days = ALL_DAYS.filter((d) => d.phase === phase);
        return (
          <div key={phase}>
            <div className="phase-header" style={{ borderLeftColor: PHASE_COLOR[phase] }}>{PHASE_LABEL[phase]} · {days.length} days</div>
            {days.map((day) => {
              const sels = getSelectedForCity(day.city, S);
              return (
                <div key={day.n} className="full-trip-day">
                  <div className="ftd-left">
                    <div className="ftd-date">{day.date}</div>
                    <div className="ftd-title">{day.title}</div>
                    <div className="ftd-sleep">Sleep: {day.sleep}</div>
                  </div>
                  {sels.length > 0 && (
                    <div className="ftd-badges">
                      {sels.slice(0, 3).map(it => (
                        <span key={it.id} className={`ftd-badge ${S[it.id] === 'conf' ? 'conf' : 'sel'}`}>{TYPE_ICON[it.type]} {it.name.length > 10 ? it.name.slice(0, 10) + '..' : it.name}</span>
                      ))}
                      {sels.length > 3 && <span className="ftd-badge">+{sels.length - 3}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ═══ DAY DETAIL VIEW ═══
function DayDetailView({ day, S, paidPrices, onItemTap, places, visible }) {
  const selections = useMemo(() => getSelectedForCity(day.city, S), [day.city, S]);
  const stay = selections.find((it) => it.type === 'stay');
  const activities = selections.filter((it) => it.type === 'activity');
  const dining = selections.filter((it) => it.type === 'dining' || it.type === 'special');
  const tips = DAY_TIPS[day.city] || null;

  return (
    <>
      <DayMap day={day} selections={selections} visible={visible} />
      <DriveInfo day={day} />

      <div className="today-day-header">
        <div className="today-day-badge" style={{ background: PHASE_COLOR[day.phase] }}>Day {day.n}</div>
        <div>
          <div className="today-day-date">{day.date}</div>
          <div className="today-day-title">{day.title}</div>
        </div>
      </div>

      {stay && (
        <div className="today-stay-card" onClick={() => onItemTap(stay)}>
          <div className="today-stay-label">Where you're sleeping</div>
          <div className="today-stay-name">{stay.name}</div>
          {stay.address && <div className="today-stay-address">{stay.address}</div>}
          <div className="today-stay-actions">
            {ITEM_COORDS[stay.id] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[stay.id].lat},${ITEM_COORDS[stay.id].lng}`} target="_blank" rel="noopener" className="today-action-btn" onClick={(e) => e.stopPropagation()}>Directions</a>}
            {places?.[stay.id]?.phone && <a href={`tel:${places[stay.id].phone}`} className="today-action-btn" onClick={(e) => e.stopPropagation()}>Call</a>}
          </div>
          <div className={`today-stay-status ${S[stay.id] === 'conf' ? 'booked' : ''}`}>{S[stay.id] === 'conf' ? '✓ Booked' : 'Not booked yet'}</div>
        </div>
      )}

      <div className="today-section">
        <div className="today-section-title">Plan</div>
        {day.plan.map((p, i) => (
          <div key={i} className="today-plan-step"><span className="today-step-num">{i + 1}</span><span>{p}</span></div>
        ))}
      </div>

      {activities.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Activities</div>
          {activities.map((it) => (
            <div key={it.id} className="today-item" onClick={() => onItemTap(it)}>
              <span className="today-item-icon">{TYPE_ICON[it.type]}</span>
              <div className="today-item-info"><div className="today-item-name">{it.name}</div>{it.hrs && <div className="today-item-sub">{it.hrs}h</div>}</div>
              <div className="today-item-actions">
                {ITEM_COORDS[it.id] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[it.id].lat},${ITEM_COORDS[it.id].lng}`} target="_blank" rel="noopener" className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>🧭</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {dining.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Eat & Drink</div>
          {dining.map((it) => (
            <div key={it.id} className="today-item" onClick={() => onItemTap(it)}>
              <span className="today-item-icon">{TYPE_ICON[it.type]}</span>
              <div className="today-item-info"><div className="today-item-name">{it.name}</div>{it.dish && <div className="today-item-sub">{it.dish}</div>}</div>
              <div className="today-item-actions">
                {places?.[it.id]?.phone && <a href={`tel:${places[it.id].phone}`} className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>📞</a>}
                {ITEM_COORDS[it.id] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[it.id].lat},${ITEM_COORDS[it.id].lng}`} target="_blank" rel="noopener" className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>🧭</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {day.eat.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Also recommended</div>
          {day.eat.map((e, i) => <div key={i} className="eat-line">{e}</div>)}
        </div>
      )}

      {tips && (
        <details className="today-section" style={{ cursor: 'pointer' }}>
          <summary className="today-section-title" style={{ listStyle: 'none' }}>💡 Travel tips</summary>
          <ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      {selections.length === 0 && !stay && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Nothing planned yet</div>
          <div className="empty-state-text">Go to the Plan tab to pick stays, restaurants, and activities for {day.city}.</div>
        </div>
      )}

      {day.lat && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <a href={`https://www.google.com/maps/@${day.lat},${day.lng},${day.zoom || 14}z`} target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>Open in Maps</a>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${day.lat},${day.lng}`} target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1, background: 'var(--accent)' }}>Directions</a>
        </div>
      )}
    </>
  );
}

// ═══ MAIN EXPORT ═══
export default function TodayPage({ active, S, setStatus, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const todayIdx = getTodayDayIndex();
  const isDuringTrip = todayIdx !== null;

  // View: 'overview' or day index (0-16)
  const [view, setView] = useState(isDuringTrip ? todayIdx : 'overview');
  const selectorRef = useRef(null);

  // Auto-scroll to active pill
  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const btn = selectorRef.current.querySelector(`[data-day="${view}"]`);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view]);

  // Phase groupings for the selector
  const phases = ['spain', 'rome', 'roadtrip', 'venice'];

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      {/* Day selector strip */}
      <div className="today-selector" ref={selectorRef}>
        <button className={`today-sel-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && view !== todayIdx && (
          <button className="today-sel-pill today-pill-accent" onClick={() => setView(todayIdx)}>Today</button>
        )}
        {phases.map((phase) => {
          const days = ALL_DAYS.filter(d => d.phase === phase);
          return (
            <span key={phase} className="today-sel-group">
              <span className="today-sel-divider" style={{ background: PHASE_COLOR[phase] }} />
              {days.map(d => (
                <button key={d.n} data-day={d.n - 1} className={`today-sel-pill ${view === d.n - 1 ? 'active' : ''} ${d.n - 1 === todayIdx ? 'is-today' : ''}`} onClick={() => setView(d.n - 1)}>
                  {d.n}
                </button>
              ))}
            </span>
          );
        })}
      </div>

      {/* Content */}
      {view === 'overview' ? (
        <OverviewView S={S} paidPrices={paidPrices} onItemTap={setSelectedItem} visible={active && view === 'overview'} />
      ) : (
        <DayDetailView day={ALL_DAYS[view]} S={S} paidPrices={paidPrices} onItemTap={setSelectedItem} places={places} visible={active && view !== 'overview'} />
      )}

      {selectedItem && (
        <DetailModal
          it={selectedItem} status={S[selectedItem.id] || ''} setStatus={setStatus}
          paidPrice={paidPrices?.[selectedItem.id]} setPaidPrice={setPaidPrice}
          note={notes?.[selectedItem.id]} setNote={setNote}
          existingFile={files?.[selectedItem.id]} onFileChange={setFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
