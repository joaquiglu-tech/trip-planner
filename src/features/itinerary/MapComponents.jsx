import { useEffect, useRef, useCallback } from 'react';
import { Map, useMap, useMapsLibrary, Marker } from '@vis.gl/react-google-maps';
import { calcNights, itemInStop, getStay } from './utils';

const TYPE_MAP_COLOR = { stay: '#7C3AED', food: '#D97706', activity: '#16A34A', transport: '#2563EB' };

const TRANSPORT_TRAVEL_MODE = {
  drive: 'DRIVING', taxi: 'DRIVING',
  train: 'TRANSIT', bus: 'TRANSIT', ferry: 'TRANSIT',
  walk: 'WALKING', bicycle: 'BICYCLING',
};
const TRANSPORT_ROUTE_COLOR = {
  flight: '#2563EB', drive: '#7C3AED', train: '#0891B2', bus: '#0891B2',
  walk: '#16A34A', bicycle: '#D97706', ferry: '#0891B2', taxi: '#D97706',
};

const directionsCache = {};

// ═══ DAY MAP — per-stop map with item markers + routes + transport ═══
export function DayMap({ stop, mapItems, transportItems, stayCoord }) {
  const stopCoord = (stop.lat && stop.lng) ? { lat: Number(stop.lat), lng: Number(stop.lng) } : null;
  const center = stayCoord || stopCoord || (mapItems.find(it => it.coord)?.coord) || null;
  if (!center) return null;

  return (
    <div className="map-wrap">
      <Map
        defaultCenter={center}
        defaultZoom={14}
        mapId="day-map"
        gestureHandling="cooperative"
        disableDefaultUI
        fullscreenControl
        style={{ width: '100%', height: '100%' }}
      >
        <DayMapContent mapItems={mapItems} transportItems={transportItems} stayCoord={stayCoord} stopName={stop.name} />
      </Map>
    </div>
  );
}

function DayMapContent({ mapItems, transportItems, stayCoord, stopName }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const renderersRef = useRef([]);

  // Fit bounds to all items
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    if (stayCoord) { bounds.extend(stayCoord); hasPoints = true; }
    mapItems.filter(it => it.coord).forEach(it => { bounds.extend(it.coord); hasPoints = true; });
    (transportItems || []).forEach(ti => {
      if (ti.originCoord) { bounds.extend(ti.originCoord); hasPoints = true; }
      if (ti.destCoord) { bounds.extend(ti.destCoord); hasPoints = true; }
    });
    if (hasPoints) map.fitBounds(bounds, 40);
  }, [map, mapItems, transportItems, stayCoord]);

  // Draw routes between items (driving) + transport routes
  useEffect(() => {
    if (!map || !routesLib) return;
    // Clean up previous renderers
    renderersRef.current.forEach(r => { if (r.setMap) r.setMap(null); else if (r.setDirections) r.setDirections({ routes: [] }); });
    renderersRef.current = [];

    // Route between non-transport items with coords
    const withCoords = mapItems.filter(it => it.coord);
    if (withCoords.length >= 2) {
      const routeKey = withCoords.map(e => `${e.coord.lat},${e.coord.lng}`).join('|');
      const render = (result) => {
        const dr = new window.google.maps.DirectionsRenderer({ map, directions: result, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: '#7C3AED', strokeOpacity: 0.7, strokeWeight: 3 } });
        renderersRef.current.push(dr);
      };
      if (directionsCache[routeKey]) { render(directionsCache[routeKey]); }
      else {
        new routesLib.DirectionsService().route({
          origin: withCoords[0].coord, destination: withCoords[withCoords.length - 1].coord,
          waypoints: withCoords.slice(1, -1).map(e => ({ location: e.coord, stopover: true })).slice(0, 8),
          travelMode: window.google.maps.TravelMode.DRIVING, optimizeWaypoints: false,
        }, (result, status) => { if (status === 'OK') { directionsCache[routeKey] = result; render(result); } });
      }
    }

    // Transport routes on this stop's map
    (transportItems || []).forEach(ti => {
      if (!ti.originCoord || !ti.destCoord) return;
      const color = TRANSPORT_ROUTE_COLOR[ti.transport_mode] || '#2563EB';
      if (ti.transport_mode === 'flight') {
        const line = new window.google.maps.Polyline({
          path: [ti.originCoord, ti.destCoord], geodesic: true, strokeColor: color, strokeOpacity: 0, strokeWeight: 3, map,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: '0', repeat: '12px' }],
        });
        renderersRef.current.push(line);
      } else {
        const travelMode = TRANSPORT_TRAVEL_MODE[ti.transport_mode] || 'DRIVING';
        new routesLib.DirectionsService().route({
          origin: ti.originCoord, destination: ti.destCoord,
          travelMode: window.google.maps.TravelMode[travelMode],
        }, (result, status) => {
          if (status === 'OK') {
            const dr = new window.google.maps.DirectionsRenderer({ map, directions: result, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: color, strokeOpacity: 0.8, strokeWeight: 3 } });
            renderersRef.current.push(dr);
          } else {
            const line = new window.google.maps.Polyline({ path: [ti.originCoord, ti.destCoord], strokeColor: color, strokeOpacity: 0.5, strokeWeight: 2, map });
            renderersRef.current.push(line);
          }
        });
      }
    });

    return () => { renderersRef.current.forEach(r => { if (r.setMap) r.setMap(null); else if (r.setDirections) r.setDirections({ routes: [] }); }); renderersRef.current = []; };
  }, [map, routesLib, mapItems, transportItems]);

  const withCoords = mapItems.filter(it => it.coord);
  return (
    <>
      {stayCoord && <Marker position={stayCoord} title={`Stay: ${stopName}`} />}
      {withCoords.map((it, idx) => (
        <Marker key={it.id} position={it.coord} title={`${idx + 1}. ${it.name}`} />
      ))}
      {(transportItems || []).map(ti => (
        ti.originCoord && <Marker key={`t-${ti.id}`} position={ti.originCoord} title={ti.routeLabel || ti.name} />
      ))}
    </>
  );
}

// ═══ ROUTE MAP — full trip overview with transport routes ═══
export function RouteMap({ stops, items }) {
  const points = stops.map(s => {
    if (s.lat && s.lng) return { stop: s, coord: { lat: Number(s.lat), lng: Number(s.lng) } };
    const stay = getStay(items, s.id);
    if (stay?.coord) return { stop: s, coord: stay.coord };
    const anyItem = items.find(it => itemInStop(it, s.id) && it.coord);
    if (anyItem?.coord) return { stop: s, coord: anyItem.coord };
    return { stop: s, coord: null };
  }).filter(p => p.coord);

  if (!points.length) return <div className="map-wrap" />;

  const tripPoints = points.filter(p => p.stop.name !== 'Lima');
  const mapPoints = tripPoints.length > 0 ? tripPoints : points;
  const cLat = mapPoints.reduce((s, p) => s + p.coord.lat, 0) / mapPoints.length;
  const cLng = mapPoints.reduce((s, p) => s + p.coord.lng, 0) / mapPoints.length;

  return (
    <div className="map-wrap">
      <Map
        defaultCenter={{ lat: cLat, lng: cLng }}
        defaultZoom={6}
        mapId="route-map"
        gestureHandling="cooperative"
        disableDefaultUI
        fullscreenControl
        style={{ width: '100%', height: '100%' }}
      >
        <RouteMapContent points={points} items={items} />
      </Map>
    </div>
  );
}

function RouteMapContent({ points, items }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const renderersRef = useRef([]);

  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const tripPoints = points.filter(p => p.stop.name !== 'Lima');
    const boundsPoints = tripPoints.length > 0 ? tripPoints : points;
    const bounds = new window.google.maps.LatLngBounds();
    boundsPoints.forEach(p => bounds.extend(p.coord));

    // Transport routes
    const transportItems = items.filter(it => it.type === 'transport' && !it.is_rental && (it.status === 'sel' || it.status === 'conf'));
    transportItems.forEach(ti => {
      if (ti.originCoord) bounds.extend(ti.originCoord);
      if (ti.destCoord) bounds.extend(ti.destCoord);
    });

    map.fitBounds(bounds, 30);
  }, [map, points, items]);

  // Draw transport routes + fallback polyline
  useEffect(() => {
    if (!map || !routesLib) return;
    renderersRef.current.forEach(r => { if (r.setMap) r.setMap(null); else if (r.setDirections) r.setDirections({ routes: [] }); });
    renderersRef.current = [];

    const transportItems = items.filter(it => it.type === 'transport' && !it.is_rental && (it.status === 'sel' || it.status === 'conf'));
    let hasRoutes = false;

    transportItems.forEach(ti => {
      if (!ti.originCoord || !ti.destCoord) return;
      hasRoutes = true;
      const color = TRANSPORT_ROUTE_COLOR[ti.transport_mode] || '#7C3AED';
      if (ti.transport_mode === 'flight') {
        const line = new window.google.maps.Polyline({
          path: [ti.originCoord, ti.destCoord], geodesic: true, strokeColor: color, strokeOpacity: 0, strokeWeight: 3, map,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: '0', repeat: '12px' }],
        });
        renderersRef.current.push(line);
      } else {
        const travelMode = TRANSPORT_TRAVEL_MODE[ti.transport_mode] || 'DRIVING';
        new routesLib.DirectionsService().route({
          origin: ti.originCoord, destination: ti.destCoord,
          travelMode: window.google.maps.TravelMode[travelMode],
        }, (result, status) => {
          if (status === 'OK') {
            const dr = new window.google.maps.DirectionsRenderer({ map, directions: result, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: color, strokeOpacity: 0.8, strokeWeight: 3 } });
            renderersRef.current.push(dr);
          } else {
            const line = new window.google.maps.Polyline({ path: [ti.originCoord, ti.destCoord], strokeColor: color, strokeOpacity: 0.5, strokeWeight: 2, map });
            renderersRef.current.push(line);
          }
        });
      }
    });

    // Fallback: dashed stop-to-stop line if no transport items
    const tripPoints = points.filter(p => p.stop.name !== 'Lima');
    const mapPoints = tripPoints.length > 0 ? tripPoints : points;
    if (!hasRoutes && mapPoints.length > 1) {
      const line = new window.google.maps.Polyline({
        path: mapPoints.map(p => p.coord), geodesic: true, strokeColor: '#7C3AED', strokeOpacity: 0.4, strokeWeight: 2, map,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 2 }, offset: '0', repeat: '10px' }],
      });
      renderersRef.current.push(line);
    }

    return () => { renderersRef.current.forEach(r => { if (r.setMap) r.setMap(null); else if (r.setDirections) r.setDirections({ routes: [] }); }); renderersRef.current = []; };
  }, [map, routesLib, points, items]);

  return (
    <>
      {points.map(p => (
        <Marker key={p.stop.id} position={p.coord} title={p.stop.name} />
      ))}
    </>
  );
}
