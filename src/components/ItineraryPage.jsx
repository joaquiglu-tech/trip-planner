import { useEffect, useRef } from 'react';

function CityMap({ id, lat, lng, zoom, label, active }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!active || !window.google || mapInstance.current) return;
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      streetViewControl: false, mapTypeControl: true,
    });
    new window.google.maps.Marker({
      position: { lat, lng }, map: m, title: label,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#1d4ed8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    mapInstance.current = m;
  }, [active]);

  useEffect(() => {
    if (active && mapInstance.current) window.google?.maps?.event?.trigger(mapInstance.current, 'resize');
  }, [active]);

  return <div ref={mapRef} className="map-wrap" style={{ height: id === 'rome' ? 270 : 250 }}></div>;
}

export default function ItineraryPage({ active, setActiveTab }) {
  return (
    <div id="page-itinerary" className={`page ${active ? 'active' : ''}`}>
      <div className="card">
        <div className="card-hd">🇪🇸 Spain — Jul 12–20</div>
        <div className="card-bd">
          <div className="info-row"><div className="info-date">Jul 12–14 · 2n</div><div><strong>Madrid</strong> — Family stay. Fly in Lima→Madrid 13:05. Prado, La Latina tapas crawl, reggaeton night.</div></div>
          <div className="info-row"><div className="info-date">Jul 14–18 · 4n</div><div><strong>Menorca</strong> — Family stay. Cala Macarella, caldereta de langosta in Fornells, Cova d'en Xoroi sunset.</div></div>
          <div className="info-row"><div className="info-date">Jul 18–20 · 2n</div><div><strong>Malaga</strong> — Hotel. Padel P1 semis Jul 18, finals Jul 19. El Tintero sardines. Alcazaba. <a href="https://www.premierpadel.com" target="_blank" rel="noopener" className="ext">Tickets ↗</a></div></div>
        </div>
      </div>
      <div className="card bc">
        <div className="card-hd">✈️ 🇮🇹 Rome · 4 nights · Jul 20–24</div>
        <div className="g2" style={{ alignItems: 'start' }}>
          <div className="card-bd">
            <div className="info-row"><div className="info-date">Jul 20 pm</div><div>Land FCO. Trastevere walk. Roscioli dinner (pre-booked).</div></div>
            <div className="info-row"><div className="info-date">Jul 21</div><div>Colosseum + Forum + Palatine (8:30am). Trevi/Navona after 8pm.</div></div>
            <div className="info-row"><div className="info-date">Jul 22</div><div>{"Vatican + Sistine + St Peter's (9am). Galleria Borghese afternoon."}</div></div>
            <div className="info-row"><div className="info-date">Jul 23</div><div>Libre. Testaccio market, Jewish Ghetto, Pizzarium. Fancy dinner (La Pergola or Il Pagliaccio).</div></div>
            <div className="info-row"><div className="info-date">Jul 24 9am</div><div>Frecciarossa → Florence (1h30). Pick up car. Road trip begins.</div></div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="https://ticketing.colosseo.it/en/" target="_blank" rel="noopener" className="ext">Colosseum ↗</a>
              <a href="https://m.museivaticani.va/content/museivaticani-mobile/en.html" target="_blank" rel="noopener" className="ext">Vatican ↗</a>
              <a href="https://romecavalieri.com/lapergola.php" target="_blank" rel="noopener" className="ext">La Pergola ⭐⭐⭐ ↗</a>
            </div>
          </div>
          <div>
            <CityMap id="rome" lat={41.9028} lng={12.4964} zoom={13} label="Rome" active={active} />
            <div style={{ padding: 8, display: 'flex', gap: 6 }}>
              <a href="https://www.google.com/maps/@41.9028,12.4964,14z" target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>📍 Maps</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=41.9028,12.4964" target="_blank" rel="noopener" className="gmaps-btn dark" style={{ flex: 1 }}>🧭 Dir</a>
            </div>
          </div>
        </div>
      </div>
      <div className="card oc" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('roadtrip')}>
        <div className="card-hd">🚗 Road Trip — Florence Loop · Jul 24–Aug 1 · 8 nights</div>
        <div className="card-bd" style={{ fontSize: 13 }}>
          Florence → Tuscany → Lerici → Bergamo → Como → Garda → Verona → Bologna → Florence → Venice
          <br /><br />
          <span style={{ background: '#ea580c', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>Full detail →</span>
        </div>
      </div>
      <div className="card bc">
        <div className="card-hd">🚂 🇮🇹 Venice · Aug 1–2</div>
        <div className="g2" style={{ alignItems: 'start' }}>
          <div className="card-bd">
            <div className="info-row"><div className="info-date">Aug 1 ~5pm</div><div>{"Train from Florence after car drop. Rialto market. Bacaro crawl: All'Arco → Do Mori → Schiavi."}</div></div>
            <div className="info-row"><div className="info-date">Aug 2</div><div>{"7am Rialto fish market (Bourdain). Doge's Palace + St Mark's. Burano + Torcello. Dinner: Osteria alle Testiere."}</div></div>
            <div className="info-row"><div className="info-date">Aug 2 ~3pm</div><div>Fly VCE→MAD. Arrive ~7pm. Sleep. Fly Lima Aug 3, 11am.</div></div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="https://palazzoducale.visitmuve.it/en/home/" target="_blank" rel="noopener" className="ext">{"Doge's Palace ↗"}</a>
              <a href="https://www.osterialletestiere.it/" target="_blank" rel="noopener" className="ext">Testiere — Book NOW ↗</a>
              <a href="https://www.vueling.com" target="_blank" rel="noopener" className="ext">Vueling VCE→MAD ↗</a>
            </div>
          </div>
          <div>
            <CityMap id="venice" lat={45.4408} lng={12.3155} zoom={13} label="Venice" active={active} />
            <div style={{ padding: 8, display: 'flex', gap: 6 }}>
              <a href="https://www.google.com/maps/@45.4408,12.3155,14z" target="_blank" rel="noopener" className="gmaps-btn" style={{ flex: 1 }}>📍 Maps</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=45.4408,12.3155" target="_blank" rel="noopener" className="gmaps-btn dark" style={{ flex: 1 }}>🧭 Dir</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
