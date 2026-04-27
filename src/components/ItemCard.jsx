import { memo } from 'react';
import { $f, usd, SUBCAT_BADGE } from '../data/items';

const TYPE_EMOJI = { stay: '🏨', activity: '🎟️', special: '⭐', dining: '🍝', transport: '🚗' };

function ItemCard({ it, status, onTap, photoUrl: googlePhoto }) {
  const st = status || '';

  let price = '';
  let unit = '';
  if (it.type === 'stay') { price = $f(usd((it.pn || 0) * (it.nights || 1))); unit = `${it.nights}n`; }
  else if (it.type === 'activity') { price = it.eur === 0 ? 'Free' : $f(usd(it.eur * 2)); unit = it.eur ? '2p' : ''; }
  else if (it.type === 'special') { price = $f(usd((it.ppEur || 0) * 2)); unit = '2p'; }
  else if (it.type === 'dining') { price = !it.eur ? '' : $f(usd(it.eur * 2)); unit = it.eur ? '2p' : ''; }
  else if (it.priceLabel) { price = it.priceLabel; }

  const photoUrl = googlePhoto || it.imageUrl || null;

  return (
    <div className={`item-card ${st === 'conf' ? 'confirmed' : st === 'sel' ? 'selected' : ''}`} onClick={() => onTap(it)}>
      {/* Photo or placeholder */}
      <div className="ic-photo">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          TYPE_EMOJI[it.type] || '📌'
        )}
        {st && <div className={`ic-status-dot ${st}`} />}
      </div>

      <div className="ic-content">
        <div className="ic-top-row">
          <h3 className="ic-title">{it.name}</h3>
          {price && (
            <div className="ic-price-block">
              <span className="ic-price-val">{price}</span>
              {unit && <span className="ic-price-unit"> {unit}</span>}
            </div>
          )}
        </div>

        {it.dish && <p className="ic-subtitle">{it.dish}</p>}
        {!it.dish && it.type === 'stay' && <p className="ic-subtitle">{it.tier} · {it.city}</p>}
        {!it.dish && it.type === 'activity' && <p className="ic-subtitle">{it.city}{it.hrs ? ` · ${it.hrs}h` : ''}</p>}
        {!it.dish && it.type === 'transport' && <p className="ic-subtitle">{it.city}</p>}

        <div className="ic-tags">
          {it.urgent && <span className="ic-tag urgent">Book now</span>}
          {it.subcat && SUBCAT_BADGE[it.subcat] && <span className="ic-tag">{SUBCAT_BADGE[it.subcat].label}</span>}
        </div>
      </div>
    </div>
  );
}

export default memo(ItemCard);
