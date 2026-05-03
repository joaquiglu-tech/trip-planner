import { useState, useMemo, useEffect } from 'react';
import { $f, itemCost } from '../lib/useItems';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';
import DetailModal from './DetailModal';
import AddItemModal from './AddItemModal';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', special: 'Special Meal', dining: 'Dining' };
const TYPE_ORDER = ['transport', 'stay', 'activity', 'special', 'dining'];

export default function SelectPage({ active, items, updateItem, setStatus, addItem, deleteItem, userEmail, files, setFile, removeFile, places, getPlaceData, filterCity, clearFilterCity }) {
  const [filters, setFilters] = useState({ type: 'all', city: 'all', status: 'all', urgent: false, search: '' });

  useEffect(() => {
    if (filterCity && active) {
      setFilters(f => ({ ...f, city: filterCity }));
      clearFilterCity();
    }
  }, [filterCity, active]);

  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const breakdown = useMemo(() => {
    const bd = { transport: 0, stay: 0, activity: 0, special: 0, dining: 0, total: 0, confTotal: 0, count: 0, confCount: 0 };
    items.forEach((it) => {
      if (it.status !== 'sel' && it.status !== 'conf') return;
      const v = itemCost(it);
      bd[it.type] = (bd[it.type] || 0) + v;
      bd.total += v;
      bd.count++;
      if (it.status === 'conf') { bd.confTotal += v; bd.confCount++; }
    });
    return bd;
  }, [items]);

  const pct = breakdown.count ? Math.round(breakdown.confCount / breakdown.count * 100) : 0;

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return items.filter((it) => {
      if (filters.type !== 'all' && it.type !== filters.type) return false;
      if (filters.city !== 'all' && it.city !== filters.city) return false;
      if (filters.urgent && !it.urgent) return false;
      const st = it.status || '';
      if (filters.status === 'unbooked' && st !== 'sel') return false;
      if (filters.status === 'sel' && st !== 'sel') return false;
      if (filters.status === 'conf' && st !== 'conf') return false;
      if (filters.status === 'none' && st !== '') return false;
      if (q) {
        const txt = (it.name + (it.description || '') + (it.dish || '') + (it.city || '')).toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const { sections, groupByCity } = useMemo(() => {
    const isTypeFilter = filters.type !== 'all';
    if (isTypeFilter) {
      const byCity = {};
      filtered.forEach((it) => { const c = it.city || 'Other'; if (!byCity[c]) byCity[c] = []; byCity[c].push(it); });
      const cities = Object.keys(byCity).sort();
      return { sections: cities.map(c => ({ key: c, label: c, items: byCity[c] })), groupByCity: true };
    }
    const byType = {};
    filtered.forEach((it) => { const k = it.type; if (!byType[k]) byType[k] = []; byType[k].push(it); });
    return {
      sections: TYPE_ORDER.filter(k => byType[k]?.length).map(k => ({ key: k, label: (TYPE_LABEL[k] || k) + ' (' + byType[k].length + ')', items: byType[k] })),
      groupByCity: false,
    };
  }, [filtered, filters.type]);

  return (
    <div id="page-select" className={`page ${active ? "active" : ""}`}>
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
                {breakdown.stay > 0 && <div className="bd-row"><span>Stays</span><span>{$f(breakdown.stay)}</span></div>}
                {breakdown.activity > 0 && <div className="bd-row"><span>Activities</span><span>{$f(breakdown.activity)}</span></div>}
                {breakdown.special > 0 && <div className="bd-row"><span>Special Meals</span><span>{$f(breakdown.special)}</span></div>}
                {breakdown.dining > 0 && <div className="bd-row"><span>Dining</span><span>{$f(breakdown.dining)}</span></div>}
                <div className="bd-row bd-total"><span>Total Selected</span><span>{$f(breakdown.total)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="planner-sticky-bar">
        <FilterBar filters={filters} setFilters={setFilters} items={items} />
      </div>
      <button className="add-item-btn" onClick={() => setShowAddModal(true)}>+ Add something new</button>

      <div id="items-container">
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-title">No items found</div>
            <div className="empty-state-text">Try adjusting your filters or search.</div>
          </div>
        )}
        {sections.map(({ key, label, items: sectionItems }) => (
          <div key={key}>
            <div className="sect-title">{groupByCity ? `${label} (${sectionItems.length})` : label}</div>
            <div className="items-grid">
              {sectionItems.map((it) => (
                <ItemCard key={it.id} it={it} status={it.status || ''} onTap={setSelectedItem} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <DetailModal
          it={selectedItem} status={selectedItem.status || ''} setStatus={setStatus}
          updateItem={updateItem}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
          onDelete={selectedItem.created_by ? () => { deleteItem(selectedItem.id); setSelectedItem(null); } : null}
        />
      )}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addItem} userEmail={userEmail} />}
    </div>
  );
}
