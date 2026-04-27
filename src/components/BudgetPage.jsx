import { useState, useMemo } from 'react';
import { ITEMS, TYPE_LABEL, $f, itemCost } from '../data/items';

export default function BudgetPage({ active, S, paidPrices, files }) {
  const [showType, setShowType] = useState('all');

  const confirmed = useMemo(() => {
    return ITEMS.filter((it) => {
      const st = S[it.id] || '';
      return st === 'sel' || st === 'conf';
    });
  }, [S]);

  const byType = useMemo(() => {
    const g = {};
    confirmed.forEach((it) => {
      if (!g[it.type]) g[it.type] = [];
      g[it.type].push(it);
    });
    return g;
  }, [confirmed]);

  const totals = useMemo(() => {
    let estimated = 0, actual = 0, actualCount = 0;
    confirmed.forEach((it) => {
      estimated += itemCost(it);
      const paid = paidPrices[it.id];
      if (paid) { actual += paid; actualCount++; }
    });
    return { estimated, actual, actualCount, count: confirmed.length };
  }, [confirmed, paidPrices]);

  const typeOrder = ['stay', 'transport', 'activity', 'special', 'dining'];

  return (
    <div id="page-budget" className={`page ${active ? 'active' : ''}`}>
      {/* Summary */}
      <div className="budget-summary">
        <div className="budget-row-main">
          <div>
            <div className="budget-label">Estimated Total</div>
            <div className="budget-amount">{$f(totals.estimated)}</div>
          </div>
          <div>
            <div className="budget-label">Actual Spent</div>
            <div className="budget-amount green">{totals.actual > 0 ? $f(totals.actual) : '—'}</div>
          </div>
        </div>
        <div className="budget-meta">{totals.actualCount} of {totals.count} items have actual cost entered</div>
      </div>

      {/* Type filter */}
      <div className="budget-filters">
        <button className={`map-chip ${showType === 'all' ? 'active' : ''}`} onClick={() => setShowType('all')}>All</button>
        {typeOrder.map((t) => byType[t]?.length ? (
          <button key={t} className={`map-chip ${showType === t ? 'active' : ''}`} onClick={() => setShowType(t)}>
            {TYPE_LABEL[t]?.split(' ')[0]}
          </button>
        ) : null)}
      </div>

      {/* Items */}
      <div className="budget-list">
        {confirmed.filter((it) => showType === 'all' || it.type === showType).map((it) => {
          const st = S[it.id] || '';
          const est = itemCost(it);
          const paid = paidPrices[it.id];
          const hasFile = files[it.id];
          return (
            <div key={it.id} className="budget-item">
              <div className="bi-left">
                <div className="bi-name">{it.name}</div>
                <div className="bi-meta">{TYPE_LABEL[it.type]?.split(' ').slice(1).join(' ')} · {it.city}</div>
              </div>
              <div className="bi-right">
                <div className="bi-est">{est > 0 ? $f(est) : '—'}</div>
                {paid ? (
                  <div className="bi-paid">{$f(paid)}</div>
                ) : (
                  <div className="bi-no-paid">no cost</div>
                )}
                <div className="bi-indicators">
                  {st === 'conf' && <span className="bi-dot conf" title="Confirmed">✓</span>}
                  {hasFile && <span className="bi-dot file" title="Has document">📄</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
