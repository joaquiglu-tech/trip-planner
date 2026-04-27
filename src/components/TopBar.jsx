import { useRef, useEffect } from 'react';
import { ITEMS } from '../data/items';
import { TL_STOPS } from '../data/routes';

function getStopStatus(stop, S) {
  // Check stay
  const stayOpts = ITEMS.filter((i) => i.type === 'stay' && i.stayCity === stop.stayCity);
  const stayConf = stayOpts.some((i) => S[i.id] === 'conf');
  const staySel = stayOpts.some((i) => S[i.id] === 'sel');
  // Check transport
  const trSt = S[stop.transport.trId] || '';
  const trConf = trSt === 'conf';
  const trSel = trSt === 'sel';
  // Both confirmed = green, any selected = orange, else gray
  if (stayConf && trConf) return 'conf';
  if (staySel || stayConf || trSel || trConf) return 'partial';
  return 'none';
}

function countReady(S) {
  let ready = 0;
  TL_STOPS.forEach((stop) => {
    if (getStopStatus(stop, S) === 'conf') ready++;
  });
  return ready;
}

export default function TopBar({ S, session, onMenuClick, onProfileClick }) {
  const scrollRef = useRef(null);
  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.display_name || email;
  const initial = (name || '?')[0].toUpperCase();
  const ready = countReady(S);
  const total = TL_STOPS.length;

  return (
    <div id="topbar">
      <div className="topbar-row">
        <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div className="topbar-center">
          <div className="topbar-progress-label">
            <span>{ready}/{total} ready</span>
          </div>
          <div className="topbar-stepper" ref={scrollRef}>
            {TL_STOPS.map((stop, i) => {
              const status = getStopStatus(stop, S);
              return (
                <div key={stop.key} className="stepper-item">
                  {i > 0 && <div className={`stepper-line stepper-line-${status}`} />}
                  <div className={`stepper-dot stepper-dot-${status}`} title={stop.label} />
                  <span className="stepper-label">{stop.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button className="topbar-avatar" onClick={onProfileClick}>{initial}</button>
      </div>
    </div>
  );
}
