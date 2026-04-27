import { useState, useMemo, useCallback, memo } from 'react';
import { ITEMS, itemCost, $f } from '../data/items';
import Timeline from './Timeline';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';
import DetailModal from './DetailModal';
import AddItemModal from './AddItemModal';

const TYPE_LABEL = { transport: '🚗 Transport', stay: '🏨 Stay', activity: '🎟️ Activity', special: '⭐ Special Meal', dining: '🍝 Dining', custom: '📌 Added by You' };
const TYPE_ORDER = ['transport', 'stay', 'activity', 'special', 'dining'];

const MemoItemCard = memo(ItemCard);

export default function SelectPage({ active, S, setStatus, onRefresh, customItems, addItem, deleteItem, userEmail, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData }) {
  const [filters, setFilters] = useState({ type: 'all', city: 'all', status: 'all', urgent: false, search: '' });
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const customAsItems = useMemo(() => {
    return (customItems || []).map((c) => ({
      id: `custom-${c.id}`, customId: c.id, type: c.type || 'dining', city: c.city || '', name: c.name || '',
      desc: c.desc_text || '', dish: c.dish || '', link: c.link || '', imageUrl: c.image_url || '',
      priceLabel: c.price_label || '', src: 'Added by ' + (c.created_by || '').split('@')[0], isCustom: true, def: 'sel',
    }));
  }, [customItems]);

  const allItems = useMemo(() => [...ITEMS, ...customAsItems], [customAsItems]);

  // Cost breakdown by type
  const breakdown = useMemo(() => {
    const bd = { transport: 0, stay: 0, activity: 0, special: 0, dining: 0, total: 0, confTotal: 0, count: 0, confCount: 0 };
    ITEMS.forEach((it) => {
      const st = S[it.id] || '';
      if (st !== 'sel' && st !== 'conf') return;
      const v = itemCost(it);
      bd[it.type] = (bd[it.type] || 0) + v;
      bd.total += v;
      bd.count++;
      if (st === 'conf') { bd.confTotal += v; bd.confCount++; }
    });
    return bd;
  }, [S]);

  const pct = breakdown.count ? Math.round(breakdown.confCount / breakdown.count * 100) : 0;

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return allItems.filter((it) => {
      if (filters.type !== 'all' && it.type !== filters.type && !(it.isCustom && filters.type === 'custom')) return false;
      if (filters.city !== 'all' && it.city !== filters.city) return false;
      if (filters.urgent && !it.urgent) return false;
      const st = S[it.id] || it.def || '';
      if (filters.status === 'sel' && st !== 'sel') return false;
      if (filters.status === 'conf' && st !== 'conf') return false;
      if (filters.status === 'none' && st !== '') return false;
      if (q) {
        const txt = (it.name + (it.desc || '') + (it.dish || '') + (it.city || '')).toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [S, filters, allItems]);

  // Group items: if filtering by a specific type, sub-group by city. Otherwise group by type.
  const { sections, groupByCity } = useMemo(() => {
    const isTypeFilter = filters.type !== 'all';
    if (isTypeFilter) {
      // Group by city
      const byCity = {};
      filtered.forEach((it) => {
        const c = it.city || 'Other';
        if (!byCity[c]) byCity[c] = [];
        byCity[c].push(it);
      });
      const cities = Object.keys(byCity).sort();
      return { sections: cities.map(c => ({ key: c, label: c, items: byCity[c] })), groupByCity: true };
    }
    // Group by type
    const byType = {};
    filtered.forEach((it) => {
      const k = it.isCustom ? 'custom' : it.type;
      if (!byType[k]) byType[k] = [];
      byType[k].push(it);
    });
    const order = [...TYPE_ORDER, 'custom'];
    return {
      sections: order.filter(k => byType[k]?.length).map(k => ({ key: k, label: TYPE_LABEL[k] + ' (' + byType[k].length + ')', items: byType[k] })),
      groupByCity: false,
    };
  }, [filtered, filters.type]);

  const onCityClick = useCallback((city) => { setFilters((f) => ({ ...f, city })); }, []);

  const handlePullRefresh = useCallback(async () => {
    setPulling(true);
    if (onRefresh) await onRefresh();
    setPulling(false);
  }, [onRefresh]);

  return (
    <div id="page-select" className={`page ${active ? 'active' : ''}`}>
      {/* Summary card */}
      <div className="card summary-card" onClick={() => setSummaryCollapsed(!summaryCollapsed)}>
        <div className="card-bd" style={{ padding: summaryCollapsed ? '8px 12px' : 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <div><span className="summary-label">Selected </span><span className="summary-val orange">{$f(breakdown.total)}</span></div>
              <div><span className="summary-label">Confirmed </span><span className="summary-val green">{$f(breakdown.confTotal)}</span></div>
            </div>
            <span style={{ fontSize: 10, color: '#a8a29e' }}>{summaryCollapsed ? '▼' : '▲'}</span>
          </div>
          {!summaryCollapsed && (
            <>
              <div className="prog-bar" style={{ marginTop: 8 }}><div className="prog-fill" style={{ width: pct + '%' }}></div></div>
              <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 3 }}>{breakdown.confCount} confirmed / {breakdown.count} selected</div>
              <div className="breakdown-grid">
                {breakdown.stay > 0 && <div className="bd-row"><span>🏨 Stays</span><span>{$f(breakdown.stay)}</span></div>}
                {breakdown.activity > 0 && <div className="bd-row"><span>🎟️ Activities</span><span>{$f(breakdown.activity)}</span></div>}
                {breakdown.special > 0 && <div className="bd-row"><span>⭐ Special Meals</span><span>{$f(breakdown.special)}</span></div>}
                {breakdown.dining > 0 && <div className="bd-row"><span>🍝 Dining</span><span>{$f(breakdown.dining)}</span></div>}
                <div className="bd-row bd-total"><span>Total Selected</span><span>{$f(breakdown.total)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      <Timeline S={S} onCityClick={onCityClick} />
      <FilterBar filters={filters} setFilters={setFilters} />

      {pulling && <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--text-muted)' }}>Refreshing...</div>}
      <button className="pull-refresh-btn" onClick={handlePullRefresh}>↻ Refresh</button>
      <button className="add-item-btn" onClick={() => setShowAddModal(true)}>+ Add item by URL</button>

      <div id="items-container">
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No items found</div>
            <div className="empty-state-text">Try adjusting your filters or search to find what you're looking for.</div>
          </div>
        )}
        {sections.map(({ key, label, items }) => (
          <div key={key}>
            <div className="sect-title">{groupByCity ? `📍 ${label} (${items.length})` : label}</div>
            <div className="items-grid">
              {items.map((it) => (
                <MemoItemCard key={it.id} it={it} status={S[it.id] || ''} onTap={setSelectedItem} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <DetailModal
          it={selectedItem}
          status={S[selectedItem.id] || ''}
          setStatus={setStatus}
          paidPrice={paidPrices?.[selectedItem.id]}
          setPaidPrice={setPaidPrice}
          note={notes?.[selectedItem.id]}
          setNote={setNote}
          existingFile={files?.[selectedItem.id]}
          onFileChange={setFile}
          placeData={places?.[selectedItem.id]}
          getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
          onDelete={selectedItem.isCustom ? () => { deleteItem(selectedItem.customId); setSelectedItem(null); } : null}
        />
      )}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addItem} userEmail={userEmail} />}
    </div>
  );
}
