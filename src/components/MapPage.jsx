import { useState, useEffect, useRef, useMemo } from 'react';
import { ITEMS, TYPE_LABEL } from '../data/items';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { ITEM_COORDS } from '../data/coords';

const TYPE_COLOR = { stay: '#6366f1', activity: '#16a34a', dining: '#ea580c', special: '#ea580c', transport: '#78716c' };

function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google?.maps);
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => { if (window.google?.maps) { setReady(true); clearInterval(interval); } }, 300);
    return () => clearInterval(interval);
  }, [ready]);
  return ready;
}

export default function MapPage({ active, S }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const mapsReady = useGoogleMapsReady();
  const [filter, setFilter] = useState('all');
  const builtKey = useRef('');

  const selectedItems = useMemo(() => {
    return ITEMS.filter((it) => {
      if (it.type === 'transport') return false;
      const st = S[it.id] || '';
      return st === 'sel' || st === 'conf';
    });
  }, [S]);

  const visibleItems = useMemo(() => {
    if (filter === 'all') return selectedItems;
    return selectedItems.filter((it) => it.type === filter);
  }, [selectedItems, filter]);

  const key = `${filter}-${visibleItems.map(i => i.id).join(',')}`;

  useEffect(() => {
    if (!active || !mapsReady || !mapRef.current) return;

    if (builtKey.current === key && mapInstance.current) {
      google.maps.event.trigger(mapInstance.current, 'resize');
      return;
    }

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const m = mapInstance.current || new google.maps.Map(mapRef.current, {
      center: { lat: 44.0, lng: 11.0 }, zoom: 6,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });

    // Draw route lines
    if (!mapInstance.current) {
      ROUTE_LINES.forEach((seg) => {
        new google.maps.Polyline({
          path: seg.path, geodesic: true, strokeColor: seg.color,
          strokeOpacity: seg.dash ? 0 : 0.7, strokeWeight: seg.w,
          icons: seg.dash ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '14px' }] : [],
          map: m,
        });
      });

      // Route city markers
      ROUTE_STOPS.forEach((s) => {
        const marker = new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng }, map: m, title: s.label,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: s.big ? 6 : 4, fillColor: s.color, fillOpacity: 0.4, strokeColor: s.color, strokeWeight: 1 },
        });
        markersRef.current.push(marker);
      });
    }

    // Plot selected items
    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    visibleItems.forEach((it) => {
      const coord = ITEM_COORDS[it.id];
      if (!coord) return;
      const st = S[it.id] || '';
      const color = TYPE_COLOR[it.type] || '#78716c';
      const marker = new google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lng }, map: m, title: it.name,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
      const iw = new google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:12px;padding:4px 2px;max-width:200px">
          <strong>${it.name}</strong><br>
          <span style="color:#78716c;font-size:11px">${TYPE_LABEL[it.type]} · ${it.city}</span>
          ${it.dish ? `<br><span style="font-size:11px;color:#44403c">${it.dish}</span>` : ''}
          <br><span style="font-size:11px;font-weight:700;color:${st === 'conf' ? '#16a34a' : '#ea580c'}">${st === 'conf' ? '✓ Confirmed' : '● Selected'}</span>
        </div>`,
      });
      marker.addListener('click', () => iw.open(m, marker));
      markersRef.current.push(marker);
      bounds.extend({ lat: coord.lat, lng: coord.lng });
      hasBounds = true;
    });

    if (hasBounds) {
      m.fitBounds(bounds, 60);
      const listener = google.maps.event.addListener(m, 'idle', () => {
        if (m.getZoom() > 15) m.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }

    mapInstance.current = m;
    builtKey.current = key;
  }, [active, key, mapsReady]);

  if (!active) return null;

  return (
    <div className="map-page">
      {/* Filter chips */}
      <div className="map-filters">
        {[
          { id: 'all', label: 'All', count: selectedItems.length },
          { id: 'stay', label: '🏨 Stays' },
          { id: 'activity', label: '🎟️ Activities' },
          { id: 'dining', label: '🍝 Dining' },
          { id: 'special', label: '⭐ Special' },
        ].map((f) => (
          <button key={f.id} className={`map-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
          </button>
        ))}
      </div>

      {/* Full-screen map */}
      <div ref={mapRef} className="map-fullscreen"></div>

      {/* Legend */}
      <div className="map-legend">
        <span><span className="ml-dot" style={{ background: '#6366f1' }} /> Stay</span>
        <span><span className="ml-dot" style={{ background: '#16a34a' }} /> Activity</span>
        <span><span className="ml-dot" style={{ background: '#ea580c' }} /> Dining</span>
        <span style={{ color: 'var(--text-light)', fontSize: 10 }}>{visibleItems.length} selected</span>
      </div>
    </div>
  );
}
