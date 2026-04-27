import { $f, usd, SUBCAT_BADGE } from '../data/items';

export default function ItemCard({ it, status, onTap }) {
  const st = status || '';
  const stClass = st === 'conf' ? 'conf' : st === 'sel' ? 'sel' : '';

  let price = '';
  if (it.type === 'stay') price = `${$f(usd(it.pn || 0))}/n`;
  else if (it.type === 'activity') price = it.eur === 0 ? 'Free' : $f(usd(it.eur)) + '/pp';
  else if (it.type === 'special') price = $f(usd(it.ppEur || 0)) + '/pp';
  else if (it.type === 'dining') price = $f(usd(it.eur || 0)) + '/pp';
  else if (it.priceLabel) price = it.priceLabel;

  return (
    <div className={`sq-card ${stClass}`} onClick={() => onTap(it)}>
      {/* Thumbnail */}
      {it.imageUrl && (
        <div className="sq-thumb">
          <img src={it.imageUrl} alt="" loading="lazy" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
        </div>
      )}

      <div className="sq-body">
        <div className="sq-header">
          <div className="sq-badges">
            {it.urgent && <span className="badge b-urgent" style={{ fontSize: 8, padding: '1px 5px' }}>⚠️</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && (
              <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`} style={{ fontSize: 8, padding: '1px 5px' }}>{SUBCAT_BADGE[it.subcat].label}</span>
            )}
            {it.tier && <span className="badge b-bar" style={{ fontSize: 8, padding: '1px 5px' }}>{it.tier}</span>}
          </div>
        </div>

        <div className="sq-name">{it.name}</div>

        {it.dish && <div className="sq-dish">{it.dish}</div>}
        {!it.dish && it.type === 'stay' && <div className="sq-dish">{it.city} · {it.nights}n</div>}
        {!it.dish && it.type === 'activity' && <div className="sq-dish">{it.city}{it.hrs ? ` · ${it.hrs}h` : ''}</div>}

        <div className="sq-bottom">
          <span className="sq-price-main">{price}</span>
          <span className={`sq-status-dot ${st === 'conf' ? 'dot-conf' : st === 'sel' ? 'dot-sel' : ''}`} />
        </div>
      </div>
    </div>
  );
}
