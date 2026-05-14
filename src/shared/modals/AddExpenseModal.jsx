import { useState, useMemo, useEffect } from 'react';
import { $f } from '../hooks/useItems';

export default function AddExpenseModal({ items, stops, onAdd, onClose, userEmail }) {
  const [step, setStep] = useState('select'); // 'select' | 'amount'
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.history.pushState({ modal: true }, '', '');
    function handlePop() { onClose(); }
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('popstate', handlePop);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Items that can have expenses — selected or confirmed
  const availableItems = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter(it => it.status === 'sel' || it.status === 'conf')
      .filter(it => !q || (it.name + it.city + it.type).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  async function handleSave() {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !selectedItem || saving) return;
    setSaving(true);
    try {
      await onAdd({
        amount: val,
        category: selectedItem.type,
        note: note || selectedItem.name,
        item_id: selectedItem.id,
        stop_id: selectedItem.stop_ids?.[0] || '',
        created_by: userEmail,
      });
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-content">

          {step === 'select' && (
            <>
              <h2 className="detail-name" style={{ fontSize: 18 }}>Add Expense</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Select the item you paid for</p>
              <input
                type="search" className="edit-input" placeholder="Search items..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 10 }}
                autoFocus
              />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {availableItems.length === 0 && (
                  <div className="itin-empty"><div className="itin-empty-text">No items found. Add items from the Plan tab first.</div></div>
                )}
                {availableItems.map(it => {
                  const stop = it.stop_ids?.[0] ? stops?.find(s => s.id === it.stop_ids[0]) : null;
                  return (
                    <div
                      key={it.id}
                      className={`budget-item ${selectedItem?.id === it.id ? 'budget-item-conf' : ''}`}
                      onClick={() => { setSelectedItem(it); setStep('amount'); }}
                      style={{ cursor: 'pointer', marginBottom: 4 }}
                    >
                      <div className="bi-left">
                        <div className="bi-name">{it.name}</div>
                        <div className="bi-meta">
                          <span className="bi-type">{it.type}</span>
                          {stop?.name && <span> · {stop.name}</span>}
                        </div>
                      </div>
                      <div className="bi-right">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.status === 'conf' ? 'Booked' : 'Selected'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 'amount' && selectedItem && (
            <>
              <h2 className="detail-name" style={{ fontSize: 18 }}>How much did you pay?</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{selectedItem.name}</div>
              <div className="cost-input-row" style={{ marginBottom: 12 }}>
                <span className="cost-input-prefix">€</span>
                <input
                  type="number" className="cost-input" placeholder="0"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <input
                className="edit-input" placeholder="Note (optional)"
                value={note} onChange={e => setNote(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="detail-btn" onClick={() => setStep('select')} style={{ flex: 1 }}>Back</button>
                <button className="detail-btn sel" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Add Expense'}</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
