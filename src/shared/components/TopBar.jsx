export default function TopBar({ items, stops, session, onProfileClick, onRefresh }) {
  const stays = items.filter(it => it.type === 'stay');
  const cities = [...new Set(stays.map(it => it.city))];
  const booked = cities.filter(city => stays.some(it => it.city === city && it.status === 'conf')).length;
  const total = cities.length;
  const pct = total ? Math.round((booked / total) * 100) : 0;
  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.display_name || email;
  const initial = (name || '?')[0].toUpperCase();
  const tripName = stops?.length > 0 ? `${stops[0].name} to ${stops[stops.length - 1].name}` : 'Trip';

  return (
    <header className="topbar" role="banner">
      <div className="topbar-info">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="106" height="24" viewBox="-1 0 66 24" fill="none" aria-label="Anisita" role="img">
            <title>Anisita</title>
            <path d="M6.5 4 C6.5 12, 15 20, 15 20 L23 20 L27 20 L31 20 L40 20 L46.5 20 L61 20" stroke="#7C3AED" strokeWidth="0.5" strokeDasharray="1.5 2" strokeLinecap="round" opacity="0.2"/>
            <g stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M2 20 L6.5 5 L11 20"/><path d="M3.8 15 L9.2 15"/>
              <path d="M15 20 L15 11.5 Q15 8.5 19 8.5 Q23 8.5 23 11.5 L23 20"/>
              <path d="M27 9 L27 20"/><path d="M36 10 Q35.5 8.5 33.5 8.5 Q31 8.5 31 10.5 Q31 12.5 33.5 13.5 Q36 14.5 36 16.5 Q36 20 33.5 20 Q31 20 31 17.5"/>
              <path d="M40 9 L40 20"/><path d="M46.5 5 L46.5 17.5 Q46.5 20 49 20"/><path d="M44 9 L49 9"/>
              <path d="M61 10.5 Q60.5 8.5 57 8.5 Q53 8.5 53 12 L53 16 Q53 20 57 20 Q61 20 61 16.5 L61 9 L61 20"/>
            </g>
            <circle cx="27" cy="5.5" r="1.3" fill="#7C3AED"/><circle cx="40" cy="5.5" r="1.3" fill="#7C3AED"/>
            <circle cx="6.5" cy="4" r="2.5" fill="#7C3AED" opacity="0.15"/><circle cx="6.5" cy="4" r="1.2" fill="#7C3AED"/>
            <circle cx="61" cy="20" r="2.5" fill="#22C55E" opacity="0.15"/><circle cx="61" cy="20" r="1.2" fill="#22C55E"/>
          </svg>
        </div>
        <div className="topbar-sub">
          <span className="topbar-dates">{tripName}</span>
          <span className="topbar-progress">{booked}/{total}</span>
          <div className="topbar-bar" role="progressbar" aria-valuenow={pct}><div className="topbar-fill" style={{ width: pct + '%' }} /></div>
        </div>
      </div>
      <button className="topbar-avatar" onClick={onProfileClick} aria-label="Profile">{initial}</button>
    </header>
  );
}
