import { ITEMS } from '../data/items';
import { TL_STOPS } from '../data/routes';

function getStayStatus(stayCity, S) {
  const opts = ITEMS.filter((i) => i.type === 'stay' && i.stayCity === stayCity);
  const conf = opts.find((i) => S[i.id] === 'conf');
  const sel = opts.find((i) => S[i.id] === 'sel');
  return conf ? 'conf' : sel ? 'sel' : 'none';
}

export default function Timeline({ S, onCityClick }) {
  return (
    <div className="card">
      <div className="card-hd">Trip Timeline — color = stay status</div>
      <div className="card-bd" style={{ padding: '10px 14px 4px' }}>
        <div className="tl-legend">
          <div><span className="leg-dot" style={{ background: '#d6d3d1' }}></span>Nothing selected</div>
          <div><span className="leg-dot" style={{ background: '#fb923c' }}></span>Selected</div>
          <div><span className="leg-dot" style={{ background: '#16a34a' }}></span>Confirmed ✓</div>
          <span style={{ fontSize: 11, color: '#a8a29e', marginLeft: 4 }}>· Tap stop to scroll to its items</span>
        </div>
        <div id="timeline">
          <div id="timeline-inner">
            {TL_STOPS.map((stop, i) => {
              const stSt = getStayStatus(stop.stayCity, S);
              const trSt = S[stop.transport.trId] || '';
              const trClass = trSt === 'conf' ? 'tl-tr-conf' : trSt === 'sel' ? 'tl-tr-sel' : 'tl-tr-none';
              const lineClass = trSt === 'conf' ? 'conf' : trSt === 'sel' ? 'sel' : 'none';
              return (
                <span key={stop.key} style={{ display: 'contents' }}>
                  {i > 0 && (
                    <div className="tl-arrow">
                      <div className={`tl-transport ${trClass}`}>{stop.transport.icon} {stop.transport.label}</div>
                      <div className={`tl-line ${lineClass}`}></div>
                    </div>
                  )}
                  <div className="tl-stop" onClick={() => onCityClick(stop.key)}>
                    <div className={`tl-dot ${stSt}`}></div>
                    <div className="tl-city">{stop.label}</div>
                    <div className="tl-nights">{stop.nights}n</div>
                  </div>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
