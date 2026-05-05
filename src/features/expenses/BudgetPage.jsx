import { useState, useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import { useTrip } from '../../shared/hooks/TripContext';
import DetailModal from '../../shared/components/DetailModal';
import BudgetSummary from './BudgetSummary';

export default function BudgetPage({ active }) {
  const { items, stops, livePrices, expenses, updateItem, deleteItem, setStatus, addExpense, updateExpense, deleteExpense, files, setFile, removeFile, places, getPlaceData } = useTrip();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const confirmedExpenses = useMemo(() => {
    return (expenses || []).filter(e => e.item_id).map(e => {
      const item = items.find(it => it.id === e.item_id);
      const stop = item?.stop_ids?.[0] ? stops?.find(s => s.id === item.stop_ids[0]) : null;
      return { ...e, item, stop };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, items, stops]);

  const unlinkedExpenses = useMemo(() => {
    return (expenses || []).filter(e => !e.item_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses]);

  const planned = useMemo(() => items.filter(it => it.status === 'sel'), [items]);

  return (
    <div id="page-budget" className={`page ${active ? "active" : ""}`}>
      <BudgetSummary items={items} expenses={expenses} />

      {/* CONFIRMED */}
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
        <div className="itin-empty"><div className="itin-empty-text">No confirmed expenses yet.</div></div>
      )}

      {/* UNLINKED */}
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

      {/* PLANNED */}
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

      {/* EXPENSE DETAIL CARD */}
      {selectedExpense && (
        <ExpenseCard
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onViewItem={() => { setSelectedExpense(null); setSelectedItem(selectedExpense.item); }}
          updateExpense={updateExpense}
          deleteExpense={deleteExpense}
        />
      )}

      {/* ITEM DETAIL MODAL */}
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

// ═══ EXPENSE CARD — separate from DetailModal ═══
function ExpenseCard({ expense, onClose, onViewItem, updateExpense, deleteExpense }) {
  const [amountInput, setAmountInput] = useState(String(Number(expense.amount)));
  const [saving, setSaving] = useState(false);

  function handleSave() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return;
    if (val !== Number(expense.amount)) {
      setSaving(true);
      updateExpense(expense.id, { amount: val });
      setSaving(false);
    }
    onClose();
  }

  function handleDelete() {
    if (confirm('Delete this expense? This cannot be undone.')) {
      deleteExpense(expense.id);
      onClose();
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Expense details">
      <div className="detail-sheet" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="detail-content">
          <div className="detail-section-title">Expense</div>
          <h2 className="detail-name" style={{ fontSize: 18 }}>{expense.item?.name || expense.note || 'Expense'}</h2>

          <div className="itin-general" style={{ marginTop: 12 }}>
            <div className="itin-general-row">
              <span className="itin-general-label">Amount</span>
              <div className="cost-input-row" style={{ flex: 1, justifyContent: 'flex-end' }}>
                <span className="cost-input-prefix">$</span>
                <input type="number" className="cost-input" style={{ fontSize: 14, maxWidth: 120, textAlign: 'right' }}
                  value={amountInput} onChange={e => setAmountInput(e.target.value)} />
              </div>
            </div>
            <div className="itin-general-row">
              <span className="itin-general-label">Date</span>
              <span>{new Date(expense.created_at).toLocaleDateString()}</span>
            </div>
            {expense.item?.type && (
              <div className="itin-general-row">
                <span className="itin-general-label">Type</span>
                <span style={{ textTransform: 'capitalize' }}>{expense.item.type}</span>
              </div>
            )}
            {expense.stop?.name && (
              <div className="itin-general-row">
                <span className="itin-general-label">Stop</span>
                <span>{expense.stop.name}</span>
              </div>
            )}
            {expense.note && (
              <div className="itin-general-row">
                <span className="itin-general-label">Note</span>
                <span>{expense.note}</span>
              </div>
            )}
            {expense.created_by && (
              <div className="itin-general-row">
                <span className="itin-general-label">Paid by</span>
                <span>{expense.created_by.split('@')[0]}</span>
              </div>
            )}
          </div>

          {expense.item && (
            <button className="detail-btn" onClick={onViewItem} style={{ marginTop: 12 }}>
              View {expense.item.name}
            </button>
          )}
        </div>

        <div className="detail-edit-actions">
          <button className="detail-btn-delete" onClick={handleDelete} style={{ flex: 1 }}>Delete expense</button>
          <button className="detail-btn sel" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
