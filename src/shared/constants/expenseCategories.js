// Single source of truth for expense categories (used by the Add Expense modal's
// stop mode, ExpenseCard's unlinked edit, and the Budget breakdown). Linked
// expenses keep their category locked to the item's type; unlinked expenses pick
// from this list.
export const EXPENSE_CATEGORIES = [
  { value: "stay", label: "Stay" },
  { value: "activity", label: "Activity" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "groceries", label: "Groceries" },
  { value: "gas", label: "Gas/Fuel" },
  { value: "shopping", label: "Shopping" },
  { value: "fees", label: "Fees/Tips" },
  { value: "misc", label: "Misc" },
  { value: "other", label: "Other" },
];

// Master display order for the budget breakdown; "other" is always last.
export const CATEGORY_ORDER = [
  "stay",
  "activity",
  "food",
  "transport",
  "groceries",
  "gas",
  "shopping",
  "fees",
  "misc",
  "other",
];

// Plurals for the four item types match the existing breakdown labels.
const LABELS = {
  stay: "Stays",
  activity: "Activities",
  food: "Food",
  transport: "Transport",
  groceries: "Groceries",
  gas: "Gas/Fuel",
  shopping: "Shopping",
  fees: "Fees/Tips",
  misc: "Misc",
  other: "Other",
};

export function categoryLabel(value) {
  if (!value) return "Other";
  return LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);
}

// Sort byType keys into display order: known categories by CATEGORY_ORDER,
// unknown/custom keys after the knowns but before "other", "other" last.
export function orderBudgetTypeKeys(keys) {
  const rank = (k) => {
    if (k === "other") return Number.MAX_SAFE_INTEGER;
    const i = CATEGORY_ORDER.indexOf(k);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function buildUnlinkedExpensePayload({
  amount,
  category,
  note,
  stopId,
  userEmail,
} = {}) {
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return null;
  return {
    amount: val,
    category: category || "other",
    note: (note || "").trim(),
    item_id: null,
    stop_id: stopId || "",
    created_by: userEmail || "",
  };
}

export function buildUnlinkedExpenseChanges(draft, expense) {
  const changes = {};
  const val = parseFloat(draft.amount);
  if (!isNaN(val) && val > 0 && val !== Number(expense.amount))
    changes.amount = val;
  const cat = draft.category || "other";
  if (cat !== (expense.category || "")) changes.category = cat;
  const note = (draft.note || "").trim();
  if (note !== (expense.note || "")) changes.note = note;
  const stopId = draft.stop_id || "";
  if (stopId !== (expense.stop_id || "")) changes.stop_id = stopId;
  return changes;
}
