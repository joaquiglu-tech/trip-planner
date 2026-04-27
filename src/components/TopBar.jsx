import { ITEMS } from '../data/items';
import { TL_STOPS } from '../data/routes';

function countBooked(S) {
  let booked = 0, total = 0;
  TL_STOPS.forEach((stop) => {
    total++;
    const stayOpts = ITEMS.filter((i) => i.type === 'stay' && i.stayCity === stop.stayCity);
    const stayConf = stayOpts.some((i) => S[i.id] === 'conf');
    const trConf = (S[stop.transport.trId] || '') === 'conf';
    if (stayConf && trConf) booked++;
  });
  return { booked, total };
}

export default function TopBar({ S, session, onMenuClick, onProfileClick }) {
  const { booked, total } = countBooked(S);
  const pct = total ? Math.round((booked / total) * 100) : 0;

  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.display_name || email;
  const initial = (name || '?')[0].toUpperCase();

  return (
    <div id="topbar">
      <div className="topbar-row">
        <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div className="topbar-center">
          <div className="topbar-title">Spain & Italy 2026</div>
          <div className="topbar-dates">Jul 12 – Aug 2</div>
        </div>
        <div className="topbar-pill">
          <div className="pill-bar"><div className="pill-fill" style={{ width: pct + '%' }} /></div>
          <span className="pill-text">{booked}/{total}</span>
        </div>
        <button className="topbar-avatar" onClick={onProfileClick}>{initial}</button>
      </div>
    </div>
  );
}
