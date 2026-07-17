import { useState, useMemo, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import AddItemModal from "./AddItemModal";
import {
  EXPENSE_CATEGORIES,
  buildUnlinkedExpensePayload,
} from "../constants/expenseCategories";
import { itemStartDate } from "../constants/expenseDate";
import { todayStr } from "../../features/itinerary/utils";

export default function AddExpenseModal({
  items = [],
  stops = [],
  onAdd,
  onClose,
  userEmail,
  addItem,
  addExpense,
  setFile,
  initialMode = "item",
  defaultStopId = "",
}) {
  const trapRef = useFocusTrap();
  const [step, setStep] = useState("select"); // 'select' | 'amount'
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [mode, setMode] = useState(initialMode); // 'item' | 'stop'
  const [stopId, setStopId] = useState(defaultStopId);
  const [category, setCategory] = useState("groceries");
  const [expenseDate, setExpenseDate] = useState(todayStr());
  const [error, setError] = useState("");

  useEffect(() => {
    window.history.pushState({ modal: true }, "", "");
    function handlePop() {
      onClose();
    }
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("popstate", handlePop);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Items that can have expenses — selected or confirmed
  const availableItems = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter((it) => it.status === "sel" || it.status === "conf")
      .filter(
        (it) => !q || (it.name + it.city + it.type).toLowerCase().includes(q),
      )
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
        stop_id: selectedItem.stop_ids?.[0] || "",
        created_by: userEmail,
        expense_date: itemStartDate(selectedItem) || null,
      });
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
      setSaving(false);
    }
  }

  async function handleSaveUnlinked() {
    if (saving) return;
    const payload = buildUnlinkedExpensePayload({
      amount,
      category,
      note,
      stopId,
      userEmail,
      expenseDate,
    });
    if (!payload) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd(payload);
      onClose();
    } catch (err) {
      setError("Error: " + err.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add expense"
      onClick={onClose}
    >
      <div
        className="detail-sheet"
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="detail-content">
          <div className="itin-mode-toggle" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`fp ${mode === "item" ? "fp-active" : ""}`}
              onClick={() => {
                setMode("item");
                setError("");
              }}
            >
              Link to item
            </button>
            <button
              type="button"
              className={`fp ${mode === "stop" ? "fp-active" : ""}`}
              onClick={() => {
                setMode("stop");
                setError("");
              }}
            >
              Log to a stop (no item)
            </button>
          </div>
          {mode === "item" && step === "select" && (
            <>
              <h2 className="detail-name" style={{ fontSize: 18 }}>
                Add Expense
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Select the item you paid for
              </p>
              <input
                type="search"
                className="edit-input"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 10 }}
                autoFocus
              />
              <button
                type="button"
                className="detail-btn"
                onClick={() => setShowAddItem(true)}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  color: "var(--accent)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                + Create new item
              </button>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {availableItems.length === 0 && (
                  <div className="itin-empty">
                    <div className="itin-empty-text">
                      No items found. Add items from the Plan tab first.
                    </div>
                  </div>
                )}
                {availableItems.map((it) => {
                  const stop = it.stop_ids?.[0]
                    ? stops?.find((s) => s.id === it.stop_ids[0])
                    : null;
                  return (
                    <div
                      key={it.id}
                      className={`budget-item ${selectedItem?.id === it.id ? "budget-item-conf" : ""}`}
                      onClick={() => {
                        setSelectedItem(it);
                        setStep("amount");
                      }}
                      style={{ cursor: "pointer", marginBottom: 4 }}
                    >
                      <div className="bi-left">
                        <div className="bi-name">{it.name}</div>
                        <div className="bi-meta">
                          <span className="bi-type">{it.type}</span>
                          {stop?.name && <span> · {stop.name}</span>}
                        </div>
                      </div>
                      <div className="bi-right">
                        <span
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {it.status === "conf" ? "Booked" : "Selected"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {mode === "item" && step === "amount" && selectedItem && (
            <>
              <h2 className="detail-name" style={{ fontSize: 18 }}>
                How much did you pay?
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                {selectedItem.name}
              </div>
              <div className="cost-input-row" style={{ marginBottom: 12 }}>
                <span className="cost-input-prefix">$</span>
                <input
                  type="number"
                  className="cost-input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <input
                className="edit-input"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="detail-btn"
                  onClick={() => setStep("select")}
                  style={{ flex: 1 }}
                >
                  Back
                </button>
                <button
                  className="detail-btn sel"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </>
          )}

          {mode === "stop" && (
            <>
              <h2 className="detail-name" style={{ fontSize: 18 }}>
                Log an expense to a stop
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Not linked to any item (groceries, gas, taxi, tips…)
              </p>
              {error && (
                <div
                  style={{
                    color: "var(--error)",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {error}
                </div>
              )}
              <label className="itin-general-label" htmlFor="exp-stop">
                Stop
              </label>
              <select
                id="exp-stop"
                className="edit-input"
                value={stopId}
                onChange={(e) => setStopId(e.target.value)}
                style={{ marginBottom: 10 }}
              >
                <option value="">No stop</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="itin-general-label" htmlFor="exp-cat">
                Category
              </label>
              <select
                id="exp-cat"
                className="edit-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ marginBottom: 10 }}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label className="itin-general-label" htmlFor="exp-date">
                Date
              </label>
              <input
                id="exp-date"
                type="date"
                className="edit-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div className="cost-input-row" style={{ marginBottom: 10 }}>
                <span className="cost-input-prefix">$</span>
                <input
                  type="number"
                  min="0"
                  className="cost-input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <input
                className="edit-input"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <button
                className="detail-btn sel"
                onClick={handleSaveUnlinked}
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Saving..." : "Add Expense"}
              </button>
            </>
          )}
        </div>
      </div>
      {showAddItem && (
        <AddItemModal
          onClose={() => {
            setShowAddItem(false);
            onClose();
          }}
          onAdd={addItem}
          addExpense={addExpense}
          setFile={setFile}
          stops={stops}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
