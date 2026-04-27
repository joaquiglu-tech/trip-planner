import { ITEMS, itemCost, $f } from '../data/items';

export default function TopBar({ S, session, onMenuClick, onProfileClick }) {
  let selV = 0, confV = 0;
  ITEMS.forEach((it) => {
    const st = S[it.id] || '';
    const v = itemCost(it);
    if (st === 'sel' || st === 'conf') selV += v;
    if (st === 'conf') confV += v;
  });

  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.display_name || email;
  const initial = (name || '?')[0].toUpperCase();

  return (
    <div id="topbar">
      <div className="topbar-row">
        <button className="topbar-hamburger" onClick={onMenuClick} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div className="topbar-costs">
          <span className="cv-mini orange">{$f(selV)}</span>
          <span className="cv-mini green">{$f(confV)} ✓</span>
        </div>
        <button className="topbar-avatar" onClick={onProfileClick}>{initial}</button>
      </div>
    </div>
  );
}
