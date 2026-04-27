import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL, $f, usd } from '../data/items';
import { ITEM_COORDS } from '../data/coords';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import DetailModal from './DetailModal';

const PHASE_LABEL = { spain: 'Spain', rome: 'Rome', roadtrip: 'Road Trip', venice: 'Venice' };

// Valentina's travel tips per city
const DAY_TIPS = {
  'Spain': ['Tipping: not expected, round up or leave loose change', 'Tapas crawl: order 1-2 plates per bar, then move on', 'Siesta hours (2-5pm): many shops close'],
  'Rome': ['Cover knees + shoulders for churches (Vatican, St Peters) — they WILL turn you away', 'Free water: Rome has ~2,500 nasoni drinking fountains', 'Bus 64 to Vatican is a pickpocket hotspot — walk or take a taxi', 'Avoid restaurants near the Colosseum with picture menus in 5 languages', 'Rose sellers at Trevi will hand you a rose then demand payment — just say no'],
  'Florence': ['Friendship bracelet scam near Duomo — keep hands in pockets', 'Trattoria Mario is cash only, lunch only', 'Uffizi: book 8:15am slot, done by 11am, beat the heat'],
  'Montepulciano': ['Park OUTSIDE the walls — ZTL cameras will fine you €100-300', 'Wine cellars are walk-in, no appointment needed', 'Try pici — the local hand-rolled thick pasta'],
  "Val d'Orcia": ['Drive to Podere Il Casale SOBER first thing, then drink all day', 'Stop in Pienza: free pecorino tastings, buy the walnut-leaf-aged one', 'Via dell\'Amore and Via del Bacio in Pienza — romantic streets'],
  'Lerici': ['Skip Cinque Terre in July (timed entry, overcrowded)', 'Walk to Tellaro (45min coastal hike) — one of Italy\'s most beautiful villages', 'Try farinata (chickpea flatbread) at any La Spezia bakery — €2'],
  'Bergamo Alta': ['Take the funicular up, don\'t drive', 'Park OUTSIDE the walls — ZTL enforced', 'Second funicular to San Vigilio for the best panoramic view', 'Stracciatella gelato was invented here in 1961'],
  'Bellagio': ['Tour buses arrive 10am, leave 5pm — go early or late', 'Buy the ferry day pass (Navigazione Laghi), not single tickets', 'La Punta restaurant is at the exact tip of the peninsula — best terrace on Como'],
  'Sirmione': ['Walk to Grotte di Catullo at the tip — almost nobody goes', 'Park OUTSIDE medieval walls — ZTL', 'Aquaria thermal spa: book at booking@termedisirmione.com', 'La Rucola has only 12 tables — book 3+ weeks ahead'],
  'Verona': ['Park at Parcheggio Arena or Cittadella — OUTSIDE ZTL', 'Juliet\'s balcony is a 20th-century invention — see it from the courtyard, don\'t pay to go up', 'Valpolicella wine region is 20min away — consider a morning tasting'],
  'Venice': ['Venice entry fee does NOT apply after Jul 26 (you arrive Aug 1)', 'No eating/drinking while sitting on monuments — €100-200 fine', 'Gondola: agree on price BEFORE boarding (€80/30min standard)', 'Rialto fish market at 7am is the real Venice, before tourists arrive', 'Murano glass: beware Chinese fakes sold as "handmade Murano"'],
};
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

function SelectionCard({ it, S, onTap, coord, placePhone }) {
  const st = S[it.id] || '';
  let price = '';
  if (it.type === 'stay') price = $f(usd((it.pn || 0) * (it.nights || 1)));
  else if (it.type === 'dining') price = $f(usd((it.eur || 0) * 2));
  else if (it.type === 'special') price = $f(usd((it.ppEur || 0) * 2));
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur * 2));

  const phone = placePhone || it.phone;

  return (
    <div className={`day-item-card ${st === 'conf' ? 'conf' : 'sel'}`} onClick={() => onTap && onTap(it)} style={{ cursor: 'pointer' }}>
      <div className="dic-icon">{TYPE_ICON[it.type] || '📌'}</div>
      <div className="dic-info">
        <div className="dic-name">{it.name}</div>
        {it.dish && <div className="dic-sub">{it.dish}</div>}
        {it.address && <div className="dic-sub">📍 {it.address}</div>}
        {!it.dish && !it.address && it.desc && <div className="dic-sub">{it.desc.slice(0, 60)}...</div>}
      </div>
      <div className="dic-actions">
        {coord && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${coord.lat},${coord.lng}`} target="_blank" rel="noopener" className="dic-action-btn" onClick={(e) => e.stopPropagation()} title="Directions">🧭</a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="dic-action-btn" onClick={(e) => e.stopPropagation()} title="Call">📞</a>
        )}
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

function DayDetail({ day, S, active, onItemTap, places }) {
  const selections = useMemo(() => getSelectedForCity(day.city, S), [day.city, S]);
  const stays = selections.filter(it => it.type === 'stay');
  const activities = selections.filter(it => it.type === 'activity');
  const dining = selections.filter(it => it.type === 'dining' || it.type === 'special');

  const renderCard = (it) => (
    <SelectionCard key={it.id} it={it} S={S} onTap={onItemTap} coord={ITEM_COORDS[it.id]} placePhone={places?.[it.id]?.phone} />
  );

  // Travel tips for this day's city
  const tips = DAY_TIPS[day.city] || null;

  return (
    <div className="day-detail">
      <DayMap day={day} selections={selections} active={active} />
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
          {stays.map(renderCard)}
        </div>
      )}
      {activities.length > 0 && (
        <div className="day-section">
          <div className="day-section-title">Your Activities</div>
          {activities.map(renderCard)}
        </div>
      )}
      {dining.length > 0 && (
        <div className="day-section">
          <div className="day-section-title">Your Restaurants</div>
          {dining.map(renderCard)}
        </div>
      )}

      {/* Travel tips */}
      {tips && (
        <details className="day-section">
          <summary className="day-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>💡 Travel Tips</summary>
          <ul className="detail-tips" style={{ marginTop: 8 }}>
            {tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </details>
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

function TripCountdown() {
  const tripStart = new Date('2026-07-12');
  const now = new Date();
  const diff = Math.ceil((tripStart - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0 && diff > -22) return <div className="trip-countdown font-display">Day {Math.abs(diff) + 1} of your adventure!</div>;
  if (diff <= 0) return null;
  return <div className="trip-countdown font-display">{diff} days until your trip</div>;
}

function FullTripRouteMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapsReady = useGoogleMapsReady();

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current) return;
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: 44.0, lng: 11.0 }, zoom: 6,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    ROUTE_LINES.forEach((seg) => {
      new window.google.maps.Polyline({
        path: seg.path, geodesic: true, strokeColor: seg.color,
        strokeOpacity: seg.dash ? 0 : 0.7, strokeWeight: seg.w,
        icons: seg.dash ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '14px' }] : [],
        map: m,
      });
    });
    ROUTE_STOPS.forEach((s) => {
      const marker = new window.google.maps.Marker({
        position: { lat: s.lat, lng: s.lng }, map: m, title: s.label,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: s.big ? 6 : 4, fillColor: s.color, fillOpacity: 0.9, strokeColor: '#fff', strokeWeight: 2 },
      });
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;font-size:12px"><strong>${s.label}</strong><br><span style="color:#78716c">${s.sub}</span></div>`,
      });
      marker.addListener('click', () => iw.open(m, marker));
    });
    mapInstance.current = m;
  }, [mapsReady]);

  return <div ref={mapRef} className="map-wrap" style={{ height: 240, borderRadius: 'var(--radius)', marginBottom: 16 }}></div>;
}

function FullTripView({ S }) {
  const phases = ['spain', 'rome', 'roadtrip', 'venice'];
  return (
    <>
      <TripCountdown />
      <FullTripRouteMap />
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

// Detect which day is "today" based on trip dates
function getTodayDayNumber() {
  const tripStart = new Date('2026-07-12');
  const now = new Date();
  const diff = Math.floor((now - tripStart) / (1000 * 60 * 60 * 24));
  if (diff >= 0 && diff < ALL_DAYS.length) return ALL_DAYS[diff]?.n || null;
  return null;
}

export default function ItineraryPage({ active, S, setStatus, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData }) {
  const [view, setView] = useState('full');
  const [selectedItem, setSelectedItem] = useState(null);
  const todayDay = getTodayDayNumber();
  const selectorRef = useRef(null);

  useEffect(() => {
    if (todayDay && selectorRef.current) {
      const btn = selectorRef.current.querySelector(`[data-day="${todayDay}"]`);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [todayDay, active]);

  return (
    <div id="page-itinerary" className={`page ${active ? "active" : ""}`}>
      <div className="itin-selector" ref={selectorRef}>
        <button className={`itin-opt ${view === 'full' ? 'active' : ''}`} onClick={() => setView('full')}>Full Trip</button>
        {todayDay && (
          <button className={`itin-opt today-opt ${view === String(todayDay) ? 'active' : ''}`} onClick={() => setView(String(todayDay))} data-day={todayDay}>
            Today
          </button>
        )}
        {ALL_DAYS.map((d) => (
          <button key={d.n} data-day={d.n} className={`itin-opt ${view === String(d.n) ? 'active' : ''} ${d.n === todayDay ? 'is-today' : ''}`} onClick={() => setView(String(d.n))}>
            <span className="itin-opt-phase" style={{ background: PHASE_COLOR[d.phase] }} />
            {d.n}
          </button>
        ))}
      </div>
      {view === 'full' ? <FullTripView S={S} /> : <DayDetail day={ALL_DAYS[parseInt(view) - 1]} S={S} active={active} onItemTap={setSelectedItem} places={places} />}

      {selectedItem && (
        <DetailModal
          it={selectedItem}
          status={S[selectedItem.id] || ''}
          setStatus={setStatus}
          paidPrice={paidPrices?.[selectedItem.id]}
          setPaidPrice={setPaidPrice}
          note={notes?.[selectedItem.id]}
          setNote={setNote}
          existingFile={files?.[selectedItem.id]}
          onFileChange={setFile}
          placeData={places?.[selectedItem.id]}
          getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
