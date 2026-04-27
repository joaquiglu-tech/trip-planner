import { ITEMS } from '../data/items';
import { TL_STOPS } from '../data/routes';
import { TRIP } from '../data/trip';

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
    <header className="topbar" role="banner">
      <div className="topbar-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10" cy="9" r="4.5" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14.5 5 L14.5 15 Q14.5 18 12.5 19.5 L10 21.5" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="10" cy="21.5" r="1" fill="#22C55E"/>
          </svg>
          <h1 className="topbar-title">Anisita</h1>
        </div>
        <div className="topbar-sub">
          <span className="topbar-dates">{TRIP.name}</span>
          <span className="topbar-progress">{booked}/{total}</span>
          <div className="topbar-bar" role="progressbar" aria-valuenow={pct}><div className="topbar-fill" style={{ width: pct + '%' }} /></div>
        </div>
      </div>
      <button className="topbar-avatar" onClick={onProfileClick} aria-label="Profile">{initial}</button>
    </header>
  );
}
