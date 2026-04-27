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

export default function TopBar({ S, session, onProfileClick }) {
  const { booked, total } = countBooked(S);
  const pct = total ? Math.round((booked / total) * 100) : 0;
  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.display_name || email;
  const initial = (name || '?')[0].toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-info">
        <h1 className="topbar-title">Spain & Italy 2026</h1>
        <div className="topbar-sub">
          <span className="topbar-dates">Jul 12 – Aug 2</span>
          <span className="topbar-progress">{booked}/{total} booked</span>
          <div className="topbar-bar"><div className="topbar-fill" style={{ width: pct + '%' }} /></div>
        </div>
      </div>
      <button className="topbar-avatar" onClick={onProfileClick}>{initial}</button>
    </header>
  );
}
