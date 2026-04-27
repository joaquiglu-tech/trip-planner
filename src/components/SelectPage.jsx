import { useState, useMemo, useCallback } from 'react';
import { ITEMS, itemCost, $f, BASE_COST } from '../data/items';
import Timeline from './Timeline';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';

const TYPE_LABEL = { transport: '🚗 Transport', stay: '🏨 Stay', activity: '🎟️ Activity', special: '⭐ Special Meal', dining: '🍝 Dining' };
const TYPE_ORDER = ['transport', 'stay', 'activity', 'special', 'dining'];

export default function SelectPage({ active, S, setStatus, updatedBy, onRefresh }) {
  const [filters, setFilters] = useState({ type: 'all', city: 'all', status: 'all', urgent: false, search: '' });
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [pulling, setPulling] = useState(false);

  const { selV, confV, confCount, totalItems } = useMemo(() => {
    let selV = 0, confV = 0, confCount = 0, totalItems = 0;
    ITEMS.forEach((it) => {
      const st = S[it.id] || '';
      const v = itemCost(it);
      if (st === 'sel' || st === 'conf') selV += v;
      if (st === 'conf') { confV += v; confCount++; }
      if (st !== '') totalItems++;
    });
    return { selV, confV, confCount, totalItems };
  }, [S]);

  const pct = totalItems ? Math.round(confCount / totalItems * 100) : 0;

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return ITEMS.filter((it) => {
      if (filters.type !== 'all' && it.type !== filters.type) return false;
      if (filters.city !== 'all' && it.city !== filters.city) return false;
      if (filters.urgent && !it.urgent) return false;
      const st = S[it.id] || '';
      if (filters.status === 'sel' && st !== 'sel') return false;
      if (filters.status === 'conf' && st !== 'conf') return false;
      if (filters.status === 'none' && st !== '') return false;
      if (q) {
        const txt = (it.name + (it.desc || '') + (it.dish || '') + (it.city || '')).toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [S, filters]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((it) => { if (!g[it.type]) g[it.type] = []; g[it.type].push(it); });
    return g;
  }, [filtered]);

  function onCityClick(city) {
    setFilters((f) => ({ ...f, city }));
  }

  // Pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    setPulling(true);
    if (onRefresh) await onRefresh();
    setPulling(false);
  }, [onRefresh]);

  return (
    <div id="page-select" className={`page ${active ? 'active' : ''}`}>
      {/* Collapsible Summary */}
      <div className="card summary-card" onClick={() => setSummaryCollapsed(!summaryCollapsed)}>
        <div className="card-bd" style={{ padding: summaryCollapsed ? '8px 12px' : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <div>
                <span className="summary-label">Selected </span>
                <span className="summary-val orange">{$f(selV)}</span>
              </div>
              <div>
                <span className="summary-label">Confirmed </span>
                <span className="summary-val green">{$f(confV)}</span>
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#a8a29e' }}>{summaryCollapsed ? '▼' : '▲'}</span>
          </div>
          {!summaryCollapsed && (
            <>
              <div style={{ marginTop: 8, fontSize: 11, color: '#78716c' }}>
                + Base costs: <strong style={{ color: '#a8a29e' }}>$4,795</strong> · Total sel: <strong style={{ color: '#fb923c' }}>{$f(selV + BASE_COST)}</strong> · Total conf: <strong style={{ color: '#4ade80' }}>{$f(confV + BASE_COST)}</strong>
              </div>
              <div className="prog-bar" style={{ marginTop: 6 }}><div className="prog-fill" style={{ width: pct + '%' }}></div></div>
              <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 3 }}>{confCount} confirmed / {totalItems} selected</div>
            </>
          )}
        </div>
      </div>

      <Timeline S={S} onCityClick={onCityClick} />
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Pull to refresh indicator */}
      {pulling && <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--text-muted)' }}>Refreshing...</div>}
      <button className="pull-refresh-btn" onClick={handlePullRefresh}>↻ Refresh</button>

      <div id="items-container">
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No items match your filters.</div>
        )}
        {TYPE_ORDER.map((type) => {
          const group = grouped[type];
          if (!group || !group.length) return null;
          return (
            <div key={type}>
              <div className={`sect-title ic-section-${type}`}>{TYPE_LABEL[type] || type} ({group.length})</div>
              <div className="items-grid">
                {group.map((it) => (
                  <ItemCard key={it.id} it={it} status={S[it.id] || ''} setStatus={setStatus} updatedBy={updatedBy?.[it.id]} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
