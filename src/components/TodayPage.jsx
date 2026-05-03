import { useState, useEffect, useRef, useMemo } from 'react';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { TRIP } from '../data/trip';
import { $f, itemCost } from '../lib/useItems';
import DetailModal from './DetailModal';

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };
const PHASE_LABEL = { spain: 'Spain', rome: 'Rome', roadtrip: 'Road Trip', venice: 'Venice' };

const DAY_TIPS = {
  'Spain': ['Tipping: not expected, round up or leave loose change', 'Tapas crawl: order 1-2 plates per bar, then move on', 'Siesta hours (2-5pm): many shops close'],
  'Rome': ['Cover knees + shoulders for churches — they WILL turn you away', 'Free water: Rome has ~2,500 nasoni drinking fountains', 'Bus 64 to Vatican is a pickpocket hotspot — walk or take a taxi'],
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

function getTodayDayIndex(stops) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < stops.length; i++) {
    const start = new Date(stops[i].start_date);
    const end = new Date(stops[i].end_date);
    if (today >= start && today < end) return i;
  }
  return null;
}

function getDaysUntilTrip() { return Math.ceil((new Date(TRIP.startDate) - new Date()) / 86400000); }

function formatStopDate(stop) {
  if (!stop.start_date) return '';
  const s = new Date(stop.start_date);
  const e = new Date(stop.end_date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sm = months[s.getUTCMonth()];
  const sd = s.getUTCDate();
  const ed = e.getUTCDate();
  if (s.getUTCMonth() === e.getUTCMonth() && sd !== ed) return `${sm} ${sd}–${ed}`;
  if (s.getUTCMonth() !== e.getUTCMonth()) return `${sm} ${sd} – ${months[e.getUTCMonth()]} ${ed}`;
  return `${sm} ${sd}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps);
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => { if (window.google?.maps) { setReady(true); clearInterval(interval); } }, 300);
    return () => clearInterval(interval);
  }, [ready]);
  return ready;
}

const directionsCache = {};

function DayMap({ day, mapItems, visible }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const prevKey = useRef(null);
  const mapsReady = useGoogleMapsReady();

  const key = `${day.n}-${mapItems.map(e => e.id).join(',')}`;
  const coords = mapItems.filter(it => it.coord).map(it => it.coord);
  const mapsRouteUrl = coords.length > 1
    ? `https://www.google.com/maps/dir/${coords.map(c => `${c.lat},${c.lng}`).join('/')}`
    : coords.length === 1 ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0].lat},${coords[0].lng}` : null;

  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || !day.lat) return;
    if (prevKey.current !== key) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach(p => { if (p.setMap) p.setMap(null); else if (p.setDirections) p.setDirections({ routes: [] }); });
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

    const cm = new window.google.maps.Marker({ position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: PHASE_COLOR[day.phase], fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    markersRef.current.push(cm);

    if (day.drive_from) {
      const path = [day.drive_from, ...(day.drive_via || []), { lat: day.lat, lng: day.lng }];
      polylinesRef.current.push(new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.8, strokeWeight: 3, map: m }));
      bounds.extend(day.drive_from);
      if (day.drive_via) day.drive_via.forEach(v => bounds.extend(v));
      hasExtra = true;
    }

    const withCoords = mapItems.filter(it => it.coord);
    withCoords.forEach((it, idx) => {
      const color = it.type === 'stay' ? '#7C3AED' : it.type === 'dining' || it.type === 'special' ? '#D97706' : '#16A34A';
      const marker = new window.google.maps.Marker({ position: it.coord, map: m, title: it.name,
        label: { text: String(idx + 1), color: '#fff', fontSize: '10px', fontWeight: '700' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      markersRef.current.push(marker);
      bounds.extend(it.coord);
      hasExtra = true;
    });

    if (withCoords.length >= 2) {
      const routeKey = withCoords.map(e => `${e.coord.lat},${e.coord.lng}`).join('|');
      const renderDirections = (result) => {
        polylinesRef.current.push(new window.google.maps.DirectionsRenderer({
          map: m, directions: result, suppressMarkers: true,
          polylineOptions: { strokeColor: '#7C3AED', strokeOpacity: 0.7, strokeWeight: 3 },
        }));
      };
      if (directionsCache[routeKey]) { renderDirections(directionsCache[routeKey]); }
      else {
        const ds = new window.google.maps.DirectionsService();
        ds.route({
          origin: withCoords[0].coord, destination: withCoords[withCoords.length - 1].coord,
          waypoints: withCoords.slice(1, -1).map(e => ({ location: e.coord, stopover: true })).slice(0, 8),
          travelMode: window.google.maps.TravelMode.DRIVING, optimizeWaypoints: false,
        }, (result, status) => { if (status === 'OK') { directionsCache[routeKey] = result; renderDirections(result); } });
      }
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
      {mapsRouteUrl && <a href={mapsRouteUrl} target="_blank" rel="noopener" className="itin-maps-btn">Open in Google Maps</a>}
    </div>
  );
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
    ROUTE_LINES.forEach(seg => new window.google.maps.Polyline({ path: seg.path, geodesic: true, strokeColor: seg.color, strokeOpacity: seg.dash ? 0 : 0.7, strokeWeight: seg.w, icons: seg.dash ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '14px' }] : [], map: m }));
    ROUTE_STOPS.forEach(s => new window.google.maps.Marker({ position: { lat: s.lat, lng: s.lng }, map: m, title: s.label, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: s.big ? 6 : 4, fillColor: s.color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 } }));
    mapInstance.current = m;
  }, [visible, mapsReady]);
  return <div ref={mapRef} className="map-wrap" style={{ height: 200, marginBottom: 12 }}></div>;
}

function StatusFilter({ value, onChange }) {
  return (
    <div className="itin-filter">
      {[{ value: 'all', label: 'All' }, { value: 'sel', label: 'Selected' }, { value: 'conf', label: 'Confirmed' }].map(o => (
        <button key={o.value} className={`fp ${value === o.value ? 'fp-active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ═══ DESTINATIONS ═══
const DESTINATIONS = [
  { name: 'Madrid', cities: ['Spain'], dates: 'Jul 12-14', nights: 2, phase: 'spain', needsStay: false, needsTransport: false },
  { name: 'Menorca', cities: ['Spain'], dates: 'Jul 14-18', nights: 4, phase: 'spain', needsStay: false, transportIds: ['tr1a'] },
  { name: 'Malaga', cities: ['Spain'], dates: 'Jul 18-20', nights: 2, phase: 'spain', needsStay: true, transportIds: ['tr2'] },
  { name: 'Rome', cities: ['Rome'], dates: 'Jul 20-24', nights: 4, phase: 'rome', needsStay: true, transportIds: ['tr3'] },
  { name: 'Florence', cities: ['Florence'], dates: 'Jul 24-25', nights: 2, phase: 'roadtrip', needsStay: true, transportIds: ['tr4', 'tr5'] },
  { name: 'Montepulciano', cities: ['Montepulciano', 'Tuscany'], dates: 'Jul 25-26', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: "Val d'Orcia", cities: ["Val d'Orcia"], dates: 'Jul 26-27', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Lerici', cities: ['Lerici'], dates: 'Jul 27-28', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Bergamo', cities: ['Bergamo Alta'], dates: 'Jul 28-29', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Bellagio', cities: ['Bellagio'], dates: 'Jul 29-30', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Sirmione', cities: ['Sirmione'], dates: 'Jul 30-31', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Verona', cities: ['Verona'], dates: 'Jul 31', nights: 1, phase: 'roadtrip', needsStay: true },
  { name: 'Venice', cities: ['Venice'], dates: 'Aug 1-2', nights: 1, phase: 'venice', needsStay: true, transportIds: ['tr6'] },
];

function getDestStats(dest, items) {
  const cityItems = items.filter(it => dest.cities.includes(it.city));
  const stays = cityItems.filter(it => it.type === 'stay');
  const stayBooked = stays.some(it => it.status === 'conf');
  const staySelected = stays.some(it => it.status === 'sel' || it.status === 'conf');
  let transportBooked = true, transportSelected = true;
  if (dest.transportIds) {
    transportBooked = dest.transportIds.every(id => { const it = items.find(i => i.id === id); return it?.status === 'conf'; });
    transportSelected = dest.transportIds.some(id => { const it = items.find(i => i.id === id); return it?.status === 'sel' || it?.status === 'conf'; });
  } else if (dest.needsTransport === false) { transportBooked = true; transportSelected = true; }
  const activities = cityItems.filter(it => it.type === 'activity');
  const dining = cityItems.filter(it => it.type === 'dining' || it.type === 'special');
  const actSelected = activities.filter(it => it.status === 'sel' || it.status === 'conf').length;
  const diningSelected = dining.filter(it => it.status === 'sel' || it.status === 'conf').length;
  let status = 'ready';
  if (!(dest.needsStay === false || stayBooked) || !transportBooked) status = 'critical';
  else if (actSelected === 0 && activities.length > 0) status = 'warning';
  return { stayBooked, staySelected, transportBooked, transportSelected, actSelected, actTotal: activities.length, diningSelected, diningTotal: dining.length, status, needsStay: dest.needsStay !== false };
}

// ═══ OVERVIEW ═══
function OverviewView({ items, onItemTap, visible, onDaySelect }) {
  const daysLeft = getDaysUntilTrip();
  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    items.forEach(it => {
      if (it.status === 'sel' || it.status === 'conf') {
        selected++; estimated += itemCost(it);
        if (it.status === 'conf') { booked++; confirmed += it.paid_price || itemCost(it); }
      }
    });
    return { selected, booked, estimated, confirmed };
  }, [items]);
  const pct = stats.selected ? Math.round((stats.booked / stats.selected) * 100) : 0;
  const needsAttention = useMemo(() => items.filter(it => it.status === 'sel' && it.urgent), [items]);
  const recentItems = useMemo(() => items.filter(it => it.status && it.updated_by).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8), [items]);

  return (
    <>
      {daysLeft > 0 && (
        <div className="home-header">
          <div className="home-trip-name">{TRIP.name}</div>
          <div className="home-countdown">{daysLeft} days away</div>
        </div>
      )}
      <div className="home-stats">
        <div className="home-stat"><div className="home-stat-num">{stats.booked}</div><div className="home-stat-label">Booked</div></div>
        <div className="home-stat"><div className="home-stat-num">{stats.selected - stats.booked}</div><div className="home-stat-label">To book</div></div>
        <div className="home-stat"><div className="home-stat-num">{$f(stats.estimated)}</div><div className="home-stat-label">Estimated</div></div>
      </div>

      {needsAttention.length > 0 && (
        <div className="home-alerts">
          <div className="home-alerts-title"><span className="home-alerts-badge">{needsAttention.length}</span> Needs attention</div>
          {needsAttention.slice(0, 5).map(it => (
            <div key={it.id} className="home-alert-item" onClick={() => onItemTap(it)}><span className="home-alert-name">{it.name}</span><span className="home-alert-arrow">→</span></div>
          ))}
        </div>
      )}

      {recentItems.length > 0 && (
        <div className="itin-recent">
          <div className="itin-section-title">Recent activity</div>
          {recentItems.map(r => (
            <div key={r.id} className="itin-recent-row">
              <span className="itin-recent-who">{(r.updated_by || '').split('@')[0]}</span>
              <span className="itin-recent-action">{r.status === 'conf' ? 'booked' : r.status === 'sel' ? 'added' : 'updated'}</span>
              <span className="itin-recent-name">{r.name}</span>
              <span className="itin-recent-time">{formatRelativeTime(r.updated_at)}</span>
            </div>
          ))}
        </div>
      )}

      <RouteMap visible={visible} />

      <div className="home-section-title">Your destinations</div>
      <div className="home-destinations">
        {DESTINATIONS.map(dest => {
          const dstats = getDestStats(dest, items);
          const dayIdx = stops.findIndex(d => dest.cities.includes(d.city));
          return (
            <div key={dest.name} className={`home-dest-card home-dest-${dstats.status}`} onClick={() => dayIdx >= 0 && onDaySelect(dayIdx)}>
              <div className="home-dest-top">
                <div><div className="home-dest-name">{dest.name}</div><div className="home-dest-dates">{dest.dates} · {dest.nights}n</div></div>
                <div className="home-dest-indicator">
                  {dstats.status === 'ready' && <span className="home-flag ready">✓</span>}
                  {dstats.status === 'critical' && <span className="home-flag critical">!</span>}
                  {dstats.status === 'warning' && <span className="home-flag warning">—</span>}
                </div>
              </div>
              <div className="home-dest-statuses">
                {dstats.needsStay && <span className={`home-dest-status ${dstats.stayBooked ? 'booked' : dstats.staySelected ? 'selected' : 'missing'}`}>{dstats.stayBooked ? '✓' : dstats.staySelected ? '●' : '!'} Stay</span>}
                {dest.transportIds && <span className={`home-dest-status ${dstats.transportBooked ? 'booked' : dstats.transportSelected ? 'selected' : 'missing'}`}>{dstats.transportBooked ? '✓' : dstats.transportSelected ? '●' : '!'} Transport</span>}
                {dstats.actTotal > 0 && <span className={`home-dest-status ${dstats.actSelected > 0 ? 'selected' : ''}`}>{dstats.actSelected}/{dstats.actTotal} Activities</span>}
                {dstats.diningTotal > 0 && <span className={`home-dest-status ${dstats.diningSelected > 0 ? 'selected' : ''}`}>{dstats.diningSelected}/{dstats.diningTotal} Dining</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══ DAY DETAIL ═══
function DayDetailView({ day, items, onItemTap, places, visible, statusFilter }) {
  const scheduled = useMemo(() => {
    return items.filter(it => it.day_n === day.n && it.type !== 'transport')
      .filter(it => {
        if (statusFilter === 'all') return it.status === 'sel' || it.status === 'conf';
        if (statusFilter === 'sel') return it.status === 'sel';
        if (statusFilter === 'conf') return it.status === 'conf';
        return it.status === 'sel' || it.status === 'conf';
      })
      .sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz') || (a.sort_order || 0) - (b.sort_order || 0));
  }, [items, day.n, statusFilter]);

  const cityItems = useMemo(() => {
    const scheduledIds = new Set(scheduled.map(it => it.id));
    const fromCity = items.filter(it => {
      if (it.type === 'transport') return false;
      if (it.city === day.city) return true;
      if (day.city === 'Montepulciano' && it.city === 'Tuscany') return true;
      return false;
    });
    // Also include items scheduled for this day but from other cities
    const fromSchedule = items.filter(it => it.day_n === day.n && it.type !== 'transport' && !fromCity.some(c => c.id === it.id));
    return [...fromCity, ...fromSchedule];
  }, [items, day.city, day.n]);

  const stay = cityItems.find(it => it.type === 'stay' && (it.status === 'sel' || it.status === 'conf'));
  const stayCoord = stay ? ITEM_COORDS[stay.id] || stay.coord : null;
  const stayPlace = stay ? places?.[stay.id] : null;
  const nights = day.start_date && day.end_date ? Math.round((new Date(day.end_date) - new Date(day.start_date)) / 86400000) : (day.nights || 1);
  const tips = DAY_TIPS[day.city] || null;

  const planItems = useMemo(() => {
    return cityItems.filter(it => {
      if (it.type === 'transport') return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'sel') return it.status === 'sel';
      if (statusFilter === 'conf') return it.status === 'conf';
      return true;
    });
  }, [cityItems, statusFilter]);

  return (
    <>
      {/* General details */}
      <div className="itin-general">
        <div className="itin-general-row"><span className="itin-general-label">Dates</span><span>{formatStopDate(day)}{nights > 1 ? ` (${nights} nights)` : ''}</span></div>
        {stay && (
          <>
            <div className="itin-general-row"><span className="itin-general-label">Stay</span><span>{stay.name}</span></div>
            {(stayPlace?.address || stay.address) && <div className="itin-general-row"><span className="itin-general-label">Address</span><span>{stayPlace?.address || stay.address}</span></div>}
            {stayCoord && <div className="itin-general-row"><span className="itin-general-label">Directions</span><a href={`https://www.google.com/maps/dir/?api=1&destination=${stayCoord.lat},${stayCoord.lng}`} target="_blank" rel="noopener" className="itin-link">Google Maps</a></div>}
            {stayPlace?.phone && <div className="itin-general-row"><span className="itin-general-label">Contact</span><a href={`tel:${stayPlace.phone}`} className="itin-link">{stayPlace.phone}</a></div>}
            {(stay.check_in || stay.check_out) && <div className="itin-general-row"><span className="itin-general-label">Check-in/out</span><span>{stay.check_in && `In ${stay.check_in}`}{stay.check_in && stay.check_out && ' · '}{stay.check_out && `Out ${stay.check_out}`}</span></div>}
          </>
        )}
      </div>

      {/* Map */}
      <DayMap day={day} mapItems={scheduled} visible={visible} />

      {/* Schedule */}
      <div className="itin-section-title">Schedule</div>
      {scheduled.length > 0 ? (
        <div className="itin-schedule">
          {scheduled.map(it => (
            <div key={it.id} className={`itin-sched-row ${it.status}`} onClick={() => onItemTap(it)}>
              <div className="itin-sched-time">
                {it.start_time ? formatTime(it.start_time) : ''}
                {it.end_time && <span className="itin-sched-end">{formatTime(it.end_time)}</span>}
              </div>
              <div className="itin-sched-dot-col"><div className={`itin-sched-dot ${it.status}`} /><div className="itin-sched-line" /></div>
              <div className="itin-sched-info">
                <div className="itin-sched-name">{it.name}</div>
                <div className="itin-sched-sub">{it.dish ? it.dish : it.hrs ? `${it.hrs}h` : it.city}</div>
              </div>
              <div className="itin-sched-actions">
                {it.status === 'conf' && <span className="itin-sched-check">Booked</span>}
                {it.coord && <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.coord.lat},${it.coord.lng}`} target="_blank" rel="noopener" className="itin-action-sm" onClick={e => e.stopPropagation()}>Go</a>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="itin-empty"><div className="itin-empty-text">No items scheduled. Add items from the Plan tab.</div></div>
      )}

      {/* Travel tips */}
      {tips && (
        <details className="today-section">
          <summary className="today-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>Travel tips</summary>
          <ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      {/* Plan cards */}
      {planItems.length > 0 && (
        <div className="itin-plan-section">
          <div className="itin-section-title">Plan ({planItems.length})</div>
          {planItems.map(it => (
            <div key={it.id} className={`item-card-compact ${it.status === 'conf' ? 'confirmed' : it.status === 'sel' ? 'selected' : ''}`} onClick={() => onItemTap(it)}>
              <div className="icc-left">
                <div className="icc-name">{it.name}</div>
                <div className="icc-sub">{it.dish || (it.hrs ? `${it.hrs}h` : it.city)}</div>
              </div>
              <div className="icc-right">
                <div className={`icc-status ${it.status}`}>{it.status === 'conf' ? 'Booked' : it.status === 'sel' ? 'Added' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══ MAIN ═══
export default function TodayPage({ active, items, stops, updateItem, setStatus, files, setFile, removeFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  const [view, setView] = useState(isDuringTrip ? todayIdx : 'overview');
  const selectorRef = useRef(null);

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const btn = selectorRef.current.querySelector(`[data-day="${view}"]`);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view]);

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      <div className="today-selector" ref={selectorRef}>
        <button className={`today-sel-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && view !== todayIdx && <button className="today-sel-pill today-pill-accent" onClick={() => setView(todayIdx)}>Today</button>}
        {stops.map((d, i) => (
          <button key={d.n} data-day={i} className={`today-sel-pill today-sel-pill-stop ${view === i ? 'active' : ''} ${i === todayIdx ? 'is-today' : ''}`} onClick={() => setView(i)} style={{ borderLeftColor: PHASE_COLOR[d.phase] }}>
            <span className="pill-stop-name">{d.sleep}</span>
            <span className="pill-stop-date">{formatStopDate(d)}</span>
          </button>
        ))}
      </div>

      {view !== 'overview' && <StatusFilter value={statusFilter} onChange={setStatusFilter} />}

      {view === 'overview' ? (
        <OverviewView items={items} onItemTap={setSelectedItem} visible={active && view === 'overview'} onDaySelect={setView} />
      ) : (
        <DayDetailView day={stops[view]} items={items} onItemTap={setSelectedItem} places={places} visible={active && view !== 'overview'} statusFilter={statusFilter} />
      )}

      {selectedItem && (
        <DetailModal
          it={selectedItem} status={selectedItem.status || ''} setStatus={setStatus}
          updateItem={updateItem}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
