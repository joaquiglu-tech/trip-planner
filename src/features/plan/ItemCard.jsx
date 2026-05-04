import { memo } from 'react';
import { $f, priceLabel } from '../../shared/hooks/useItems';

function ItemCard({ it, status, onTap, livePrice, expenseAmount }) {
  const st = status || it.status || '';
  const price = priceLabel(it, livePrice, expenseAmount);

  let timeInfo = '';
  if (it.type === 'stay' && it.check_in) timeInfo = `In ${it.check_in} · ${it.city}`;
  else if (it.type === 'stay') timeInfo = `${it.tier || it.city}`;
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
        {price.text && (
          <div className={`icc-price ${price.type === 'live' ? 'icc-price-live' : price.type === 'confirmed' ? 'icc-price-conf' : ''}`}>
            {price.text}
            {price.type === 'live' && <span className="icc-live-dot" />}
          </div>
        )}
        <div className={`icc-status ${st}`}>{st === 'conf' ? '✓' : st === 'sel' ? '●' : ''}</div>
      </div>
    </div>
  );
}

export default memo(ItemCard);
