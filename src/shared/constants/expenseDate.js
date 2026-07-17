// Expense date helpers. A linked expense copies its item's start date at
// creation; an unlinked (stop) expense carries a user-picked expense_date. For
// sort and display, expense_date is the source of truth, falling back to
// created_at for legacy rows that predate the column.

// Date part (YYYY-MM-DD) of an item's start_time ("2026-07-20T14:30"), or null
// when the item has no start_time.
export function itemStartDate(item) {
  const t = item?.start_time;
  if (!t || typeof t !== "string") return null;
  return (t.includes("T") ? t.split("T")[0] : t.slice(0, 10)) || null;
}

// Comparable timestamp for ordering: expense_date (parsed at local noon to avoid
// a timezone off-by-one), else created_at, else 0.
export function expenseSortValue(expense) {
  if (expense?.expense_date) {
    const t = new Date(expense.expense_date + "T12:00").getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (expense?.created_at) {
    const t = new Date(expense.created_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

// Human date string for a row: expense_date (parsed at local noon to avoid the
// UTC-midnight off-by-one), else created_at, else "".
export function expenseDisplayDate(expense) {
  if (expense?.expense_date)
    return new Date(expense.expense_date + "T12:00").toLocaleDateString();
  if (expense?.created_at)
    return new Date(expense.created_at).toLocaleDateString();
  return "";
}
