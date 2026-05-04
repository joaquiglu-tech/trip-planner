import { useState, useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import { useTrip } from '../../shared/hooks/TripContext';
import DetailModal from '../../shared/components/DetailModal';
import BudgetSummary from './BudgetSummary';

export default function BudgetPage({ active }) {
  const { items, stops, livePrices, expenses, updateItem, deleteItem, setStatus, addExpense, updateExpense, deleteExpense, files, setFile, removeFile, places, getPlaceData, email: userEmail } = useTrip();
  const [selectedItem, setSelectedItem] = useState(null);

  // Confirmed: expenses linked to items
  const confirmedExpenses = useMemo(() => {
    return (expenses || []).filter(e => e.item_id).map(e => {
      const item = items.find(it => it.id === e.item_id);
      const stop = item?.stop_ids?.[0] ? stops?.find(s => s.id === item.stop_ids[0]) : null;
      return { ...e, item, stop };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, items, stops]);

  // Unlinked expenses (should be linked — flagged)
  const unlinkedExpenses = useMemo(() => {
    return (expenses || []).filter(e => !e.item_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses]);

  // Planned: selected items not yet confirmed
  const planned = useMemo(() => items.filter(it => it.status === 'sel'), [items]);

  // Click confirmed expense → open linked item's DetailModal
  function handleExpenseClick(expense) {
    if (expense.item) {
      setSelectedItem(expense.item);
    }
  }

  return (
    <div id="page-budget" className={`page ${active ? "active" : ""}`}>
      <BudgetSummary items={items} expenses={expenses} />

      {/* CONFIRMED — expenses with linked items */}
      <div className="sect-title">Confirmed ({confirmedExpenses.length})</div>
      {confirmedExpenses.length > 0 ? (
        <div className="budget-list">
          {confirmedExpenses.map(e => (
            <div key={e.id} className="budget-item budget-item-conf" onClick={() => handleExpenseClick(e)} style={{ cursor: 'pointer' }}>
              <div className="bi-left">
                <div className="bi-name">{e.item?.name || e.note || 'Expense'}</div>
                <div className="bi-meta">
                  {e.item?.type && <span className="bi-type">{e.item.type}</span>}
                  {e.stop?.name && <span> · {e.stop.name}</span>}
                  {e.created_at && <span> · {new Date(e.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="bi-right">
                <div className="bi-paid">{$f(Number(e.amount))}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="itin-empty"><div className="itin-empty-text">No confirmed expenses yet.</div></div>
      )}

      {/* UNLINKED — flagged, should be linked to an item */}
      {unlinkedExpenses.length > 0 && (
        <>
          <div className="sect-title">Unlinked ({unlinkedExpenses.length})</div>
          <div className="budget-list">
            {unlinkedExpenses.map(e => (
              <div key={e.id} className="budget-item budget-item-unlinked">
                <div className="bi-left">
                  <div className="bi-name">{e.note || e.category || 'Expense'}</div>
                  <div className="bi-meta">
                    <span style={{ color: '#D97706', fontWeight: 600 }}>Not linked to an item</span>
                    <span> · {new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="bi-right">
                  <div className="bi-paid">{$f(Number(e.amount))}</div>
                  <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLANNED — selected items not yet confirmed */}
      <div className="sect-title">Planned ({planned.length})</div>
      {planned.length > 0 ? (
        <div className="budget-list">
          {planned.map(it => {
            const est = itemCost(it);
            return (
              <div key={it.id} className="budget-item" onClick={() => setSelectedItem(it)} style={{ cursor: 'pointer' }}>
                <div className="bi-left">
                  <div className="bi-name">{it.name}</div>
                  <div className="bi-meta">{it.city} · Selected</div>
                </div>
                <div className="bi-right">
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{est > 0 ? $f(est) : '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="itin-empty"><div className="itin-empty-text">No planned items.</div></div>
      )}

      {/* Item DetailModal — used for both confirmed expenses and planned items */}
      {selectedItem && (() => {
        const liveItem = items.find(i => i.id === selectedItem.id) || selectedItem;
        const itemExpenses = (expenses || []).filter(e => e.item_id === liveItem.id);
        const exp = itemExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal
          it={liveItem} status={liveItem.status || ''} setStatus={setStatus}
          updateItem={updateItem} stops={stops}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight}
          livePriceRates={livePrices?.[selectedItem.id]?.allRates}
          expenseAmount={exp} itemExpenses={itemExpenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense}
          onClose={() => setSelectedItem(null)}
          onDelete={liveItem.created_by ? () => { deleteItem(liveItem.id); setSelectedItem(null); } : null}
        />;
      })()}
    </div>
  );
}
