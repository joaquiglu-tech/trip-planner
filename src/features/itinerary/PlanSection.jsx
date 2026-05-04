import { useState, useMemo } from 'react';
import { TYPE_LABEL_SHORT } from './utils';
import ItemCard from '../plan/ItemCard';

export default function PlanSection({ planItems, onItemTap, livePrices, expenseMap }) {
  const [expanded, setExpanded] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const types = useMemo(() => { const set = new Set(planItems.map(it => it.type)); return ['all', ...Array.from(set)]; }, [planItems]);
  const filtered = useMemo(() => {
    const items = typeFilter === 'all' ? planItems : planItems.filter(it => it.type === typeFilter);
    return items.sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz'));
  }, [planItems, typeFilter]);

  if (planItems.length === 0) return null;

  return (
    <details className="itin-plan-details" open={expanded} onToggle={e => setExpanded(e.target.open)}>
      <summary className="itin-plan-summary">Plan ({planItems.length})</summary>
      <div className="itin-plan-filters">
        {types.map(t => (<button key={t} className={`fp ${typeFilter === t ? 'fp-active' : ''}`} onClick={() => setTypeFilter(t)}>{t === 'all' ? 'All' : (TYPE_LABEL_SHORT[t] || t)}</button>))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(it => (
          <ItemCard key={it.id} it={it} onTap={onItemTap}
            livePrice={livePrices?.[it.id]?.perNight}
            expenseAmount={(expenseMap || {})[it.id] || 0} />
        ))}
      </div>
    </details>
  );
}
