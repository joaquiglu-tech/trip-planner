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
  const { items, livePrices, expenses, updateItem, setStatus, addItem, deleteItem, addExpense, updateExpense, deleteExpense, email: userEmail, stops, files, setFile, removeFile, places, getPlaceData } = useTrip();
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

  // Parse sort value into field + direction
  const sortField = sortBy.includes('-') ? sortBy.split('-')[0] : sortBy;
  const sortDir = sortBy.includes('-desc') ? 'desc' : 'asc';

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
    if (sortField === 'default') return filtered;
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortField === 'price') return ((Number(a.estimated_cost) || 0) - (Number(b.estimated_cost) || 0)) * dir;
      if (sortField === 'date') return ((a.start_time || 'zz').localeCompare(b.start_time || 'zz')) * dir;
      if (sortField === 'status') {
        const order = { conf: 0, sel: 1, '': 2 };
        return ((order[a.status] ?? 2) - (order[b.status] ?? 2));
      }
      return 0;
    });
  }, [filtered, sortField, sortDir]);

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
        <FilterBar filters={filters} setFilters={setFilters} items={items} sortBy={sortBy} setSortBy={setSortBy} />
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
          expenseAmount={exp} itemExpenses={itemExpenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense}
          onClose={() => setSelectedItem(null)}
          onDelete={selectedItem.created_by ? () => { deleteItem(selectedItem.id); setSelectedItem(null); } : null}
        />;
      })()}
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addItem} stops={stops} userEmail={userEmail} />}
    </div>
  );
}
