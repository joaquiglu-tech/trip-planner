import { useState, useEffect, useRef } from 'react';
import { DAYS } from '../data/days';

function DayMap({ day, active }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    mapInstance.current = null;
  }, [day.n]);

  useEffect(() => {
    if (!active || !window.google || !mapRef.current) return;
    if (mapInstance.current) {
      window.google.maps.event.trigger(mapInstance.current, 'resize');
      return;
    }
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: day.lat, lng: day.lng }, zoom: day.zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: true, fullscreenControl: true,
    });
    new window.google.maps.Marker({
      position: { lat: day.lat, lng: day.lng }, map: m, title: day.sleep,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#ea580c', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    mapInstance.current = m;
  }, [active, day.n]);

  return <div ref={mapRef} className="map-wrap" style={{ height: 340 }}></div>;
}

export default function RoadTripPage({ active }) {
  const [activeDay, setActiveDay] = useState(1);
  const day = DAYS[activeDay - 1];

  return (
    <div id="page-roadtrip" className={`page ${active ? 'active' : ''}`}>
      <div className="card oc">
        <div className="card-hd">🚗 Florence Loop · 8 nights · Pickup + Dropoff Florence SMN</div>
        <div className="card-bd">
          <div className="g3">
            <div className="note" style={{ margin: 0 }}>🚗 Same pickup/dropoff = no one-way fee. ~$570/8 days.<br /><a href="https://www.discovercars.com/italy/florence" target="_blank" rel="noopener" className="ext">DiscoverCars ↗</a></div>
            <div className="note" style={{ margin: 0 }}>🍷 Day 3 = drive to farm FIRST sober (30min), then drink all day. All other wine nights = already at hotel.</div>
            <div className="note" style={{ margin: 0 }}>⚠️ Every walled town has ZTL camera fines. Park OUTSIDE walls (Parcheggio signs).</div>
          </div>
        </div>
      </div>
      <div id="day-tabs">
        {DAYS.map((d) => (
          <button key={d.n} className={`dt ${d.n === activeDay ? 'active' : ''}`} onClick={() => setActiveDay(d.n)}>
            Day {d.n}
          </button>
        ))}
      </div>
      <div className="card oc">
        <div className="card-hd">{day.date} · {day.title}</div>
        <div className="g2" style={{ alignItems: 'start' }}>
          <div className="card-bd">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#78716c', marginBottom: 4 }}>Sleep: {day.sleep}</div>
            {day.plan.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#f97316', flexShrink: 0 }}>→</span><span>{p}</span>
              </div>
            ))}
            <hr className="sep" />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#78716c', marginBottom: 4 }}>Eat & Drink today</div>
            {day.eat.map((e, i) => <div key={i} className="eat-line">{e}</div>)}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`https://www.google.com/maps/@${day.lat},${day.lng},${day.zoom}z`} target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>📍 Open in Maps</a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${day.lat},${day.lng}`} target="_blank" rel="noopener" className="gmaps-btn dark" style={{ flex: 1 }}>🧭 Directions</a>
            </div>
          </div>
          <div>
            <DayMap day={day} active={active} />
          </div>
        </div>
      </div>
    </div>
  );
}
