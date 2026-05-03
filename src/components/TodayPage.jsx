import { useState, useEffect, useRef, useMemo } from 'react';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { $f, itemCost } from '../lib/useItems';
import DetailModal from './DetailModal';

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };

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

function getDaysUntilTrip(stops) {
  if (!stops.length) return 0;
  return Math.ceil((new Date(stops[0].start_date) - new Date()) / 86400000);
}

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

    // Stay/home marker — always visible, distinct from numbered items
    const cm = new window.google.maps.Marker({ position: { lat: day.lat, lng: day.lng }, map: m, title: `Stay: ${day.sleep}`,
      label: { text: 'H', color: '#fff', fontSize: '11px', fontWeight: '700' },
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#7C3AED', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
      zIndex: 1000,
    });
    markersRef.current.push(cm);

    if (day.drive_from) {
      const path = [day.drive_from, ...(day.drive_via || []), { lat: day.lat, lng: day.lng }];
      polylinesRef.current.push(new window.google.maps.Polyline({ path, geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.8, strokeWeight: 3, map: m }));
      bounds.extend(day.drive_from);
      if (day.drive_via) day.drive_via.forEach(v => bounds.extend(v));
      hasExtra = true;
    }

    // Item markers — numbered in time order, color-coded by type
    const TYPE_MAP_COLOR = { stay: '#7C3AED', dining: '#D97706', special: '#D97706', activity: '#16A34A', transport: '#2563EB' };
    const withCoords = mapItems.filter(it => it.coord);
    withCoords.forEach((it, idx) => {
      const color = TYPE_MAP_COLOR[it.type] || '#666';
      const marker = new window.google.maps.Marker({ position: it.coord, map: m, title: `${idx + 1}. ${it.name}`,
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
      <div className="map-legend">
        <span><span className="ml-dot" style={{ background: '#7C3AED' }} /> Stay</span>
        <span><span className="ml-dot" style={{ background: '#16A34A' }} /> Activity</span>
        <span><span className="ml-dot" style={{ background: '#D97706' }} /> Food</span>
      </div>
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

// Derive destination stats from stops + items (no hardcoded data)
function getStopStats(stop, items) {
  const stopItems = items.filter(it => it.stop_id === stop.id);
  const cityItems = items.filter(it => it.city === stop.city);
  const allItems = [...new Map([...stopItems, ...cityItems].map(it => [it.id, it])).values()];
  const stays = allItems.filter(it => it.type === 'stay');
  const transports = allItems.filter(it => it.type === 'transport');
  const activities = allItems.filter(it => it.type === 'activity');
  const food = allItems.filter(it => it.type === 'dining' || it.type === 'special');
  const stayBooked = stays.some(it => it.status === 'conf');
  const staySelected = stays.some(it => it.status === 'sel' || it.status === 'conf');
  const transportBooked = transports.length === 0 || transports.every(it => it.status === 'conf');
  const transportSelected = transports.some(it => it.status === 'sel' || it.status === 'conf');
  const actSelected = activities.filter(it => it.status === 'sel' || it.status === 'conf').length;
  const foodSelected = food.filter(it => it.status === 'sel' || it.status === 'conf').length;
  const hasStays = stays.length > 0;
  let status = 'ready';
  if ((hasStays && !stayBooked) || (transports.length > 0 && !transportBooked)) status = 'critical';
  else if (actSelected === 0 && activities.length > 0) status = 'warning';
  return { stayBooked, staySelected, transportBooked, transportSelected, hasTransport: transports.length > 0, actSelected, actTotal: activities.length, foodSelected, foodTotal: food.length, status, hasStays };
}

// ═══ OVERVIEW ═══
function OverviewView({ items, stops, expenses, onItemTap, visible, onDaySelect }) {
  const daysLeft = getDaysUntilTrip(stops);
  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    items.forEach(it => {
      if (it.status === 'sel' || it.status === 'conf') {
        selected++; estimated += itemCost(it);
        if (it.status === 'conf') {
          booked++;
          const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
          confirmed += exp > 0 ? exp : itemCost(it);
        }
      }
    });
    return { selected, booked, estimated, confirmed };
  }, [items, expenses]);
  const pct = stats.selected ? Math.round((stats.booked / stats.selected) * 100) : 0;
  const needsAttention = useMemo(() => items.filter(it => it.status === 'sel' && it.urgent), [items]);
  const recentItems = useMemo(() => items.filter(it => it.status && it.updated_by).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8), [items]);

  return (
    <>
      {daysLeft > 0 && (
        <div className="home-header">
          <div className="home-trip-name">{stops[0]?.sleep} to {stops[stops.length - 1]?.sleep}</div>
          <div className="home-countdown">{daysLeft} days away</div>
        </div>
      )}
      <div className="home-stats">
        <div className="home-stat"><div className="home-stat-num">{stats.booked}</div><div className="home-stat-label">Booked</div></div>
        <div className="home-stat"><div className="home-stat-num">{stats.selected - stats.booked}</div><div className="home-stat-label">To book</div></div>
        <div className="home-stat"><div className="home-stat-num">{$f(stats.estimated)}</div><div className="home-stat-label">Estimated</div></div>
        {stats.confirmed > 0 && <div className="home-stat"><div className="home-stat-num" style={{ color: 'var(--green)' }}>{$f(stats.confirmed)}</div><div className="home-stat-label">Confirmed</div></div>}
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
        {stops.map((stop, idx) => {
          const ss = getStopStats(stop, items);
          const nights = stop.start_date && stop.end_date ? Math.round((new Date(stop.end_date) - new Date(stop.start_date)) / 86400000) : (stop.nights || 1);
          return (
            <div key={stop.id} className={`home-dest-card home-dest-${ss.status}`} onClick={() => onDaySelect(idx)}>
              <div className="home-dest-top">
                <div><div className="home-dest-name">{stop.sleep || stop.city}</div><div className="home-dest-dates">{formatStopDate(stop)}{nights > 1 ? ` · ${nights}n` : ''}</div></div>
                <div className="home-dest-indicator">
                  {ss.status === 'ready' && <span className="home-flag ready">✓</span>}
                  {ss.status === 'critical' && <span className="home-flag critical">!</span>}
                  {ss.status === 'warning' && <span className="home-flag warning">—</span>}
                </div>
              </div>
              <div className="home-dest-statuses">
                {ss.hasStays && <span className={`home-dest-status ${ss.stayBooked ? 'booked' : ss.staySelected ? 'selected' : 'missing'}`}>{ss.stayBooked ? '✓' : ss.staySelected ? '●' : '!'} Stay</span>}
                {ss.hasTransport && <span className={`home-dest-status ${ss.transportBooked ? 'booked' : ss.transportSelected ? 'selected' : 'missing'}`}>{ss.transportBooked ? '✓' : ss.transportSelected ? '●' : '!'} Transport</span>}
                {ss.actTotal > 0 && <span className={`home-dest-status ${ss.actSelected > 0 ? 'selected' : ''}`}>{ss.actSelected}/{ss.actTotal} Activities</span>}
                {ss.foodTotal > 0 && <span className={`home-dest-status ${ss.foodSelected > 0 ? 'selected' : ''}`}>{ss.foodSelected}/{ss.foodTotal} Food</span>}
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
    return items.filter(it => it.stop_id === day.id && it.type !== 'transport')
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
    const fromSchedule = items.filter(it => it.stop_id === day.id && it.type !== 'transport' && !fromCity.some(c => c.id === it.id));
    return [...fromCity, ...fromSchedule];
  }, [items, day.city, day.n]);

  const stay = cityItems.find(it => it.type === 'stay' && (it.status === 'sel' || it.status === 'conf'));
  const stayCoord = stay?.coord || null;
  const stayPlace = stay ? places?.[stay.id] : null;
  const nights = day.start_date && day.end_date ? Math.round((new Date(day.end_date) - new Date(day.start_date)) / 86400000) : (day.nights || 1);
  const tips = day.tips?.length > 0 ? day.tips : null;

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

// Generate calendar dates from stops
function getCalendarDates(stops) {
  if (!stops.length) return [];
  const start = new Date(stops[0].start_date);
  const end = new Date(stops[stops.length - 1].end_date);
  const dates = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    // Find which stop this date falls in
    const stop = stops.find(s => dateStr >= s.start_date && dateStr < s.end_date);
    dates.push({
      date: dateStr,
      label: `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`,
      shortLabel: `${months[d.getMonth()]} ${d.getDate()}`,
      stop,
      stopIdx: stop ? stops.indexOf(stop) : -1,
    });
  }
  return dates;
}

// ═══ MAIN ═══
export default function TodayPage({ active, items, stops, livePrices, expenses, updateItem, setStatus, addExpense, files, setFile, removeFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectorMode, setSelectorMode] = useState('stops'); // 'stops' | 'dates'
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  const [view, setView] = useState(isDuringTrip ? todayIdx : 'overview');
  const selectorRef = useRef(null);

  const calendarDates = useMemo(() => getCalendarDates(stops), [stops]);

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const sel = selectorRef.current.querySelector('[data-active="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view, selectorMode]);

  // Find today's calendar date index
  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      {/* Mode toggle */}
      <div className="itin-mode-toggle">
        <button className={`fp ${selectorMode === 'stops' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('stops')}>Stops</button>
        <button className={`fp ${selectorMode === 'dates' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('dates')}>Dates</button>
      </div>

      {/* Selector pills */}
      <div className="today-selector" ref={selectorRef}>
        <button className={`today-sel-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && view !== todayIdx && <button className="today-sel-pill today-pill-accent" onClick={() => setView(todayIdx)}>Today</button>}

        {selectorMode === 'stops' ? (
          stops.map((d, i) => (
            <button key={d.id} data-active={view === i ? 'true' : 'false'} className={`today-sel-pill today-sel-pill-stop ${view === i ? 'active' : ''} ${i === todayIdx ? 'is-today' : ''}`} onClick={() => setView(i)} style={{ borderLeftColor: PHASE_COLOR[d.phase] }}>
              <span className="pill-stop-name">{d.sleep}</span>
              <span className="pill-stop-date">{formatStopDate(d)}</span>
            </button>
          ))
        ) : (
          calendarDates.map(cd => (
            <button key={cd.date} data-active={cd.stopIdx === view ? 'true' : 'false'} className={`today-sel-pill ${cd.stopIdx === view ? 'active' : ''} ${cd.date === todayDateStr ? 'is-today' : ''}`} onClick={() => cd.stopIdx >= 0 && setView(cd.stopIdx)} style={{ opacity: cd.stopIdx >= 0 ? 1 : 0.4 }}>
              <span className="pill-stop-name">{cd.shortLabel}</span>
              <span className="pill-stop-date" style={{ fontSize: 9 }}>{cd.stop?.sleep || ''}</span>
            </button>
          ))
        )}
      </div>

      {view !== 'overview' && <StatusFilter value={statusFilter} onChange={setStatusFilter} />}

      {view === 'overview' ? (
        <OverviewView items={items} stops={stops} expenses={expenses} onItemTap={setSelectedItem} visible={active && view === 'overview'} onDaySelect={setView} />
      ) : (
        <DayDetailView day={stops[view]} items={items} onItemTap={setSelectedItem} places={places} visible={active && view !== 'overview'} statusFilter={statusFilter} />
      )}

      {selectedItem && (() => {
        const exp = (expenses || []).filter(e => e.item_id === selectedItem.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal
          it={selectedItem} status={selectedItem.status || ''} setStatus={setStatus}
          updateItem={updateItem}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight}
          livePriceRates={livePrices?.[selectedItem.id]?.allRates}
          expenseAmount={exp} addExpense={addExpense}
          onClose={() => setSelectedItem(null)}
        />;
      })()}
    </div>
  );
}
