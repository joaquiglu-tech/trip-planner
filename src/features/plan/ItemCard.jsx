import { memo } from 'react';
import { $f } from '../../shared/hooks/useItems';

const TYPE_LABEL = { stay: 'Stay', food: 'Food', activity: 'Activity', transport: 'Transport' };

function formatCardDatetime(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return dt; }
}

function ItemCard({ it, onTap, livePrice, expenseAmount, number }) {
  const st = it.status || '';
  // Price: confirmed (expense) > estimated > live per-night > nothing
  const displayPrice = expenseAmount > 0 ? $f(expenseAmount)
    : Number(it.estimated_cost) > 0 ? $f(it.estimated_cost)
    : livePrice > 0 ? `${$f(livePrice)}/n`
    : '';
  const priceIsConfirmed = expenseAmount > 0;

  const timeStr = [formatCardDatetime(it.start_time), formatCardDatetime(it.end_time)].filter(Boolean).join(' — ');

  return (
    <div className={`item-card-compact ${st === 'conf' ? 'confirmed' : st === 'sel' ? 'selected' : ''}`} onClick={() => onTap(it)}>
      {number && <div className="icc-number">{number}</div>}
      <div className="icc-left">
        <div className="icc-name">{it.name}</div>
        <div className="icc-sub">
          <span className="icc-type-label">{TYPE_LABEL[it.type] || it.type}</span>
          {timeStr && <span> · {timeStr}</span>}
        </div>
      </div>
      <div className="icc-right">
        {displayPrice && (
          <div className={`icc-price ${priceIsConfirmed ? 'icc-price-conf' : ''}`}>{displayPrice}</div>
        )}
      </div>
    </div>
  );
}

export default memo(ItemCard);
