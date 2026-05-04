import { useState, useMemo, useEffect } from 'react';
import { itemCost } from '../../shared/hooks/useItems';
import { useTrip } from '../../shared/hooks/TripContext';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';
import DetailModal from '../../shared/components/DetailModal';
import AddItemModal from '../../shared/modals/AddItemModal';
import BudgetSummary from '../expenses/BudgetSummary';

const TYPE_LABEL = { transport: 'Transport', stay: 'Stay', activity: 'Activity', food: 'Food' };
const TYPE_ORDER = ['transport', 'stay', 'activity', 'food'];

export default function SelectPage({ active, filterCity, clearFilterCity }) {
  const { items, livePrices, expenses, updateItem, setStatus, addItem, deleteItem, addExpense, updateExpense, email: userEmail, stops, files, setFile, removeFile, places, getPlaceData } = useTrip();
  const [filters, setFilters] = useState({ type: 'all', city: 'all', status: 'all', search: '' });

  useEffect(() => {
    if (filterCity && active) {
      setFilters(f => ({ ...f, city: filterCity }));
      clearFilterCity();
    }
  }, [filterCity, active]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  const expenseMap = useMemo(() => {
    const map = {};
    (expenses || []).forEach(e => { map[e.item_id] = (map[e.item_id] || 0) + Number(e.amount || 0); });
    return map;
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return items.filter((it) => {
      if (filters.type !== 'all') {
        if (filters.type === 'food') { if (it.type !== 'food') return false; }
        else if (it.type !== filters.type) return false;
      }
      if (filters.city !== 'all' && it.city !== filters.city) return false;
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

  const sorted = useMemo(() => {
    if (sortBy === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'price') return [...filtered].sort((a, b) => (Number(b.estimated_cost) || 0) - (Number(a.estimated_cost) || 0));
    if (sortBy === 'status') return [...filtered].sort((a, b) => {
      const order = { conf: 0, sel: 1, '': 2 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
    return filtered;
  }, [filtered, sortBy]);

  const { sections, groupByCity } = useMemo(() => {
    const isTypeFilter = filters.type !== 'all';
    if (isTypeFilter) {
      const byCity = {};
      sorted.forEach((it) => { const c = it.city || 'Other'; if (!byCity[c]) byCity[c] = []; byCity[c].push(it); });
      const cities = Object.keys(byCity).sort();
      return { sections: cities.map(c => ({ key: c, label: c, items: byCity[c] })), groupByCity: true };
    }
    const byType = {};
    sorted.forEach((it) => { const k = it.type; if (!byType[k]) byType[k] = []; byType[k].push(it); });
    return {
      sections: TYPE_ORDER.filter(k => byType[k]?.length).map(k => ({ key: k, label: (TYPE_LABEL[k] || k) + ' (' + byType[k].length + ')', items: byType[k] })),
      groupByCity: false,
    };
  }, [sorted, filters.type]);

  return (
    <div id="page-select" className={`page ${active ? "active" : ""}`}>
      <BudgetSummary items={items} expenses={expenses} />

      <div className="planner-sticky-bar">
        <FilterBar filters={filters} setFilters={setFilters} items={items} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sort:</span>
          {[{ v: 'default', l: 'Default' }, { v: 'name', l: 'Name' }, { v: 'price', l: 'Price' }, { v: 'status', l: 'Status' }].map(s => (
            <button key={s.v} className={`fp ${sortBy === s.v ? 'fp-active' : ''}`} onClick={() => setSortBy(s.v)} style={{ padding: '4px 10px', fontSize: 10 }}>{s.l}</button>
          ))}
        </div>
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
                <ItemCard key={it.id} it={it} onTap={setSelectedItem} livePrice={livePrices?.[it.id]?.perNight} expenseAmount={expenseMap[it.id] || 0} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (() => {
        const liveItem = items.find(i => i.id === selectedItem.id) || selectedItem;
        const itemExpenses = (expenses || []).filter(e => e.item_id === liveItem.id);
        const exp = itemExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal
          it={liveItem} status={liveItem.status || ''} setStatus={setStatus}
          updateItem={updateItem} stops={stops}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight} livePriceRates={livePrices?.[selectedItem.id]?.allRates}
          expenseAmount={exp} itemExpenses={itemExpenses} addExpense={addExpense} updateExpense={updateExpense}
          onClose={() => setSelectedItem(null)}
          onDelete={selectedItem.created_by ? () => { deleteItem(selectedItem.id); setSelectedItem(null); } : null}
        />;
      })()}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addItem} stops={stops} userEmail={userEmail} />}
    </div>
  );
}
