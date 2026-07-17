import { useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmModal from "./ConfirmModal";
import {
  EXPENSE_CATEGORIES,
  categoryLabel,
  buildUnlinkedExpenseChanges,
} from "../constants/expenseCategories";
import { itemStartDate } from "../constants/expenseDate";

// Shared expense card — used from BudgetPage and DetailModal
// mode: 'edit' (existing expense) or 'create' (new expense for an item)
export default function ExpenseCard({
  expense,
  item,
  stops,
  onClose,
  onViewItem,
  addExpense,
  updateExpense,
  deleteExpense,
  setStatus,
  email,
}) {
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const trapRef = useFocusTrap();
  const isNew = !expense;
  const [amountInput, setAmountInput] = useState(
    expense ? String(Number(expense.amount)) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const stop = item?.stop_ids?.[0]
    ? (stops || []).find((s) => s.id === item.stop_ids[0])
    : null;
  // Unlinked (stop-level) expenses support full edit: amount, category, note, stop.
  const isUnlinked = !!expense && !expense.item_id;
  const [category, setCategory] = useState(expense?.category || "other");
  const [note, setNote] = useState(expense?.note || "");
  const [stopId, setStopId] = useState(expense?.stop_id || "");

  async function handleSave() {
    const val = parseFloat(amountInput);
    // M31: surface invalid input instead of a silent no-op.
    if (isNaN(val) || val <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (isNew && !item) {
      setError("No item to attach this expense to.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isNew && item) {
        await addExpense({
          amount: val,
          category: item.type === "food" ? "food" : item.type,
          note: item.name,
          item_id: item.id,
          stop_id: item.stop_ids?.[0] || "",
          created_by: email || "",
          expense_date: itemStartDate(item) || null,
        });
        if (item.status !== "conf" && setStatus)
          await setStatus(item.id, "conf");
      } else if (expense && isUnlinked) {
        const changes = buildUnlinkedExpenseChanges(
          { amount: amountInput, category, note, stop_id: stopId },
          expense,
        );
        if (Object.keys(changes).length > 0)
          await updateExpense(expense.id, changes);
      } else if (expense) {
        if (val !== Number(expense.amount))
          await updateExpense(expense.id, { amount: val });
      }
      onClose();
    } catch (err) {
      console.warn("ExpenseCard save failed:", err);
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!expense) return;
    const confirmed = await confirm(
      "Delete this expense? This cannot be undone.",
      { destructive: true, confirmLabel: "Delete" },
    );
    if (!confirmed) return;
    try {
      await deleteExpense(expense.id);
      onClose();
    } catch (err) {
      console.warn("ExpenseCard delete failed:", err);
      setError("Failed to delete. Please try again.");
    }
  }

  const displayItem = expense?.item || item;
  const displayStop = expense?.stop || stop;

  return (
    <div
      className="detail-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Expense"
    >
      <div
        className="detail-sheet"
        ref={trapRef}
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="detail-content">
          <div className="detail-section-title">
            {isNew ? "New Expense" : "Expense"}
          </div>
          <h2 className="detail-name" style={{ fontSize: 18 }}>
            {displayItem?.name ||
              expense?.note ||
              (isUnlinked ? categoryLabel(expense?.category) : "Expense")}
          </h2>

          {error && (
            <div
              style={{ color: "var(--error)", fontSize: 12, marginBottom: 8 }}
            >
              {error}
            </div>
          )}

          <div className="itin-general" style={{ marginTop: 12 }}>
            <div className="itin-general-row">
              <span className="itin-general-label">Amount</span>
              <div
                className="cost-input-row"
                style={{ flex: 1, justifyContent: "flex-end" }}
              >
                <span className="cost-input-prefix">$</span>
                <input
                  type="number"
                  className="cost-input"
                  style={{ fontSize: 14, maxWidth: 120, textAlign: "right" }}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  autoFocus
                  placeholder="0"
                />
              </div>
            </div>
            {expense?.created_at && (
              <div className="itin-general-row">
                <span className="itin-general-label">Date</span>
                <span>{new Date(expense.created_at).toLocaleDateString()}</span>
              </div>
            )}
            {isUnlinked ? (
              <>
                <div className="itin-general-row">
                  <span className="itin-general-label">Category</span>
                  <select
                    className="edit-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="itin-general-row">
                  <span className="itin-general-label">Stop</span>
                  <select
                    className="edit-input"
                    value={stopId}
                    onChange={(e) => setStopId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">No stop</option>
                    {(stops || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="itin-general-row">
                  <span className="itin-general-label">Note</span>
                  <input
                    className="edit-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    style={{ flex: 1 }}
                  />
                </div>
              </>
            ) : (
              <>
                {displayItem?.type && (
                  <div className="itin-general-row">
                    <span className="itin-general-label">Type</span>
                    <span style={{ textTransform: "capitalize" }}>
                      {displayItem.type}
                    </span>
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
              </>
            )}
            {expense?.created_by && (
              <div className="itin-general-row">
                <span className="itin-general-label">Paid by</span>
                <span>{expense.created_by.split("@")[0]}</span>
              </div>
            )}
          </div>

          {onViewItem && displayItem && (
            <button
              className="detail-btn"
              onClick={onViewItem}
              style={{ marginTop: 12 }}
            >
              View {displayItem.name}
            </button>
          )}
        </div>

        <div className="detail-edit-actions">
          {!isNew && (
            <button
              className="detail-btn-delete"
              onClick={handleDelete}
              style={{ flex: 1 }}
            >
              Delete
            </button>
          )}
          <button
            className="detail-btn sel"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? "Saving..." : isNew ? "Add Expense" : "Save"}
          </button>
        </div>
      </div>
      <ConfirmModal
        state={confirmState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
