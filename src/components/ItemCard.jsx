import { memo } from 'react';
import { $f, usd, SUBCAT_BADGE } from '../data/items';

function ItemCard({ it, status, onTap }) {
  const st = status || '';

  let price = '';
  if (it.type === 'stay') price = $f(usd((it.pn || 0) * (it.nights || 1)));
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur * 2));
  else if (it.type === 'special') price = $f(usd((it.ppEur || 0) * 2));
  else if (it.type === 'dining') price = !it.eur ? '' : $f(usd(it.eur * 2));
  else if (it.priceLabel) price = it.priceLabel;

  // Date/time info
  let timeInfo = '';
  if (it.type === 'stay' && it.checkIn) timeInfo = `In ${it.checkIn} · ${it.nights}n`;
  else if (it.type === 'stay') timeInfo = `${it.nights}n · ${it.tier || it.city}`;
  else if (it.type === 'transport' && it.departTime && it.departTime !== 'TBD') timeInfo = `${it.departTime} · ${it.route || ''}`;
  else if (it.type === 'transport' && it.route) timeInfo = it.route;
  else if (it.type === 'activity' && it.hrs) timeInfo = `${it.hrs}h · ${it.city}`;
  else if (it.dish) timeInfo = it.dish;
  else timeInfo = it.city;

  return (
    <div className={`item-card-compact ${st === 'conf' ? 'confirmed' : st === 'sel' ? 'selected' : ''}`} onClick={() => onTap(it)}>
      <div className="icc-left">
        <div className="icc-name">{it.name}</div>
        <div className="icc-sub">{timeInfo}</div>
        {it.urgent && !st && <span className="icc-urgent">Book now</span>}
      </div>
      <div className="icc-right">
        {price && <div className="icc-price">{price}</div>}
        <div className={`icc-status ${st}`}>{st === 'conf' ? '✓' : st === 'sel' ? '●' : ''}</div>
      </div>
    </div>
  );
}

export default memo(ItemCard);
