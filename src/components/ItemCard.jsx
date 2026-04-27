import { $f, usd, SUBCAT_BADGE } from '../data/items';

export default function ItemCard({ it, status, onTap }) {
  const st = status || '';
  const stClass = st === 'conf' ? 'conf' : st === 'sel' ? 'sel' : '';

  // Total cost for couple / full stay
  let price = '';
  let priceNote = '';
  if (it.type === 'stay') {
    price = $f(usd((it.pn || 0) * (it.nights || 1)));
    priceNote = `${it.nights}n total`;
  } else if (it.type === 'activity') {
    if (it.eur === 0) { price = 'Free'; }
    else { price = $f(usd(it.eur * 2)); priceNote = '2 ppl'; }
  } else if (it.type === 'special') {
    price = $f(usd((it.ppEur || 0) * 2));
    priceNote = '2 ppl';
  } else if (it.type === 'dining') {
    if (!it.eur || it.eur === 0) { price = 'Free'; }
    else { price = $f(usd(it.eur * 2)); priceNote = '2 ppl'; }
  } else if (it.priceLabel) {
    price = it.priceLabel;
  }

  return (
    <div className={`sq-card ${stClass}`} onClick={() => onTap(it)}>
      <div className="sq-body">
        <div className="sq-header">
          <div className="sq-badges">
            {it.urgent && <span className="badge b-urgent" style={{ fontSize: 8, padding: '1px 5px' }}>⚠️</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && (
              <span className={`badge ${SUBCAT_BADGE[it.subcat].cls}`} style={{ fontSize: 8, padding: '1px 5px' }}>{SUBCAT_BADGE[it.subcat].label}</span>
            )}
            {it.tier && <span className="badge b-bar" style={{ fontSize: 8, padding: '1px 5px' }}>{it.tier}</span>}
          </div>
          <span className={`sq-status-dot ${st === 'conf' ? 'dot-conf' : st === 'sel' ? 'dot-sel' : ''}`} />
        </div>
        <div className="sq-name">{it.name}</div>
        {it.dish && <div className="sq-dish">{it.dish}</div>}
        {!it.dish && it.type === 'stay' && <div className="sq-dish">{it.city} · {it.nights}n</div>}
        {!it.dish && it.type === 'activity' && <div className="sq-dish">{it.city}{it.hrs ? ` · ${it.hrs}h` : ''}</div>}
        {!it.dish && it.type === 'transport' && <div className="sq-dish">{it.city}</div>}
        <div className="sq-bottom">
          <div className="sq-price-group">
            <span className="sq-price-main">{price}</span>
            {priceNote && <span className="sq-price-note">{priceNote}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
