import { memo } from 'react';
import { priceLabel } from '../../shared/hooks/useItems';

const TYPE_ICON = { stay: '🏨', food: '🍽', activity: '🎟', transport: '✈' };

function ItemCard({ it, status, onTap, livePrice, expenseAmount }) {
  const st = status || it.status || '';
  const price = priceLabel(it, livePrice, expenseAmount);

  const detail = (() => {
    if (it.type === 'stay') return it.tier || '';
    if (it.type === 'transport') return it.routeLabel || it.route || '';
    if (it.type === 'food') return it.dish || '';
    if (it.type === 'activity' && it.hrs) return `${it.hrs}h`;
    return '';
  })();
  const timeInfo = [it.city, detail].filter(Boolean).join(' · ') || '';

  return (
    <div className={`item-card-compact ${st === 'conf' ? 'confirmed' : st === 'sel' ? 'selected' : ''}`} onClick={() => onTap(it)}>
      <div className="icc-type-icon">{TYPE_ICON[it.type] || '•'}</div>
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
