import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL } from '../data/items';

const PHASE_LABEL = { spain: '🇪🇸 Spain', rome: '🇮🇹 Rome', roadtrip: '🚗 Road Trip', venice: '🇮🇹 Venice' };
const PHASE_COLOR = { spain: '#f97316', rome: '#1d4ed8', roadtrip: '#ea580c', venice: '#1d4ed8' };

function DayMap({ day, active }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const prevDay = useRef(null);

  useEffect(() => {
    if (!active || !window.google || !mapRef.current || !day.lat) return;
    if (prevDay.current !== day.n) { mapInstance.current = null; prevDay.current = day.n; }
    if (mapInstance.current) { window.google.maps.event.trigger(mapInstance.current, 'resize'); return; }
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: day.lat, lng: day.lng }, zoom: day.zoom || 13,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP, streetViewControl: false, mapTypeControl: true,
    });
    new window.google.maps.Marker({
      position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#ea580c', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    mapInstance.current = m;
  }, [active, day.n]);

  if (!day.lat) return null;
  return <div ref={mapRef} className="map-wrap" style={{ height: 220 }}></div>;
}

function SelectedItems({ city, S }) {
  const items = useMemo(() => {
    return ITEMS.filter((it) => {
      if (it.type === 'transport') return false;
      const st = S[it.id] || '';
      if (st !== 'sel' && st !== 'conf') return false;
      // Match city loosely
      if (it.city === city) return true;
      if (city === 'Montepulciano' && it.city === 'Tuscany') return true;
      if (city === "Val d'Orcia" && it.city === "Val d'Orcia") return true;
      return false;
    });
  }, [city, S]);

  if (!items.length) return null;

  return (
    <div className="day-selections">
      <div className="day-sel-title">Your Selections</div>
      {items.map((it) => {
        const st = S[it.id];
        return (
          <div key={it.id} className={`day-sel-item ${st === 'conf' ? 'conf' : 'sel'}`}>
            <span className={`day-sel-dot ${st === 'conf' ? 'dot-conf' : 'dot-sel'}`} />
            <div className="day-sel-info">
              <span className="day-sel-name">{it.name}</span>
              <span className="day-sel-type">{TYPE_LABEL[it.type]}</span>
            </div>
            <span className="day-sel-status">{st === 'conf' ? '✓' : '●'}</span>
          </div>
        );
      })}
    </div>
  );
}

function DayDetail({ day, S, active }) {
  return (
    <div className="card oc">
      <div className="card-hd">
        <span className="day-phase-dot" style={{ background: PHASE_COLOR[day.phase] }} />
        Day {day.n} · {day.date} · {day.title}
      </div>
      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="card-bd">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Sleep: {day.sleep}
          </div>
          {day.plan.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#f97316', flexShrink: 0 }}>→</span><span>{p}</span>
            </div>
          ))}
          <hr className="sep" />
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Eat & Drink
          </div>
          {day.eat.map((e, i) => <div key={i} className="eat-line">{e}</div>)}

          <SelectedItems city={day.city} S={S} />

          {day.lat && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`https://www.google.com/maps/@${day.lat},${day.lng},${day.zoom || 13}z`} target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>📍 Maps</a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${day.lat},${day.lng}`} target="_blank" rel="noopener" className="gmaps-btn dark" style={{ flex: 1 }}>🧭 Directions</a>
            </div>
          )}
        </div>
        {day.lat && (
          <div><DayMap day={day} active={active} /></div>
        )}
      </div>
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
            <div className="phase-header" style={{ borderLeftColor: PHASE_COLOR[phase] }}>
              {PHASE_LABEL[phase]} · {days.length} days
            </div>
            {days.map((day) => (
              <div key={day.n} className="full-trip-day">
                <div className="ftd-date">{day.date}</div>
                <div className="ftd-title">{day.title}</div>
                <div className="ftd-sleep">Sleep: {day.sleep}</div>
                <SelectedItems city={day.city} S={S} />
              </div>
            ))}
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
      {/* View selector */}
      <div className="itin-selector">
        <button className={`itin-opt ${view === 'full' ? 'active' : ''}`} onClick={() => setView('full')}>
          Full Trip
        </button>
        {ALL_DAYS.map((d) => (
          <button key={d.n} className={`itin-opt ${view === String(d.n) ? 'active' : ''}`} onClick={() => setView(String(d.n))}>
            <span className="itin-opt-phase" style={{ background: PHASE_COLOR[d.phase] }} />
            {d.n}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'full' ? (
        <FullTripView S={S} />
      ) : (
        <DayDetail day={ALL_DAYS[parseInt(view) - 1]} S={S} active={active} />
      )}
    </div>
  );
}
