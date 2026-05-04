import { useState, useEffect, useRef, useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import DetailModal from '../../shared/components/DetailModal';

function getTodayDayIndex(stops) {
  const now = new Date();
  for (let i = 0; i < stops.length; i++) {
    if (now >= new Date(stops[i].start_date) && now < new Date(stops[i].end_date)) return i;
  }
  return null;
}

function getDaysUntilTrip(stops) {
  if (!stops.length) return 0;
  return Math.ceil((new Date(stops[0].start_date) - new Date()) / 86400000);
}

function formatStopDate(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [sy, smn, sdy] = sd.split('-').map(Number);
  const [ey, emn, edy] = ed.split('-').map(Number);
  const sm = months[smn - 1], em = months[emn - 1];
  if (smn === emn && sdy !== edy) return `${sm} ${sdy}–${edy}`;
  if (smn !== emn) return `${sm} ${sdy} – ${em} ${edy}`;
  return `${sm} ${sdy}`;
}

function calcNights(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd || !ed) return 1;
  const [sy, sm, sday] = sd.split('-').map(Number);
  const [ey, em, eday] = ed.split('-').map(Number);
  return Math.max(1, Math.round((new Date(ey, em - 1, eday) - new Date(sy, sm - 1, sday)) / 86400000));
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

const TYPE_LABEL_SHORT = { stay: 'Stay', food: 'Food', activity: 'Activity', transport: 'Transport' };

// ═══ SCHEDULE LIST — with date dividers for multi-day stops ═══
function ScheduleList({ items, stop, onItemTap }) {
  // Group items by date within this stop
  const nights = calcNights(stop);
  const startStr = toDateStr(stop.start_date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // For multi-day stops, create date labels
  const dateLabels = useMemo(() => {
    if (nights <= 1) return null;
    const labels = {};
    const [sy, sm, sd] = startStr.split('-').map(Number);
    for (let i = 0; i < nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels[ds] = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    }
    return labels;
  }, [nights, startStr]);

  // Assign items to dates (by sort_order or time, approximate)
  const groupedItems = useMemo(() => {
    if (!dateLabels || nights <= 1) return [{ label: null, items }];
    // Distribute items across days based on position in the list
    const perDay = Math.ceil(items.length / nights);
    const groups = [];
    const dateKeys = Object.keys(dateLabels);
    dateKeys.forEach((dk, dayIdx) => {
      const dayItems = items.slice(dayIdx * perDay, (dayIdx + 1) * perDay);
      if (dayItems.length > 0) groups.push({ label: dateLabels[dk], items: dayItems });
    });
    // Add any remaining items to the last group
    const assigned = groups.reduce((s, g) => s + g.items.length, 0);
    if (assigned < items.length && groups.length > 0) {
      groups[groups.length - 1].items.push(...items.slice(assigned));
    }
    return groups;
  }, [items, dateLabels, nights]);

  return (
    <div className="itin-schedule">
      {groupedItems.map((group, gi) => (
        <div key={gi}>
          {group.label && <div className="itin-sched-date">{group.label}</div>}
          {group.items.map(it => (
            <div key={it.id} className={`itin-sched-row ${it.status}`} onClick={() => onItemTap(it)}>
              <div className="itin-sched-time">
                {it.start_time ? formatTime(it.start_time) : ''}
                {it.end_time && <span className="itin-sched-end">{formatTime(it.end_time)}</span>}
              </div>
              <div className="itin-sched-dot-col"><div className={`itin-sched-dot ${it.status}`} /><div className="itin-sched-line" /></div>
              <div className="itin-sched-info">
                <div className="itin-sched-name">{it.name}</div>
                <div className="itin-sched-sub">{it.dish ? it.dish : it.hrs ? `${it.hrs}h` : ''}</div>
              </div>
              <div className="itin-sched-actions">
                {it.status === 'conf' && <span className="itin-sched-check">Booked</span>}
                {it.coord && <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.coord.lat},${it.coord.lng}`} target="_blank" rel="noopener" className="itin-action-sm" onClick={e => e.stopPropagation()}>Go</a>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══ PLAN SECTION — collapsible, filterable, with date/time/type on cards ═══
function PlanSection({ planItems, onItemTap }) {
  const [expanded, setExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(() => {
    const set = new Set(planItems.map(it => it.type));
    return ['all', ...Array.from(set)];
  }, [planItems]);

  const filtered = useMemo(() => {
    let items = typeFilter === 'all' ? planItems : planItems.filter(it => it.type === typeFilter);
    return items.sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz'));
  }, [planItems, typeFilter]);

  if (planItems.length === 0) return null;

  return (
    <details className="itin-plan-details" open={expanded} onToggle={e => setExpanded(e.target.open)}>
      <summary className="itin-plan-summary">Plan ({planItems.length})</summary>
      <div className="itin-plan-filters">
        {types.map(t => (
          <button key={t} className={`fp ${typeFilter === t ? 'fp-active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'All' : (TYPE_LABEL_SHORT[t] || t)}
          </button>
        ))}
      </div>
      <div className="itin-plan-list">
        {filtered.map(it => (
          <div key={it.id} className={`item-card-compact ${it.status === 'conf' ? 'confirmed' : it.status === 'sel' ? 'selected' : ''}`} onClick={() => onItemTap(it)}>
            <div className="icc-left">
              <div className="icc-name">{it.name}</div>
              <div className="icc-sub">
                <span className="icc-type-badge">{TYPE_LABEL_SHORT[it.type] || it.type}</span>
                {it.start_time && <span> · {formatTime(it.start_time)}</span>}
                {it.end_time && <span> – {formatTime(it.end_time)}</span>}
              </div>
            </div>
            <div className="icc-right">
              <div className={`icc-status ${it.status}`}>{it.status === 'conf' ? 'Booked' : it.status === 'sel' ? 'Added' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
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

// Check if an item belongs to a stop
function itemInStop(it, stopId) {
  return it.stop_ids?.includes(stopId) || false;
}

// Get stay for a stop (from items)
function getStay(items, stopId) {
  return items.find(it => it.type === 'stay' && itemInStop(it, stopId) && (it.status === 'sel' || it.status === 'conf'));
}

// ═══ DAY MAP ═══
function DayMap({ stop, mapItems, stayCoord, visible }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const prevKey = useRef(null);
  const mapsReady = useGoogleMapsReady();

  // Center on stay coord or first item coord
  const stopCoord = (stop.lat && stop.lng) ? { lat: Number(stop.lat), lng: Number(stop.lng) } : null;
  const center = stayCoord || stopCoord || (mapItems.find(it => it.coord)?.coord) || null;
  const key = `${stop.id}-${mapItems.map(e => e.id).join(',')}`;
  const coords = mapItems.filter(it => it.coord).map(it => it.coord);
  const mapsRouteUrl = coords.length > 1
    ? `https://www.google.com/maps/dir/${coords.map(c => `${c.lat},${c.lng}`).join('/')}`
    : coords.length === 1 ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0].lat},${coords[0].lng}` : null;

  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || !center) return;
    if (prevKey.current !== key) {
      markersRef.current.forEach(m => m.setMap(null)); markersRef.current = [];
      polylinesRef.current.forEach(p => { if (p.setMap) p.setMap(null); else if (p.setDirections) p.setDirections({ routes: [] }); }); polylinesRef.current = [];
      mapInstance.current = null; prevKey.current = key;
    }
    if (mapInstance.current) { window.google.maps.event.trigger(mapInstance.current, 'resize'); return; }

    const m = new window.google.maps.Map(mapRef.current, {
      center, zoom: 14, mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
    });
    const bounds = new window.google.maps.LatLngBounds();

    // Stay/home marker
    if (stayCoord) {
      const cm = new window.google.maps.Marker({ position: stayCoord, map: m, title: `Stay: ${stop.name}`,
        label: { text: 'H', color: '#fff', fontSize: '11px', fontWeight: '700' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#7C3AED', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }, zIndex: 1000 });
      markersRef.current.push(cm);
      bounds.extend(stayCoord);
    }

    // Item markers — numbered, color-coded by type
    const TYPE_MAP_COLOR = { stay: '#7C3AED', food: '#D97706', activity: '#16A34A', transport: '#2563EB' };
    const withCoords = mapItems.filter(it => it.coord);
    withCoords.forEach((it, idx) => {
      const color = TYPE_MAP_COLOR[it.type] || '#666';
      const marker = new window.google.maps.Marker({ position: it.coord, map: m, title: `${idx + 1}. ${it.name}`,
        label: { text: String(idx + 1), color: '#fff', fontSize: '10px', fontWeight: '700' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      markersRef.current.push(marker);
      bounds.extend(it.coord);
    });

    // Route between items
    if (withCoords.length >= 2) {
      const routeKey = withCoords.map(e => `${e.coord.lat},${e.coord.lng}`).join('|');
      const render = (result) => { polylinesRef.current.push(new window.google.maps.DirectionsRenderer({ map: m, directions: result, suppressMarkers: true, polylineOptions: { strokeColor: '#7C3AED', strokeOpacity: 0.7, strokeWeight: 3 } })); };
      if (directionsCache[routeKey]) { render(directionsCache[routeKey]); }
      else {
        new window.google.maps.DirectionsService().route({
          origin: withCoords[0].coord, destination: withCoords[withCoords.length - 1].coord,
          waypoints: withCoords.slice(1, -1).map(e => ({ location: e.coord, stopover: true })).slice(0, 8),
          travelMode: window.google.maps.TravelMode.DRIVING, optimizeWaypoints: false,
        }, (result, status) => { if (status === 'OK') { directionsCache[routeKey] = result; render(result); } });
      }
    }

    if (markersRef.current.length > 1 || withCoords.length > 0) m.fitBounds(bounds, 40);
    mapInstance.current = m;
  }, [visible, key, mapsReady]);

  if (!center) return null;
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

// ═══ OVERVIEW MAP — from items (stays) ═══
function RouteMap({ visible, stops, items }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapsReady = useGoogleMapsReady();
  useEffect(() => {
    if (!visible || !mapsReady || !mapRef.current || mapInstance.current) return;
    // Get coords for each stop — from stop itself, stay item, or any item
    const points = stops.map(s => {
      // 1. Stop has its own coords (from google_place_id)
      if (s.lat && s.lng) return { stop: s, coord: { lat: Number(s.lat), lng: Number(s.lng) } };
      // 2. From the selected stay
      const stay = getStay(items, s.id);
      if (stay?.coord) return { stop: s, coord: stay.coord };
      // 3. From any item in this stop
      const anyItem = items.find(it => itemInStop(it, s.id) && it.coord);
      if (anyItem?.coord) return { stop: s, coord: anyItem.coord };
      return { stop: s, coord: null };
    }).filter(p => p.coord);
    if (!points.length) return;
    const avgLat = points.reduce((s, p) => s + p.coord.lat, 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p.coord.lng, 0) / points.length;
    // Filter to trip stops only (exclude Lima departure/return to avoid world zoom)
    const tripPoints = points.filter(p => p.stop.name !== 'Lima');
    const mapPoints = tripPoints.length > 0 ? tripPoints : points;
    const cLat = mapPoints.reduce((s, p) => s + p.coord.lat, 0) / mapPoints.length;
    const cLng = mapPoints.reduce((s, p) => s + p.coord.lng, 0) / mapPoints.length;
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: cLat, lng: cLng }, zoom: 6, minZoom: 3, maxZoom: 15,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP, streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    const bounds = new window.google.maps.LatLngBounds();
    // Polyline connecting trip stops
    new window.google.maps.Polyline({ path: mapPoints.map(p => p.coord), geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.7, strokeWeight: 3, map: m });
    // Markers for all points (including Lima, but bounds only from trip)
    points.forEach(p => {
      const nights = calcNights(p.stop);
      const isTrip = p.stop.name !== 'Lima';
      new window.google.maps.Marker({ position: p.coord, map: m, title: p.stop.name,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: nights > 1 ? 6 : 4, fillColor: isTrip ? '#7C3AED' : '#78716C', fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 } });
      if (isTrip) bounds.extend(p.coord);
    });
    m.fitBounds(bounds, 30);
    mapInstance.current = m;
  }, [visible, mapsReady, stops, items]);
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

// ═══ STOP STATS (for overview destination cards) ═══
function getStopStats(stop, items) {
  const stopItems = items.filter(it => itemInStop(it, stop.id));
  const stays = stopItems.filter(it => it.type === 'stay');
  const transports = stopItems.filter(it => it.type === 'transport');
  const activities = stopItems.filter(it => it.type === 'activity');
  const food = stopItems.filter(it => it.type === 'food');
  const stayBooked = stays.some(it => it.status === 'conf');
  const staySelected = stays.some(it => it.status === 'sel' || it.status === 'conf');
  const transportBooked = transports.length === 0 || transports.every(it => it.status === 'conf');
  const actSelected = activities.filter(it => it.status === 'sel' || it.status === 'conf').length;
  const foodSelected = food.filter(it => it.status === 'sel' || it.status === 'conf').length;
  let status = 'ready';
  if ((stays.length > 0 && !stayBooked) || (transports.length > 0 && !transportBooked)) status = 'critical';
  else if (actSelected === 0 && activities.length > 0) status = 'warning';
  return { stayBooked, staySelected, hasTransport: transports.length > 0, transportBooked, actSelected, actTotal: activities.length, foodSelected, foodTotal: food.length, status, hasStays: stays.length > 0 };
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
          <div className="home-trip-name">{(() => {
            const tripStops = stops.filter(s => s.name !== 'Lima');
            return tripStops.length > 1 ? `${tripStops[0]?.name} to ${tripStops[tripStops.length - 1]?.name}` : (tripStops[0]?.name || 'Trip');
          })()}</div>
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

      <RouteMap visible={visible} stops={stops} items={items} />

      <div className="home-section-title">Your destinations</div>
      <div className="home-destinations">
        {stops.map((stop, idx) => {
          const ss = getStopStats(stop, items);
          const nights = calcNights(stop);
          const stay = getStay(items, stop.id);
          return (
            <div key={stop.id} className={`home-dest-card home-dest-${ss.status}`} onClick={() => onDaySelect(idx)}>
              <div className="home-dest-top">
                <div>
                  <div className="home-dest-name">{stop.name}</div>
                  <div className="home-dest-dates">{formatStopDate(stop)}{nights > 1 ? ` · ${nights}n` : ''}</div>
                </div>
                <div className="home-dest-indicator">
                  {ss.status === 'ready' && <span className="home-flag ready">✓</span>}
                  {ss.status === 'critical' && <span className="home-flag critical">!</span>}
                  {ss.status === 'warning' && <span className="home-flag warning">—</span>}
                </div>
              </div>
              <div className="home-dest-statuses">
                {ss.hasStays && <span className={`home-dest-status ${ss.stayBooked ? 'booked' : ss.staySelected ? 'selected' : 'missing'}`}>{ss.stayBooked ? '✓' : ss.staySelected ? '●' : '!'} {stay?.name || 'Stay'}</span>}
                {ss.hasTransport && <span className={`home-dest-status ${ss.transportBooked ? 'booked' : 'missing'}`}>{ss.transportBooked ? '✓' : '!'} Transport</span>}
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

// ═══ SINGLE STOP SECTION (reusable — shown once per stop) ═══
function StopSection({ stop, items, onItemTap, places, visible, statusFilter, updateStop, showTitle }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  function startEdit() {
    setDraft({
      name: stop.name || '',
      start_date: stop.start_date?.split('T')[0] || '',
      end_date: stop.end_date?.split('T')[0] || '',
    });
    setEditing(true);
  }

  function saveEdit() {
    const changes = {};
    if (draft.name !== (stop.name || '')) changes.name = draft.name;
    if (draft.start_date && draft.start_date !== stop.start_date?.split('T')[0]) changes.start_date = draft.start_date + 'T00:00:00Z';
    if (draft.end_date && draft.end_date !== stop.end_date?.split('T')[0]) changes.end_date = draft.end_date + 'T00:00:00Z';
    if (Object.keys(changes).length > 0 && updateStop) updateStop(stop.id, changes);
    setEditing(false);
  }

  const scheduled = useMemo(() => {
    return items.filter(it => itemInStop(it, stop.id) && it.type !== 'transport')
      .filter(it => {
        if (statusFilter === 'all') return it.status === 'sel' || it.status === 'conf';
        if (statusFilter === 'sel') return it.status === 'sel';
        if (statusFilter === 'conf') return it.status === 'conf';
        return it.status === 'sel' || it.status === 'conf';
      })
      .sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz') || (a.sort_order || 0) - (b.sort_order || 0));
  }, [items, stop.id, statusFilter]);

  const allStopItems = useMemo(() => items.filter(it => itemInStop(it, stop.id)), [items, stop.id]);
  const stay = getStay(items, stop.id);
  const stayCoord = stay?.coord || null;
  const stayPlace = stay ? places?.[stay.id] : null;
  const nights = calcNights(stop);
  const tips = stop.tips?.length > 0 ? stop.tips : null;
  const planItems = useMemo(() => {
    return allStopItems.filter(it => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'sel') return it.status === 'sel';
      if (statusFilter === 'conf') return it.status === 'conf';
      return true;
    });
  }, [allStopItems, statusFilter]);

  return (
    <div className={showTitle ? 'stop-section' : ''}>
      {showTitle && <div className="stop-section-title">{stop.name}</div>}

      {/* General details — inline editable */}
      <div className="itin-general">
        {editing ? (
          <>
            <div className="itin-general-row">
              <span className="itin-general-label">Name</span>
              <input className="edit-input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <div className="itin-general-row">
              <span className="itin-general-label">Start</span>
              <input className="edit-input" type="date" value={draft.start_date} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <div className="itin-general-row">
              <span className="itin-general-label">End</span>
              <input className="edit-input" type="date" value={draft.end_date} onChange={e => setDraft(d => ({ ...d, end_date: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="detail-btn" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="detail-btn sel" onClick={saveEdit} style={{ flex: 1 }}>Save</button>
            </div>
          </>
        ) : (
          <div className="itin-general-compact">
            <div className="itin-general-dates" onClick={startEdit} style={{ cursor: 'pointer' }}>
              <span>{formatStopDate(stop)}</span>
              {nights > 1 && <span className="itin-nights">{nights}n</span>}
            </div>
            {stay && (
              <div className="itin-general-stay">
                {stayCoord ? (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${stayCoord.lat},${stayCoord.lng}`} target="_blank" rel="noopener" className="itin-link">{stay.name}</a>
                ) : (
                  <span>{stay.name}</span>
                )}
                {stay.check_in && <span className="itin-detail-sep"> · In {stay.check_in}</span>}
                {stay.check_out && <span className="itin-detail-sep"> · Out {stay.check_out}</span>}
                {stayPlace?.phone && <span className="itin-detail-sep"> · <a href={`tel:${stayPlace.phone}`} className="itin-link">{stayPlace.phone}</a></span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map (left) + Schedule (right) — map above schedule on mobile */}
      <div className="itin-map-schedule">
        <div className="itin-map-col">
          <DayMap stop={stop} mapItems={scheduled} stayCoord={stayCoord} visible={visible} />
        </div>
        <div className="itin-schedule-col">
          <div className="itin-section-title">Schedule</div>
          <div className="itin-schedule-scroll">
            {scheduled.length > 0 ? (
              <ScheduleList items={scheduled} stop={stop} onItemTap={onItemTap} />
            ) : (
              <div className="itin-empty"><div className="itin-empty-text">No items scheduled.</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Travel tips */}
      {tips && (
        <details className="today-section">
          <summary className="today-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>Travel tips</summary>
          <ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      {/* Plan — collapsible, filterable by type, sorted by time */}
      <PlanSection planItems={planItems} onItemTap={onItemTap} />
    </div>
  );
}

// Extract YYYY-MM-DD from any date format
function toDateStr(d) {
  if (!d) return '';
  const s = String(d);
  // Handle: "2026-07-11", "2026-07-11T00:00:00Z", "2026-07-11 00:00:00+00"
  return s.substring(0, 10);
}

// ═══ CALENDAR DATES ═══
function getCalendarDates(stops) {
  if (!stops.length) return [];
  const startStr = toDateStr(stops[0].start_date);
  const endStr = toDateStr(stops[stops.length - 1].end_date);
  if (!startStr || !endStr) return [];
  const dates = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  // Include the end date itself in the loop (use <= for the last day)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const overlapping = stops.filter(s => {
      const sd = toDateStr(s.start_date);
      const ed = toDateStr(s.end_date);
      return dateStr >= sd && dateStr <= ed;
    });
    const stop = overlapping[0] || null;
    const title = overlapping.length > 1 ? overlapping.map(s => s.name).join(' / ') : (stop?.name || '');
    dates.push({
      date: dateStr,
      shortLabel: `${months[d.getMonth()]} ${d.getDate()}`,
      title,
      stop,
      stopIdx: stop ? stops.indexOf(stop) : -1,
      overlapping,
    });
  }
  // Only return dates that have at least one stop — no greyed out pills
  return dates.filter(cd => cd.stopIdx >= 0);
}

// ═══ MAIN ═══
export default function TodayPage({ active, items, stops, livePrices, expenses, updateItem, updateStop, setStatus, addExpense, files, setFile, removeFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectorMode, setSelectorMode] = useState('stops');
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  // view: 'overview' | { type: 'stop', idx: N } | { type: 'date', date: 'YYYY-MM-DD' }
  const [view, setView] = useState(isDuringTrip ? { type: 'stop', idx: todayIdx } : 'overview');
  const selectorRef = useRef(null);
  const calendarDates = useMemo(() => getCalendarDates(stops), [stops]);
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Resolve which stops to show based on current view
  const activeStops = useMemo(() => {
    if (view === 'overview') return [];
    if (view.type === 'stop') return stops[view.idx] ? [stops[view.idx]] : [];
    if (view.type === 'date') {
      return stops.filter(s => {
        const sd = toDateStr(s.start_date);
        const ed = toDateStr(s.end_date);
        return view.date >= sd && view.date <= ed;
      });
    }
    return [];
  }, [view, stops]);

  const isActive = (stopIdx) => view !== 'overview' && view.type === 'stop' && view.idx === stopIdx;
  const isDateActive = (date) => view !== 'overview' && view.type === 'date' && view.date === date;

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const sel = selectorRef.current.querySelector('[data-active="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view, selectorMode]);

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      <div className="itin-mode-toggle">
        <button className={`fp ${selectorMode === 'stops' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('stops')}>Stops</button>
        <button className={`fp ${selectorMode === 'dates' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('dates')}>Dates</button>
      </div>

      <div className="today-selector" ref={selectorRef}>
        <button className={`today-sel-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && !isActive(todayIdx) && <button className="today-sel-pill today-pill-accent" onClick={() => setView({ type: 'stop', idx: todayIdx })}>Today</button>}

        {selectorMode === 'stops' ? (
          stops.map((s, i) => {
            const nights = calcNights(s);
            return (
              <button key={s.id} data-active={isActive(i) ? 'true' : 'false'}
                className={`today-sel-pill today-sel-pill-stop ${isActive(i) ? 'active' : ''} ${i === todayIdx ? 'is-today' : ''}`}
                onClick={() => setView({ type: 'stop', idx: i })}
                style={{ borderLeftColor: 'var(--accent)', minWidth: Math.max(70, nights * 50), flexShrink: 0 }}>
                <span className="pill-stop-name" title={s.name}>{s.name}</span>
                <span className="pill-stop-date">{formatStopDate(s)}</span>
              </button>
            );
          })
        ) : (
          calendarDates.map(cd => {
            const isMulti = cd.overlapping.length > 1;
            return (
              <button key={cd.date} data-active={isDateActive(cd.date) ? 'true' : 'false'}
                className={`today-sel-pill today-sel-pill-stop ${isDateActive(cd.date) ? 'active' : ''} ${cd.date === todayDateStr ? 'is-today' : ''}`}
                onClick={() => cd.stopIdx >= 0 && setView({ type: 'date', date: cd.date })}
                style={{ borderLeftColor: 'var(--accent)', minWidth: isMulti ? 120 : undefined }}>
                <span className="pill-stop-name" title={cd.title} style={isMulti ? { whiteSpace: 'normal', lineHeight: 1.2, fontSize: 11 } : undefined}>{cd.title}</span>
                <span className="pill-stop-date">{cd.shortLabel}</span>
              </button>
            );
          })
        )}
      </div>

      {view !== 'overview' && <StatusFilter value={statusFilter} onChange={setStatusFilter} />}

      {view === 'overview' ? (
        <OverviewView items={items} stops={stops} expenses={expenses} onItemTap={setSelectedItem} visible={active && view === 'overview'} onDaySelect={(idx) => setView({ type: 'stop', idx })} />
      ) : (
        activeStops.map(stop => (
          <StopSection
            key={stop.id} stop={stop} items={items} onItemTap={setSelectedItem}
            places={places} visible={active} statusFilter={statusFilter}
            updateStop={updateStop} showTitle={activeStops.length > 1}
          />
        ))
      )}

      {activeStops.length === 0 && view !== 'overview' && (
        <div className="itin-empty"><div className="itin-empty-text">No stops for this date.</div></div>
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
