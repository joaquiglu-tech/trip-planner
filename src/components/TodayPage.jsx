import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL, $f, usd, itemCost } from '../data/items';
import { ITEM_COORDS } from '../data/coords';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { TRIP } from '../data/trip';
import { useSchedule } from '../lib/useSchedule';
import DetailModal from './DetailModal';

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };
const PHASE_LABEL = { spain: 'Spain', rome: 'Rome', roadtrip: 'Road Trip', venice: 'Venice' };
const TYPE_ICON = { stay: 'Stay', activity: 'Activity', special: 'Special', dining: 'Dining', transport: 'Transport' };

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

function getItemById(id) { return ITEMS.find(it => it.id === id); }

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

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

// ═══ GOOGLE MAPS READY HOOK ═══
function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps);
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => { if (window.google?.maps) { setReady(true); clearInterval(interval); } }, 300);
    return () => clearInterval(interval);
  }, [ready]);
  return ready;
}

// ═══ DAY MAP WITH ROUTES ═══
function DayMap({ day, scheduleEntries, S, visible }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const prevKey = useRef(null);
  const mapsReady = useGoogleMapsReady();

  // Build list of items with coords, in time order
  const mapItems = useMemo(() => {
    return scheduleEntries
      .map(entry => ({ ...entry, item: getItemById(entry.item_id), coord: ITEM_COORDS[entry.item_id] }))
      .filter(e => e.coord && e.item);
  }, [scheduleEntries]);

  const key = `${day.n}-${mapItems.map(e => e.item_id).join(',')}`;

  // Build multi-stop Google Maps directions URL
  const coords = mapItems.map(e => e.coord);
  const mapsRouteUrl = coords.length > 1
    ? `https://www.google.com/maps/dir/${coords.map(c => `${c.lat},${c.lng}`).join('/')}`
    : coords.length === 1 ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0].lat},${coords[0].lng}` : null;

  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || !day.lat) return;
    if (prevKey.current !== key) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
      mapInstance.current = null;
      prevKey.current = key;
    }
    if (mapInstance.current) { window.google.maps.event.trigger(mapInstance.current, 'resize'); return; }

    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: day.lat, lng: day.lng }, zoom: day.zoom || 14,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP, streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
    });
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: day.lat, lng: day.lng });
    let hasExtra = false;

    // Center marker (accommodation)
    const cm = new window.google.maps.Marker({ position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: PHASE_COLOR[day.phase], fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    markersRef.current.push(cm);

    // Drive route into city
    if (day.driveFrom) {
      const path = [day.driveFrom, ...(day.driveVia || []), { lat: day.lat, lng: day.lng }];
      const pl = new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.8, strokeWeight: 3, map: m });
      polylinesRef.current.push(pl);
      bounds.extend(day.driveFrom);
      if (day.driveVia) day.driveVia.forEach(v => bounds.extend(v));
      hasExtra = true;
    }

    // Selection markers with numbered labels
    mapItems.forEach((entry, idx) => {
      const color = entry.item.type === 'stay' ? '#7C3AED' : entry.item.type === 'dining' || entry.item.type === 'special' ? '#D97706' : '#16A34A';
      const marker = new window.google.maps.Marker({ position: entry.coord, map: m, title: entry.item.name,
        label: { text: String(idx + 1), color: '#fff', fontSize: '10px', fontWeight: '700' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      markersRef.current.push(marker);
      bounds.extend(entry.coord);
      hasExtra = true;
    });

    // Draw route polylines between sequential items using Directions API
    if (mapItems.length >= 2) {
      const ds = new window.google.maps.DirectionsService();
      const waypoints = mapItems.slice(1, -1).map(e => ({ location: e.coord, stopover: true }));
      ds.route({
        origin: mapItems[0].coord,
        destination: mapItems[mapItems.length - 1].coord,
        waypoints: waypoints.slice(0, 8), // max 8 waypoints for free tier
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      }, (result, status) => {
        if (status === 'OK') {
          const dr = new window.google.maps.DirectionsRenderer({
            map: m, directions: result, suppressMarkers: true,
            polylineOptions: { strokeColor: '#7C3AED', strokeOpacity: 0.7, strokeWeight: 3 },
          });
          polylinesRef.current.push(dr);
        }
      });
    }

    if (hasExtra) {
      m.fitBounds(bounds, 40);
      const listener = window.google.maps.event.addListener(m, 'idle', () => { if (m.getZoom() > 16) m.setZoom(16); window.google.maps.event.removeListener(listener); });
    }
    mapInstance.current = m;
  }, [visible, key, mapsReady]);

  if (!day.lat) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div ref={mapRef} className="map-wrap" style={{ height: 240 }}></div>
      {mapsRouteUrl && (
        <a href={mapsRouteUrl} target="_blank" rel="noopener" className="itin-maps-btn">
          Open in Google Maps
        </a>
      )}
    </div>
  );
}

// ═══ ROUTE MAP (OVERVIEW) ═══
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

// ═══ DRIVE INFO ═══
function DriveInfo({ day }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!day.driveFrom) return;
    import('../lib/googlePlaces').then(({ fetchDriveTime }) => {
      fetchDriveTime(day.driveFrom.lat, day.driveFrom.lng, day.lat, day.lng).then((r) => { if (r) setInfo(r); });
    });
  }, [day.n]);
  if (!day.driveFrom || !info) return null;
  return <div className="drive-info-bar"><span>Drive</span><span>{info.durationText}</span><span className="drive-info-dist">{info.distanceKm} km</span></div>;
}

// ═══ STATUS FILTER PILLS ═══
function StatusFilter({ value, onChange }) {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'sel', label: 'Selected' },
    { value: 'conf', label: 'Confirmed' },
  ];
  return (
    <div className="itin-filter">
      {options.map(o => (
        <button key={o.value} className={`fp ${value === o.value ? 'fp-active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ═══ GENERAL DETAILS SECTION ═══
function GeneralDetails({ day, stay, places }) {
  const nights = day.startDate && day.endDate ? Math.round((new Date(day.endDate) - new Date(day.startDate)) / 86400000) : 1;
  const stayCoord = stay ? ITEM_COORDS[stay.id] : null;
  const stayPlace = stay ? places?.[stay.id] : null;

  return (
    <div className="itin-general">
      <div className="itin-general-row">
        <span className="itin-general-label">Dates</span>
        <span>{day.date}{nights > 1 ? ` (${nights} nights)` : ''}</span>
      </div>
      {stay && (
        <>
          <div className="itin-general-row">
            <span className="itin-general-label">Stay</span>
            <span>{stay.name}</span>
          </div>
          {(stayPlace?.address || stay.address) && (
            <div className="itin-general-row">
              <span className="itin-general-label">Address</span>
              <span>{stayPlace?.address || stay.address}</span>
            </div>
          )}
          {stayCoord && (
            <div className="itin-general-row">
              <span className="itin-general-label">Directions</span>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${stayCoord.lat},${stayCoord.lng}`} target="_blank" rel="noopener" className="itin-link">Google Maps</a>
            </div>
          )}
          {stayPlace?.phone && (
            <div className="itin-general-row">
              <span className="itin-general-label">Contact</span>
              <a href={`tel:${stayPlace.phone}`} className="itin-link">{stayPlace.phone}</a>
            </div>
          )}
          {(stay.checkIn || stay.checkOut) && (
            <div className="itin-general-row">
              <span className="itin-general-label">Check-in/out</span>
              <span>{stay.checkIn && `In ${stay.checkIn}`}{stay.checkIn && stay.checkOut && ' · '}{stay.checkOut && `Out ${stay.checkOut}`}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══ SCHEDULE TIMELINE ═══
function ScheduleTimeline({ entries, S, onItemTap, places }) {
  if (entries.length === 0) return (
    <div className="itin-empty">
      <div className="itin-empty-text">No items scheduled. Add items from the Plan tab.</div>
    </div>
  );

  return (
    <div className="itin-schedule">
      {entries.map((entry) => {
        const item = getItemById(entry.item_id);
        if (!item) return null;
        const st = S[entry.item_id] || '';
        const coord = ITEM_COORDS[entry.item_id];
        return (
          <div key={entry.id} className={`itin-sched-row ${st}`} onClick={() => onItemTap(item)}>
            <div className="itin-sched-time">
              {entry.start_time ? formatTime(entry.start_time) : ''}
              {entry.end_time && <span className="itin-sched-end">{formatTime(entry.end_time)}</span>}
            </div>
            <div className="itin-sched-dot-col">
              <div className={`itin-sched-dot ${st}`} />
              <div className="itin-sched-line" />
            </div>
            <div className="itin-sched-info">
              <div className="itin-sched-name">{item.name}</div>
              <div className="itin-sched-sub">
                {TYPE_ICON[item.type] || ''}{item.dish ? ` · ${item.dish}` : item.hrs ? ` · ${item.hrs}h` : ''}
              </div>
            </div>
            <div className="itin-sched-actions">
              {st === 'conf' && <span className="itin-sched-check">Booked</span>}
              {coord && <a href={`https://www.google.com/maps/dir/?api=1&destination=${coord.lat},${coord.lng}`} target="_blank" rel="noopener" className="itin-action-sm" onClick={(e) => e.stopPropagation()}>Go</a>}
              {places?.[entry.item_id]?.phone && <a href={`tel:${places[entry.item_id].phone}`} className="itin-action-sm" onClick={(e) => e.stopPropagation()}>Call</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ PLAN CARDS (previously "Your selections") ═══
function PlanCards({ day, S, allItems, statusFilter, onItemTap }) {
  const items = useMemo(() => {
    return allItems.filter(it => {
      if (it.type === 'transport') return false;
      const st = S[it.id] || '';
      if (statusFilter === 'all') return true; // show all items for this city
      if (statusFilter === 'sel') return st === 'sel';
      if (statusFilter === 'conf') return st === 'conf';
      return true;
    });
  }, [allItems, S, statusFilter]);

  if (items.length === 0) return null;

  return (
    <div className="itin-plan-section">
      <div className="itin-section-title">Plan ({items.length})</div>
      {items.map(it => {
        const st = S[it.id] || '';
        return (
          <div key={it.id} className={`item-card-compact ${st === 'conf' ? 'confirmed' : st === 'sel' ? 'selected' : ''}`} onClick={() => onItemTap(it)}>
            <div className="icc-left">
              <div className="icc-name">{it.name}</div>
              <div className="icc-sub">{it.dish || (it.hrs ? `${it.hrs}h` : it.city)}</div>
            </div>
            <div className="icc-right">
              <div className={`icc-status ${st}`}>{st === 'conf' ? 'Booked' : st === 'sel' ? 'Added' : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ OVERVIEW VIEW ═══
function OverviewView({ S, paidPrices, onItemTap, visible }) {
  const daysLeft = getDaysUntilTrip();
  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    ITEMS.forEach((it) => {
      const st = S[it.id] || '';
      if (st === 'sel' || st === 'conf') {
        selected++; estimated += itemCost(it);
        if (st === 'conf') { booked++; confirmed += paidPrices[it.id] || itemCost(it); }
      }
    });
    return { selected, booked, estimated, confirmed };
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

      <RouteMap visible={visible} />

      {phases.map((phase) => {
        const days = ALL_DAYS.filter((d) => d.phase === phase);
        return (
          <div key={phase}>
            <div className="phase-header" style={{ borderLeftColor: PHASE_COLOR[phase] }}>{PHASE_LABEL[phase]} · {days.length} days</div>
            {days.map((day) => {
              const sels = ITEMS.filter(it => {
                if (it.type === 'transport') return false;
                const st = S[it.id] || '';
                if (st !== 'sel' && st !== 'conf') return false;
                if (it.city === day.city) return true;
                if (day.city === 'Montepulciano' && it.city === 'Tuscany') return true;
                return false;
              });
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
                        <span key={it.id} className={`ftd-badge ${S[it.id] === 'conf' ? 'conf' : 'sel'}`}>{it.name.length > 10 ? it.name.slice(0, 10) + '..' : it.name}</span>
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
function DayDetailView({ day, S, paidPrices, onItemTap, places, visible, scheduleEntries, statusFilter }) {
  // Get all items for this city
  const cityItems = useMemo(() => {
    return ITEMS.filter(it => {
      if (it.type === 'transport') return false;
      if (it.city === day.city) return true;
      if (day.city === 'Montepulciano' && it.city === 'Tuscany') return true;
      return false;
    });
  }, [day.city]);

  const stay = cityItems.find(it => it.type === 'stay' && (S[it.id] === 'sel' || S[it.id] === 'conf'));
  const tips = DAY_TIPS[day.city] || null;

  return (
    <>
      {/* 1. General details */}
      <GeneralDetails day={day} stay={stay} places={places} />

      {/* 2. Map with routes */}
      <DriveInfo day={day} />
      <DayMap day={day} scheduleEntries={scheduleEntries} S={S} visible={visible} />

      {/* 3. Schedule timeline */}
      <div className="itin-section-title">Schedule</div>
      <ScheduleTimeline entries={scheduleEntries} S={S} onItemTap={onItemTap} places={places} />

      {/* 4. Travel tips */}
      {tips && (
        <details className="today-section">
          <summary className="today-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>Travel tips</summary>
          <ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      {/* 5. Plan cards */}
      <PlanCards day={day} S={S} allItems={cityItems} statusFilter={statusFilter} onItemTap={onItemTap} />

      {cityItems.length === 0 && !stay && (
        <div className="empty-state">
          <div className="empty-state-icon">Plan</div>
          <div className="empty-state-title">Nothing planned yet</div>
          <div className="empty-state-text">Go to the Plan tab to pick stays, restaurants, and activities for {day.city}.</div>
        </div>
      )}
    </>
  );
}

// ═══ MAIN EXPORT ═══
export default function TodayPage({ active, S, setStatus, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { schedule, getForDay } = useSchedule();
  const todayIdx = getTodayDayIndex();
  const isDuringTrip = todayIdx !== null;

  const [view, setView] = useState(isDuringTrip ? todayIdx : 'overview');
  const selectorRef = useRef(null);

  // Get schedule entries for current day view, filtered by status
  const scheduleEntries = useMemo(() => {
    if (view === 'overview') return [];
    const day = ALL_DAYS[view];
    if (!day) return [];
    return getForDay(day.n, S, statusFilter);
  }, [view, S, statusFilter, getForDay, schedule]);

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const btn = selectorRef.current.querySelector(`[data-day="${view}"]`);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view]);

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      {/* Day selector strip */}
      <div className="today-selector" ref={selectorRef}>
        <button className={`today-sel-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && view !== todayIdx && (
          <button className="today-sel-pill today-pill-accent" onClick={() => setView(todayIdx)}>Today</button>
        )}
        {ALL_DAYS.map((d, i) => (
          <button key={d.n} data-day={i} className={`today-sel-pill today-sel-pill-stop ${view === i ? 'active' : ''} ${i === todayIdx ? 'is-today' : ''}`} onClick={() => setView(i)} style={{ borderLeftColor: PHASE_COLOR[d.phase] }}>
            <span className="pill-stop-name">{d.sleep}</span>
            <span className="pill-stop-date">{d.date}</span>
          </button>
        ))}
      </div>

      {/* Status filter — only shown on day views */}
      {view !== 'overview' && (
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      )}

      {/* Content */}
      {view === 'overview' ? (
        <OverviewView S={S} paidPrices={paidPrices} onItemTap={setSelectedItem} visible={active && view === 'overview'} />
      ) : (
        <DayDetailView
          day={ALL_DAYS[view]} S={S} paidPrices={paidPrices} onItemTap={setSelectedItem}
          places={places} visible={active && view !== 'overview'}
          scheduleEntries={scheduleEntries} statusFilter={statusFilter}
        />
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
