import { useState, useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import { useTrip } from '../../shared/hooks/TripContext';
import DetailModal from '../../shared/components/DetailModal';
import BudgetSummary from './BudgetSummary';

export default function BudgetPage({ active }) {
  const { items, stops, livePrices, expenses, updateItem, deleteItem, setStatus, addExpense, updateExpense, deleteExpense, files, setFile, removeFile, places, getPlaceData, email: userEmail } = useTrip();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Confirmed: expenses linked to items (things paid for)
  const confirmedExpenses = useMemo(() => {
    return (expenses || []).filter(e => e.item_id).map(e => {
      const item = items.find(it => it.id === e.item_id);
      const stop = item?.stop_ids?.[0] ? stops?.find(s => s.id === item.stop_ids[0]) : null;
      return { ...e, item, stop };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, items, stops]);

  // Unlinked expenses (daily expenses without item)
  const unlinkedExpenses = useMemo(() => {
    return (expenses || []).filter(e => !e.item_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses]);

  // Planned: selected items not yet confirmed
  const planned = useMemo(() => items.filter(it => it.status === 'sel'), [items]);

  return (
    <div id="page-budget" className={`page ${active ? "active" : ""}`}>
      <BudgetSummary items={items} expenses={expenses} />

      {/* CONFIRMED SECTION — expenses with linked items */}
      <div className="sect-title">Confirmed ({confirmedExpenses.length})</div>
      {confirmedExpenses.length > 0 ? (
        <div className="budget-list">
          {confirmedExpenses.map(e => (
            <div key={e.id} className="budget-item budget-item-conf" onClick={() => setSelectedExpense(e)} style={{ cursor: 'pointer' }}>
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
        <div className="itin-empty"><div className="itin-empty-text">No confirmed expenses yet. Confirm and pay for items to see them here.</div></div>
      )}

      {/* Unlinked daily expenses */}
      {unlinkedExpenses.length > 0 && (
        <>
          <div className="sect-title">Daily Expenses ({unlinkedExpenses.length})</div>
          <div className="budget-list">
            {unlinkedExpenses.map(e => (
              <div key={e.id} className="budget-item">
                <div className="bi-left">
                  <div className="bi-name">{e.note || e.category || 'Expense'}</div>
                  <div className="bi-meta">{new Date(e.created_at).toLocaleDateString()}</div>
                </div>
                <div className="bi-right">
                  <div className="bi-paid">{$f(Number(e.amount))}</div>
                  <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: 11, cursor: 'pointer' }}>remove</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLANNED SECTION — selected items not yet confirmed */}
      <div className="sect-title">Planned ({planned.length})</div>
      {planned.length > 0 ? (
        <div className="budget-list">
          {planned.map(it => {
            const est = itemCost(it);
            return (
              <div key={it.id} className="budget-item" onClick={() => setSelectedItem(it)} style={{ cursor: 'pointer' }}>
                <div className="bi-left">
                  <div className="bi-name">{it.name}</div>
                  <div className="bi-meta">{it.city} · Planned</div>
                </div>
                <div className="bi-right">
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{est > 0 ? $f(est) : '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="itin-empty"><div className="itin-empty-text">No planned items. Add items from the Plan tab.</div></div>
      )}

      {/* Expense detail overlay */}
      {selectedExpense && (
        <div className="detail-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="detail-sheet" onClick={e => e.stopPropagation()}>
            <div className="detail-handle" />
            <button className="detail-close" onClick={() => setSelectedExpense(null)}>✕</button>
            <div className="detail-content">
              <h2 className="detail-name" style={{ fontSize: 20 }}>{selectedExpense.item?.name || 'Expense'}</h2>
              <div className="itin-general" style={{ marginBottom: 12 }}>
                <div className="itin-general-row">
                  <span className="itin-general-label">Amount</span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>{$f(Number(selectedExpense.amount))}</span>
                </div>
                <div className="itin-general-row">
                  <span className="itin-general-label">Date paid</span>
                  <span>{new Date(selectedExpense.created_at).toLocaleDateString()}</span>
                </div>
                {selectedExpense.item?.type && (
                  <div className="itin-general-row">
                    <span className="itin-general-label">Type</span>
                    <span>{selectedExpense.item.type}</span>
                  </div>
                )}
                {selectedExpense.stop?.name && (
                  <div className="itin-general-row">
                    <span className="itin-general-label">Stop</span>
                    <span>{selectedExpense.stop.name}</span>
                  </div>
                )}
                {selectedExpense.note && (
                  <div className="itin-general-row">
                    <span className="itin-general-label">Note</span>
                    <span>{selectedExpense.note}</span>
                  </div>
                )}
                {selectedExpense.created_by && (
                  <div className="itin-general-row">
                    <span className="itin-general-label">Paid by</span>
                    <span>{selectedExpense.created_by.split('@')[0]}</span>
                  </div>
                )}
              </div>

              {/* Link to related item */}
              {selectedExpense.item && (
                <button className="detail-btn" onClick={() => { setSelectedExpense(null); setSelectedItem(selectedExpense.item); }} style={{ marginBottom: 8 }}>
                  View {selectedExpense.item.name}
                </button>
              )}

              <button className="detail-btn-delete" onClick={() => { deleteExpense(selectedExpense.id); setSelectedExpense(null); }}>
                Delete expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item detail modal */}
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
