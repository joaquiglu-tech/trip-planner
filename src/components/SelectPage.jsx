import { useState, useMemo, useEffect } from 'react';
import { $f, itemCost } from '../lib/useItems';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';
import DetailModal from './DetailModal';
import AddItemModal from './AddItemModal';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', food: 'Food' };
const TYPE_ORDER = ['transport', 'stay', 'activity', 'food'];

export default function SelectPage({ active, items, livePrices, expenses, updateItem, setStatus, addItem, deleteItem, userEmail, files, setFile, removeFile, places, getPlaceData, filterCity, clearFilterCity }) {
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
    const bd = { transport: 0, stay: 0, activity: 0, food: 0, total: 0, count: 0, confCount: 0 };
    let estimated = 0, spent = 0;
    items.forEach((it) => {
      if (it.status !== 'sel' && it.status !== 'conf') return;
      const v = itemCost(it);
      // Group special + dining into "food"
      const typeKey = (it.type === 'dining' || it.type === 'special') ? 'food' : it.type;
      bd[typeKey] = (bd[typeKey] || 0) + v;
      bd.total += v;
      bd.count++;
      estimated += v;
      if (it.status === 'conf') bd.confCount++;
    });
    (expenses || []).forEach(e => { spent += Number(e.amount || 0); });
    return { ...bd, estimated, spent };
  }, [items, expenses]);

  const pct = breakdown.count ? Math.round((breakdown.confCount / breakdown.count) * 100) : 0;

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return items.filter((it) => {
      if (filters.type !== 'all') {
        if (filters.type === 'food') { if (it.type !== 'dining' && it.type !== 'special') return false; }
        else if (it.type !== filters.type) return false;
      }
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
    filtered.forEach((it) => { const k = (it.type === 'dining' || it.type === 'special') ? 'food' : it.type; if (!byType[k]) byType[k] = []; byType[k].push(it); });
    return {
      sections: TYPE_ORDER.filter(k => byType[k]?.length).map(k => ({ key: k, label: (TYPE_LABEL[k] || k) + ' (' + byType[k].length + ')', items: byType[k] })),
      groupByCity: false,
    };
  }, [filtered, filters.type]);

  return (
    <div id="page-select" className={`page ${active ? "active" : ""}`}>
      <div className="budget-summary" onClick={() => setSummaryCollapsed(!summaryCollapsed)} style={{ cursor: 'pointer' }}>
        <div className="budget-row-main">
          <div><div className="budget-label">Estimated</div><div className="budget-amount">{$f(breakdown.estimated)}</div></div>
          <div><div className="budget-label">Spent</div><div className="budget-amount green">{breakdown.spent > 0 ? $f(breakdown.spent) : '—'}</div></div>
        </div>
        {!summaryCollapsed && (
          <>
            <div className="prog-bar" style={{ marginTop: 8 }}><div className="prog-fill" style={{ width: pct + '%' }}></div></div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 3, textAlign: 'center' }}>{breakdown.confCount} booked / {breakdown.count} selected</div>
            <div className="breakdown-grid">
              {breakdown.stay > 0 && <div className="bd-row"><span>Stays</span><span>{$f(breakdown.stay)}</span></div>}
              {breakdown.activity > 0 && <div className="bd-row"><span>Activities</span><span>{$f(breakdown.activity)}</span></div>}
              {breakdown.food > 0 && <div className="bd-row"><span>Food</span><span>{$f(breakdown.food)}</span></div>}
              {breakdown.transport > 0 && <div className="bd-row"><span>Transport</span><span>{$f(breakdown.transport)}</span></div>}
              <div className="bd-row bd-total"><span>Total Estimated</span><span>{$f(breakdown.estimated)}</span></div>
            </div>
          </>
        )}
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
              {sectionItems.map((it) => {
                const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
                return <ItemCard key={it.id} it={it} status={it.status || ''} onTap={setSelectedItem} livePrice={livePrices?.[it.id]?.perNight} expenseAmount={exp} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (() => {
        const exp = (expenses || []).filter(e => e.item_id === selectedItem.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal
          it={selectedItem} status={selectedItem.status || ''} setStatus={setStatus}
          updateItem={updateItem}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight} livePriceRates={livePrices?.[selectedItem.id]?.allRates} expenseAmount={exp}
          onClose={() => setSelectedItem(null)}
          onDelete={selectedItem.created_by ? () => { deleteItem(selectedItem.id); setSelectedItem(null); } : null}
        />;
      })()}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addItem} userEmail={userEmail} />}
    </div>
  );
}
