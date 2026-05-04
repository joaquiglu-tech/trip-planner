import { useState, useMemo } from 'react';
import { formatTime, TYPE_LABEL_SHORT } from './utils';

export default function PlanSection({ planItems, onItemTap }) {
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
      <div className="itin-plan-list">
        {filtered.map(it => (
          <div key={it.id} className={`item-card-compact ${it.status === 'conf' ? 'confirmed' : it.status === 'sel' ? 'selected' : ''}`} onClick={() => onItemTap(it)}>
            <div className="icc-left">
              <div className="icc-name">{it.name}</div>
              <div className="icc-sub">
                <span className="icc-type-badge">{TYPE_LABEL_SHORT[it.type] || it.type}</span>
                {it.start_time && <span> · {formatTime(it.start_time)}</span>}
                {it.end_time && <span> – {formatTime(it.end_time)}</span>}
              </div>
            </div>
            <div className="icc-right">
              <div className={`icc-status ${it.status}`}>{it.status === 'conf' ? 'Booked' : it.status === 'sel' ? 'Added' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
