import { useEffect, useRef } from 'react';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';

export default function OverviewPage({ active }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!active || !window.google || mapInstance.current) return;
    const rm = new window.google.maps.Map(mapRef.current, {
      center: { lat: 44.5, lng: 11.0 }, zoom: 6,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true, streetViewControl: false, fullscreenControl: true,
    });
    ROUTE_LINES.forEach((seg) => {
      new window.google.maps.Polyline({
        path: seg.path, geodesic: true, strokeColor: seg.color,
        strokeOpacity: seg.dash ? 0 : 0.9, strokeWeight: seg.w,
        icons: seg.dash ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }] : [],
        map: rm,
      });
    });
    ROUTE_STOPS.forEach((s) => {
      const sz = s.big ? 7 : 4;
      const m = new window.google.maps.Marker({
        position: { lat: s.lat, lng: s.lng }, map: rm, title: s.label,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: sz, fillColor: s.color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:13px;padding:2px 0"><strong>${s.label}</strong>${s.sub ? `<br><span style="color:#78716c;font-size:11px">${s.sub}</span>` : ''}</div>`,
      });
      m.addListener('click', () => iw.open(rm, m));
    });
    mapInstance.current = rm;
  }, [active]);

  useEffect(() => {
    if (active && mapInstance.current) {
      window.google?.maps?.event?.trigger(mapInstance.current, 'resize');
    }
  }, [active]);

  return (
    <div id="page-overview" className={`page ${active ? 'active' : ''}`}>
      <div className="card" style={{ borderLeft: '4px solid #f97316', borderRadius: '0 10px 10px 0' }}>
        <div className="card-bd">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🇪🇸 Spain — Jul 12–20 · 8 nights (not on Italy map)</div>
          <div className="g3">
            <div><div style={{ fontWeight: 700 }}>Madrid <span style={{ fontWeight: 400, color: '#78716c' }}>2n</span></div><div style={{ fontSize: 11, color: '#57534e', fontStyle: 'italic' }}>Family stay. Prado, La Latina tapas, reggaeton night.</div></div>
            <div><div style={{ fontWeight: 700 }}>Menorca <span style={{ fontWeight: 400, color: '#78716c' }}>4n</span></div><div style={{ fontSize: 11, color: '#57534e', fontStyle: 'italic' }}>Family stay. Calas, caldereta de langosta.</div></div>
            <div><div style={{ fontWeight: 700 }}>Malaga <span style={{ fontWeight: 400, color: '#78716c' }}>2n</span></div><div style={{ fontSize: 11, color: '#57534e', fontStyle: 'italic' }}>Hotel. Padel P1 finals Jul 18–19. Sardines.</div><a href="https://www.premierpadel.com" target="_blank" rel="noopener" className="ext">Padel tickets ↗</a></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">🇮🇹 Italy Route Map</div>
        <div ref={mapRef} className="map-wrap" style={{ height: 460 }}></div>
        <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 28, borderTop: '2.5px dashed #1d4ed8' }}></div><span>Train</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 28, height: 3, background: '#ea580c', borderRadius: 2 }}></div><span style={{ fontWeight: 700, color: '#ea580c' }}>Road trip (car)</span></div>
          <a href="https://www.google.com/maps/dir/Rome,Italy/Florence,Italy/Montepulciano,Italy/Lerici,Italy/Parma,Italy/Bergamo,Italy/Bellagio,Italy/Sirmione,Italy/Verona,Italy/Bologna,Italy/Florence,Italy/Venice,Italy" target="_blank" rel="noopener" className="ext" style={{ marginLeft: 'auto' }}>Full route in Google Maps ↗</a>
        </div>
      </div>
      <div className="note">
        <strong>Key notes:</strong><br />
        • <strong>Day 3:</strong> Drive to Podere Il Casale sober first (30min). Park. Drink at the farm all day — already home.<br />
        • <strong>Florence:</strong> Accademia 3pm Day 1 + Uffizi 8am Day 2 (done by 11am, then drive south). Both covered.<br />
        • <strong>Route:</strong> Southwest Tuscany → northwest Ligurian coast → north lakes → east Verona → south via Bologna → Florence → Venice.<br />
        • <strong>7 walled cities:</strong> Montepulciano · Siena · San Gimignano · Bergamo Alta · Sirmione · Verona · Rome.
      </div>
    </div>
  );
}
