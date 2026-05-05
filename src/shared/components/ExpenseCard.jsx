import { useState } from 'react';
import { $f } from '../hooks/useItems';

// Shared expense card — used from BudgetPage and DetailModal
// mode: 'edit' (existing expense) or 'create' (new expense for an item)
export default function ExpenseCard({ expense, item, stops, onClose, onViewItem, addExpense, updateExpense, deleteExpense, setStatus }) {
  const isNew = !expense;
  const [amountInput, setAmountInput] = useState(expense ? String(Number(expense.amount)) : '');
  const [saving, setSaving] = useState(false);
  const stop = item?.stop_ids?.[0] ? (stops || []).find(s => s.id === item.stop_ids[0]) : null;

  function handleSave() {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    if (isNew && item) {
      addExpense({ amount: val, category: item.type === 'food' ? 'food' : item.type, note: item.name, item_id: item.id, stop_id: item.stop_ids?.[0] || '', created_by: '' });
      if (item.status !== 'conf' && setStatus) setStatus(item.id, 'conf');
    } else if (expense) {
      if (val !== Number(expense.amount)) updateExpense(expense.id, { amount: val });
    }
    setSaving(false);
    onClose();
  }

  function handleDelete() {
    if (!expense) return;
    if (confirm('Delete this expense? This cannot be undone.')) {
      deleteExpense(expense.id);
      onClose();
    }
  }

  const displayItem = expense?.item || item;
  const displayStop = expense?.stop || stop;

  return (
    <div className="detail-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Expense">
      <div className="detail-sheet" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="detail-content">
          <div className="detail-section-title">{isNew ? 'New Expense' : 'Expense'}</div>
          <h2 className="detail-name" style={{ fontSize: 18 }}>{displayItem?.name || expense?.note || 'Expense'}</h2>

          <div className="itin-general" style={{ marginTop: 12 }}>
            <div className="itin-general-row">
              <span className="itin-general-label">Amount</span>
              <div className="cost-input-row" style={{ flex: 1, justifyContent: 'flex-end' }}>
                <span className="cost-input-prefix">$</span>
                <input type="number" className="cost-input" style={{ fontSize: 14, maxWidth: 120, textAlign: 'right' }}
                  value={amountInput} onChange={e => setAmountInput(e.target.value)} autoFocus placeholder="0" />
              </div>
            </div>
            {expense?.created_at && (
              <div className="itin-general-row">
                <span className="itin-general-label">Date</span>
                <span>{new Date(expense.created_at).toLocaleDateString()}</span>
              </div>
            )}
            {displayItem?.type && (
              <div className="itin-general-row">
                <span className="itin-general-label">Type</span>
                <span style={{ textTransform: 'capitalize' }}>{displayItem.type}</span>
              </div>
            )}
            {displayStop?.name && (
              <div className="itin-general-row">
                <span className="itin-general-label">Stop</span>
                <span>{displayStop.name}</span>
              </div>
            )}
            {expense?.note && (
              <div className="itin-general-row">
                <span className="itin-general-label">Note</span>
                <span>{expense.note}</span>
              </div>
            )}
            {expense?.created_by && (
              <div className="itin-general-row">
                <span className="itin-general-label">Paid by</span>
                <span>{expense.created_by.split('@')[0]}</span>
              </div>
            )}
          </div>

          {onViewItem && displayItem && (
            <button className="detail-btn" onClick={onViewItem} style={{ marginTop: 12 }}>
              View {displayItem.name}
            </button>
          )}
        </div>

        <div className="detail-edit-actions">
          {!isNew && <button className="detail-btn-delete" onClick={handleDelete} style={{ flex: 1 }}>Delete</button>}
          <button className="detail-btn sel" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : isNew ? 'Add Expense' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
