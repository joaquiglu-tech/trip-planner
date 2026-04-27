import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL, $f, usd } from '../data/items';
import { ITEM_COORDS } from '../data/coords';

const PHASE_LABEL = { spain: '🇪🇸 Spain', rome: '🇮🇹 Rome', roadtrip: '🚗 Road Trip', venice: '🇮🇹 Venice' };
const PHASE_COLOR = { spain: '#f97316', rome: '#1d4ed8', roadtrip: '#ea580c', venice: '#1d4ed8' };
const TYPE_ICON = { stay: '🏨', activity: '🎟️', special: '⭐', dining: '🍝' };

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

function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps);
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      if (window.google?.maps) { setReady(true); clearInterval(interval); }
    }, 300);
    return () => clearInterval(interval);
  }, [ready]);
  return ready;
}

function DayMap({ day, selections, active }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const prevKey = useRef(null);
  const mapsReady = useGoogleMapsReady();

  const key = `${day.n}-${selections.map(s => s.id).join(',')}`;

  useEffect(() => {
    if (!active || !mapsReady || !mapRef.current || !day.lat) return;
    if (prevKey.current !== key) {
      // Destroy old map
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      mapInstance.current = null;
      prevKey.current = key;
    }
    if (mapInstance.current) {
      window.google.maps.event.trigger(mapInstance.current, 'resize');
      return;
    }

    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: day.lat, lng: day.lng }, zoom: day.zoom || 14,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
    });

    // City center marker
    const centerMarker = new window.google.maps.Marker({
      position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: PHASE_COLOR[day.phase], fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    markersRef.current.push(centerMarker);

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: day.lat, lng: day.lng });
    let hasExtra = false;

    // Draw driving route if this is a road trip day
    if (day.driveFrom) {
      const routePath = [day.driveFrom];
      if (day.driveVia) day.driveVia.forEach((v) => routePath.push(v));
      routePath.push({ lat: day.lat, lng: day.lng });

      new window.google.maps.Polyline({
        path: routePath, geodesic: true, strokeColor: '#ea580c', strokeOpacity: 0.8, strokeWeight: 3, map: m,
      });

      // Add via-stop markers
      if (day.driveVia) {
        day.driveVia.forEach((v) => {
          const vm = new window.google.maps.Marker({
            position: v, map: m, title: v.label,
            icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#92400e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          });
          const viw = new window.google.maps.InfoWindow({
            content: `<div style="font-family:system-ui;font-size:12px"><strong>${v.label}</strong><br><span style="color:#78716c;font-size:11px">Stop</span></div>`,
          });
          vm.addListener('click', () => viw.open(m, vm));
          markersRef.current.push(vm);
          bounds.extend(v);
        });
      }

      // Start marker
      const startM = new window.google.maps.Marker({
        position: day.driveFrom, map: m, title: 'Start',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#78716c', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
      markersRef.current.push(startM);
      bounds.extend(day.driveFrom);
      hasExtra = true;
    }

    // Plot selected items
    selections.forEach((it) => {
      const coord = ITEM_COORDS[it.id];
      if (!coord) return;
      const color = it.type === 'stay' ? '#6366f1' : it.type === 'dining' || it.type === 'special' ? '#ea580c' : '#16a34a';
      const marker = new window.google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lng }, map: m, title: coord.label,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:12px;padding:2px 0"><strong>${coord.label}</strong><br><span style="color:#78716c;font-size:11px">${TYPE_LABEL[it.type] || ''}</span></div>`,
      });
      marker.addListener('click', () => iw.open(m, marker));
      markersRef.current.push(marker);
      bounds.extend({ lat: coord.lat, lng: coord.lng });
      hasExtra = true;
    });

    if (hasExtra) {
      m.fitBounds(bounds, 40);
      const listener = window.google.maps.event.addListener(m, 'idle', () => {
        if (m.getZoom() > 16) m.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    }

    mapInstance.current = m;
  }, [active, key, mapsReady]);

  if (!day.lat) return null;
  return <div ref={mapRef} className="map-wrap" style={{ height: 280, borderRadius: 10 }}></div>;
}

function SelectionCard({ it, S }) {
  const st = S[it.id] || '';
  let price = '';
  if (it.type === 'stay') price = $f(usd((it.pn || 0) * (it.nights || 1)));
  else if (it.type === 'dining') price = $f(usd((it.eur || 0) * 2));
  else if (it.type === 'special') price = $f(usd((it.ppEur || 0) * 2));
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur * 2));

  return (
    <div className={`day-item-card ${st === 'conf' ? 'conf' : 'sel'}`}>
      <div className="dic-icon">{TYPE_ICON[it.type] || '📌'}</div>
      <div className="dic-info">
        <div className="dic-name">{it.name}</div>
        {it.dish && <div className="dic-sub">{it.dish}</div>}
        {it.address && <div className="dic-sub">📍 {it.address}</div>}
        {!it.dish && !it.address && it.desc && <div className="dic-sub">{it.desc.slice(0, 80)}{it.desc.length > 80 ? '...' : ''}</div>}
      </div>
      <div className="dic-right">
        <div className="dic-price">{price}</div>
        <div className={`dic-status ${st}`}>{st === 'conf' ? '✓' : '●'}</div>
      </div>
    </div>
  );
}

function DriveInfo({ day }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!day.driveFrom) return;
    import('../lib/googlePlaces').then(({ fetchDriveTime }) => {
      fetchDriveTime(day.driveFrom.lat, day.driveFrom.lng, day.lat, day.lng).then((result) => {
        if (result) setInfo(result);
      });
    });
  }, [day.n]);
  if (!day.driveFrom || !info) return null;
  return (
    <div className="drive-info-bar">
      <span>🚗</span>
      <span>{info.durationText} drive</span>
      <span className="drive-info-dist">{info.distanceKm} km</span>
    </div>
  );
}

function DayDetail({ day, S, active }) {
  const selections = useMemo(() => getSelectedForCity(day.city, S), [day.city, S]);
  const stays = selections.filter(it => it.type === 'stay');
  const activities = selections.filter(it => it.type === 'activity');
  const dining = selections.filter(it => it.type === 'dining' || it.type === 'special');

  return (
    <div className="day-detail">
      <DayMap day={day} selections={selections} active={active} />

      {/* Drive time from previous city */}
      <DriveInfo day={day} />

      <div className="day-detail-header">
        <span className="day-phase-dot" style={{ background: PHASE_COLOR[day.phase] }} />
        <div>
          <div className="day-detail-date">{day.date}</div>
          <div className="day-detail-title">{day.title}</div>
          <div className="day-detail-sleep">Sleep: {day.sleep}</div>
        </div>
      </div>

      <div className="day-section">
        <div className="day-section-title">Plan</div>
        {day.plan.map((p, i) => (
          <div key={i} className="day-plan-step">
            <span className="day-step-num">{i + 1}</span>
            <span>{p}</span>
          </div>
        ))}
      </div>

      <div className="day-section">
        <div className="day-section-title">Eat & Drink</div>
        {day.eat.map((e, i) => <div key={i} className="eat-line">{e}</div>)}
      </div>

      {stays.length > 0 && (
        <div className="day-section">
          <div className="day-section-title">Your Stay</div>
          {stays.map(it => <SelectionCard key={it.id} it={it} S={S} />)}
        </div>
      )}
      {activities.length > 0 && (
        <div className="day-section">
          <div className="day-section-title">Your Activities</div>
          {activities.map(it => <SelectionCard key={it.id} it={it} S={S} />)}
        </div>
      )}
      {dining.length > 0 && (
        <div className="day-section">
          <div className="day-section-title">Your Restaurants</div>
          {dining.map(it => <SelectionCard key={it.id} it={it} S={S} />)}
        </div>
      )}

      {selections.length === 0 && (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Nothing selected yet</div>
          <div className="empty-state-text">Go to the Planner tab to pick stays, restaurants, and activities for {day.city}.</div>
        </div>
      )}

      {day.lat && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <a href={`https://www.google.com/maps/@${day.lat},${day.lng},${day.zoom || 14}z`} target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>📍 Maps</a>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${day.lat},${day.lng}`} target="_blank" rel="noopener" className="gmaps-btn dark" style={{ flex: 1 }}>🧭 Directions</a>
        </div>
      )}
    </div>
  );
}

function FullTripView({ S }) {
  const phases = ['spain', 'rome', 'roadtrip', 'venice'];
  return (
    <>
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
                      {sels.slice(0, 4).map(it => (
                        <span key={it.id} className={`ftd-badge ${S[it.id] === 'conf' ? 'conf' : 'sel'}`} title={it.name}>
                          {TYPE_ICON[it.type]} {it.name.length > 12 ? it.name.slice(0, 12) + '...' : it.name}
                        </span>
                      ))}
                      {sels.length > 4 && <span className="ftd-badge">+{sels.length - 4}</span>}
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

export default function ItineraryPage({ active, S }) {
  const [view, setView] = useState('full');

  return (
    <div id="page-itinerary" className={`page ${active ? 'active' : ''}`}>
      <div className="itin-selector">
        <button className={`itin-opt ${view === 'full' ? 'active' : ''}`} onClick={() => setView('full')}>Full Trip</button>
        {ALL_DAYS.map((d) => (
          <button key={d.n} className={`itin-opt ${view === String(d.n) ? 'active' : ''}`} onClick={() => setView(String(d.n))}>
            <span className="itin-opt-phase" style={{ background: PHASE_COLOR[d.phase] }} />
            {d.n}
          </button>
        ))}
      </div>
      {view === 'full' ? <FullTripView S={S} /> : <DayDetail day={ALL_DAYS[parseInt(view) - 1]} S={S} active={active} />}
    </div>
  );
}
