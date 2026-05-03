import { useState, useMemo } from 'react';
import { $f, itemCost } from '../lib/useItems';
import DetailModal from './DetailModal';
import BudgetSummary from './BudgetSummary';

const CATEGORIES = [
  { id: 'food', label: 'Food', color: '#E8734A' },
  { id: 'transport', label: 'Transport', color: '#2A8F8F' },
  { id: 'activity', label: 'Activity', color: '#3A9E6E' },
  { id: 'shopping', label: 'Shopping', color: '#D4847C' },
  { id: 'other', label: 'Other', color: '#78716C' },
];

export default function BudgetPage({ active, items, updateItem, setStatus, files, setFile, removeFile, places, getPlaceData, expenses, addExpense, deleteExpense, userEmail }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [expNote, setExpNote] = useState('');

  const planned = useMemo(() => items.filter(it => it.status === 'sel' || it.status === 'conf'), [items]);

  async function handleAddExpense() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    try {
      await addExpense({ amount: val, category, note: expNote, created_by: userEmail });
      setAmount(''); setExpNote(''); setShowAdd(false);
    } catch (err) { alert('Error: ' + err.message); }
  }

  return (
    <div id="page-budget" className={`page ${active ? "active" : ""}`}>
      <BudgetSummary items={items} expenses={expenses} />

      {expenses && expenses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="sect-title">Daily Expenses</div>
          <div className="budget-list">
            {expenses.map(e => {
              const cat = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[4];
              return (
                <div key={e.id} className="budget-item">
                  <div className="bi-left">
                    <div className="bi-name">{cat.label} {e.note && `— ${e.note}`}</div>
                    <div className="bi-meta">{new Date(e.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="bi-right">
                    <div className="bi-paid">{$f(Number(e.amount))}</div>
                    <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: 11, cursor: 'pointer' }}>remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sect-title">Planned Items</div>
      <div className="budget-list">
        {planned.map(it => {
          const est = itemCost(it);
          const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
          return (
            <div key={it.id} className="budget-item" onClick={() => setSelectedItem(it)} style={{ cursor: 'pointer' }}>
              <div className="bi-left">
                <div className="bi-name">{it.name}</div>
                <div className="bi-meta">{it.city} · {it.status === 'conf' ? 'Booked' : 'Planned'}</div>
              </div>
              <div className="bi-right">
                {exp > 0 ? (
                  <><div className="bi-est">{est > 0 ? $f(est) : ''}</div><div className="bi-paid">{$f(exp)}</div></>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{est > 0 ? $f(est) : '—'}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showAdd && <button className="add-item-btn" onClick={() => setShowAdd(true)}>+ Log expense</button>}

      {showAdd && (
        <div className="detail-overlay" onClick={() => setShowAdd(false)}>
          <div className="detail-sheet" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="detail-content">
              <h2 className="detail-name" style={{ fontSize: 20 }}>Log Expense</h2>
              <div className="cost-input-row" style={{ marginBottom: 12 }}>
                <span className="cost-input-prefix">$</span>
                <input type="number" className="cost-input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} className={`map-chip ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)} style={{ padding: '8px 12px' }}>{c.label}</button>
                ))}
              </div>
              <input className="add-input" placeholder="Note (optional)" value={expNote} onChange={e => setExpNote(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="detail-btn sel" onClick={handleAddExpense}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <DetailModal
          it={selectedItem} status={selectedItem.status || ''} setStatus={setStatus}
          updateItem={updateItem}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
