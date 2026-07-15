# Stop-Level (Unlinked) Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user log an expense to a stop without linking it to an item (groceries, gas, taxi, tips), pick its category, fully edit it later, and see unlinked expenses grouped by their own category in the Budget breakdown.

**Architecture:** Extend the existing `AddExpenseModal` (add a "Log to a stop (no item)" mode) and `ExpenseCard` (add unlinked full-edit), introduce one shared category constant module, and change `computeBudgetTotals` to key unlinked expenses by `expense.category` instead of lumping them into `"other"`. No parallel modal, no wholesale refactor. Pure logic is extracted into small tested helpers (matching the codebase's `detailModalLogic.js` / `addItemLogic.js` convention); component wiring is verified by phone smoketest.

**Tech Stack:** React 19, Vite, Supabase (JS client), Vitest. No TypeScript.

## Global Constraints

- **No DB migration.** `expenses.item_id` is already nullable; `expenses.category` and `expenses.stop_id` are free text. Do not touch `supabase/migrations/`.
- **Data access only through hooks/services.** Components never call Supabase directly; expenses flow through `useExpenses` (`addExpense`/`updateExpense`/`deleteExpense`) via the `useTrip*` context.
- **`estimated_cost` is read-only** here (owned by `useLivePrices`). This feature never writes it.
- **Linked expenses keep their category locked** to the item's type (existing behavior — do not add category editing for linked expenses). Only **unlinked** expenses get a category picker and full edit.
- **Max 1 expense per item (M01)** applies to _linked_ expenses only; unlinked expenses (`item_id: null`) are unlimited. Preserve `itemHasExpense` behavior — never pass a non-null `item_id` for a stop-level expense.
- **USD-only.** No currency field.
- **Mobile-first**, small touch targets consistent with existing screens. Tests colocated in `src/test/` as `*.test.js`.
- Verification per task: `npm test` (vitest run) green **and** `npm run lint` (0 errors). Build (`npm run build`) green before the final commit.
- Branch: `feat/stop-expenses`. Commit per slice. PR into `dev`.

---

## File Structure

**Create:**

- `src/shared/constants/expenseCategories.js` — the single source for the unified category list, display labels, budget-row ordering, and the pure payload/changes/validation helpers for unlinked expenses. One responsibility: "everything about an expense category as data."
- `src/test/expenseCategories.test.js` — tests for the above.

**Modify:**

- `src/shared/hooks/useItems.js` — `computeBudgetTotals`: key unlinked expenses by their own category.
- `src/features/expenses/BudgetSummary.jsx` — render budget-breakdown rows dynamically (all categories present, ordered), using the shared constant.
- `src/shared/modals/AddExpenseModal.jsx` — add "Log to a stop (no item)" mode + `defaultStopId`/`initialMode` props.
- `src/features/itinerary/StopSection.jsx` — "Add expense" button that opens `AddExpenseModal` pre-filled with the stop.
- `src/features/itinerary/TodayPage.jsx` — pass `items` to `StopSection` (needed so its embedded `AddExpenseModal` can be reused; `addExpense`/`stops`/`userEmail` are already passed).
- `src/features/expenses/BudgetPage.jsx` — make Unlinked rows clickable (open `ExpenseCard`), show stop + category.
- `src/shared/components/ExpenseCard.jsx` — full edit for unlinked expenses (amount, category, note, stop; save/delete).
- `src/test/budgetSummary.test.js` — extend with unlinked-by-category cases.

---

## Task 1: Shared category constant + pure helpers

**Files:**

- Create: `src/shared/constants/expenseCategories.js`
- Test: `src/test/expenseCategories.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `EXPENSE_CATEGORIES: {value:string,label:string}[]` — the selectable list for unlinked expenses.
  - `CATEGORY_ORDER: string[]` — master display order for budget rows.
  - `categoryLabel(value:string): string` — display label for a category value (plural for the four item types, matching the existing breakdown; falls back to capitalized value; empty → `"Other"`).
  - `orderBudgetTypeKeys(keys:string[]): string[]` — sorts present byType keys into display order; unknown/custom keys before `"other"`; `"other"` always last.
  - `buildUnlinkedExpensePayload({amount,category,note,stopId,userEmail}): object|null` — validated insert payload for a new unlinked expense, or `null` if amount ≤ 0.
  - `buildUnlinkedExpenseChanges(draft, expense): object` — minimal changed-fields object (`amount`/`category`/`note`/`stop_id`).
  - `validateUnlinkedExpenseDraft(draft): string|null` — error message or `null`.

- [ ] **Step 1: Write the failing test**

```js
// src/test/expenseCategories.test.js
import { describe, it, expect } from "vitest";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_ORDER,
  categoryLabel,
  orderBudgetTypeKeys,
  buildUnlinkedExpensePayload,
  buildUnlinkedExpenseChanges,
  validateUnlinkedExpenseDraft,
} from "../shared/constants/expenseCategories";

describe("expense category constant", () => {
  it("includes the four item types and the stop-only extras + other", () => {
    const values = EXPENSE_CATEGORIES.map((c) => c.value);
    for (const v of ["stay", "activity", "food", "transport"])
      expect(values).toContain(v);
    for (const v of ["groceries", "gas", "shopping", "fees", "misc", "other"])
      expect(values).toContain(v);
  });
});

describe("categoryLabel", () => {
  it("uses plural labels for the four item types (matches breakdown)", () => {
    expect(categoryLabel("stay")).toBe("Stays");
    expect(categoryLabel("activity")).toBe("Activities");
    expect(categoryLabel("food")).toBe("Food");
    expect(categoryLabel("transport")).toBe("Transport");
  });
  it("labels the extras", () => {
    expect(categoryLabel("gas")).toBe("Gas/Fuel");
    expect(categoryLabel("fees")).toBe("Fees/Tips");
    expect(categoryLabel("groceries")).toBe("Groceries");
  });
  it("empty/undefined => Other", () => {
    expect(categoryLabel("")).toBe("Other");
    expect(categoryLabel(undefined)).toBe("Other");
  });
  it("capitalizes an unknown custom value", () => {
    expect(categoryLabel("parking")).toBe("Parking");
  });
});

describe("orderBudgetTypeKeys", () => {
  it("orders known keys by CATEGORY_ORDER, other last, unknown before other", () => {
    const out = orderBudgetTypeKeys([
      "other",
      "food",
      "parking",
      "stay",
      "groceries",
    ]);
    expect(out).toEqual(["stay", "food", "groceries", "parking", "other"]);
  });
  it("does not mutate its input", () => {
    const input = ["other", "stay"];
    orderBudgetTypeKeys(input);
    expect(input).toEqual(["other", "stay"]);
  });
  it("CATEGORY_ORDER ends with other", () => {
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe("other");
  });
});

describe("buildUnlinkedExpensePayload", () => {
  it("builds a null-item payload from valid input", () => {
    expect(
      buildUnlinkedExpensePayload({
        amount: "12.5",
        category: "groceries",
        note: "  market  ",
        stopId: "s1",
        userEmail: "me@x.com",
      }),
    ).toEqual({
      amount: 12.5,
      category: "groceries",
      note: "market",
      item_id: null,
      stop_id: "s1",
      created_by: "me@x.com",
    });
  });
  it("defaults category to other and blanks missing fields", () => {
    expect(buildUnlinkedExpensePayload({ amount: "5" })).toEqual({
      amount: 5,
      category: "other",
      note: "",
      item_id: null,
      stop_id: "",
      created_by: "",
    });
  });
  it("returns null for a non-positive or non-numeric amount", () => {
    expect(buildUnlinkedExpensePayload({ amount: "0" })).toBeNull();
    expect(buildUnlinkedExpensePayload({ amount: "-3" })).toBeNull();
    expect(buildUnlinkedExpensePayload({ amount: "abc" })).toBeNull();
  });
});

describe("buildUnlinkedExpenseChanges", () => {
  const expense = {
    amount: 10,
    category: "food",
    note: "lunch",
    stop_id: "s1",
  };
  it("returns only changed fields", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "20", category: "food", note: "lunch", stop_id: "s1" },
        expense,
      ),
    ).toEqual({ amount: 20 });
  });
  it("captures category/note/stop edits and trims the note", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "10", category: "misc", note: "  dinner ", stop_id: "s2" },
        expense,
      ),
    ).toEqual({ category: "misc", note: "dinner", stop_id: "s2" });
  });
  it("ignores a non-positive amount edit", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "0", category: "food", note: "lunch", stop_id: "s1" },
        expense,
      ),
    ).toEqual({});
  });
});

describe("validateUnlinkedExpenseDraft", () => {
  it("rejects a non-positive amount", () => {
    expect(validateUnlinkedExpenseDraft({ amount: "0" })).toMatch(
      /greater than 0/,
    );
    expect(validateUnlinkedExpenseDraft({ amount: "" })).toMatch(
      /greater than 0/,
    );
  });
  it("accepts a positive amount", () => {
    expect(validateUnlinkedExpenseDraft({ amount: "3.5" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/expenseCategories.test.js`
Expected: FAIL — cannot resolve `../shared/constants/expenseCategories`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/shared/constants/expenseCategories.js

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

export function validateUnlinkedExpenseDraft(draft) {
  const val = parseFloat(draft.amount);
  if (isNaN(val) || val <= 0) return "Enter an amount greater than 0.";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/expenseCategories.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Lint + commit**

Run: `npm run lint`
Expected: 0 errors.

```bash
git add src/shared/constants/expenseCategories.js src/test/expenseCategories.test.js
git commit -m "feat(expenses): Slice 1 — shared expense-category constant + unlinked helpers"
```

---

## Task 2: Group unlinked expenses by category in the budget totals + breakdown

**Files:**

- Modify: `src/shared/hooks/useItems.js:67-79` (the second loop in `computeBudgetTotals`)
- Modify: `src/features/expenses/BudgetSummary.jsx`
- Test: `src/test/budgetSummary.test.js` (extend)

**Interfaces:**

- Consumes: `orderBudgetTypeKeys`, `categoryLabel` from Task 1.
- Produces: `computeBudgetTotals` now returns `byType` keyed by the unlinked expense's own `category` (falling back to `"other"`), linked expenses unchanged.

- [ ] **Step 1: Write the failing test** (append to `src/test/budgetSummary.test.js`)

```js
describe("computeBudgetTotals — unlinked expenses grouped by category", () => {
  const items = [
    {
      id: "1",
      name: "Hotel",
      type: "stay",
      status: "conf",
      estimated_cost: 500,
    },
  ];
  it("keys an unlinked expense by its own category, not 'other'", () => {
    const expenses = [
      { id: "e1", item_id: "1", amount: 450 },
      { id: "u1", item_id: null, category: "groceries", amount: 40 },
      { id: "u2", item_id: null, category: "gas", amount: 25 },
    ];
    const { byType, confTotal } = computeBudgetTotals(items, expenses);
    expect(byType.groceries.conf).toBe(40);
    expect(byType.gas.conf).toBe(25);
    expect(byType.other).toBeUndefined();
    expect(confTotal).toBe(515); // 450 + 40 + 25
  });
  it("falls back to 'other' when an unlinked expense has no category", () => {
    const expenses = [{ id: "u3", item_id: null, amount: 10 }];
    const { byType } = computeBudgetTotals(items, expenses);
    expect(byType.other.conf).toBe(10);
  });
  it("merges an unlinked item-type category into that type's row", () => {
    const expenses = [
      { id: "u4", item_id: null, category: "food", amount: 30 },
    ];
    const { byType } = computeBudgetTotals(items, expenses);
    expect(byType.food.conf).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/budgetSummary.test.js`
Expected: FAIL — `byType.groceries` is undefined (currently lumped into `other`).

- [ ] **Step 3: Write minimal implementation**

In `src/shared/hooks/useItems.js`, change the `typeKey` derivation inside the second loop of `computeBudgetTotals` (currently lines 70-75) from:

```js
const item = (items || []).find((it) => it.id === e.item_id);
const typeKey = item ? (item.type === "food" ? "food" : item.type) : "other";
```

to:

```js
const item = (items || []).find((it) => it.id === e.item_id);
const typeKey = item
  ? item.type === "food"
    ? "food"
    : item.type
  : e.category || "other"; // unlinked: group by its own category (stop-level expenses)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/budgetSummary.test.js`
Expected: PASS (existing cases + new ones — existing tests have no `category` on unlinked rows, so they still fall back to `"other"`).

- [ ] **Step 5: Render breakdown rows dynamically in BudgetSummary**

Replace the top-of-file constants and the `.map` block in `src/features/expenses/BudgetSummary.jsx`.

Replace lines 1-10 (imports + local label/order constants):

```js
import { useState, useMemo } from "react";
import { $f, computeBudgetTotals } from "../../shared/hooks/useItems";
import {
  categoryLabel,
  orderBudgetTypeKeys,
} from "../../shared/constants/expenseCategories";
```

Replace the breakdown `.map` (currently lines 66-82, the `{[...TYPE_ORDER, "other"].map(...)}` block) with:

```js
{
  orderBudgetTypeKeys(Object.keys(data.byType)).map((key) => {
    const row = data.byType[key];
    if (!row) return null;
    return (
      <div key={key} className="summary-bd-row">
        <span className="summary-bd-label">{categoryLabel(key)}</span>
        <span className="summary-bd-val">
          {row.sel > 0 ? $f(row.sel) : "—"}
        </span>
        <span className="summary-bd-val conf">
          {row.conf > 0 ? $f(row.conf) : "—"}
        </span>
      </div>
    );
  });
}
```

(The removed `TYPE_LABELS`/`TYPE_ORDER` locals are now provided by the shared constant. Confirm no other reference to them remains in the file.)

- [ ] **Step 6: Verify + commit**

Run: `npx vitest run` and `npm run lint`
Expected: all tests PASS, 0 lint errors.

```bash
git add src/shared/hooks/useItems.js src/features/expenses/BudgetSummary.jsx src/test/budgetSummary.test.js
git commit -m "feat(expenses): Slice 2 — group unlinked expenses by category in budget totals + breakdown"
```

---

## Task 3: "Log to a stop (no item)" mode in AddExpenseModal

**Files:**

- Modify: `src/shared/modals/AddExpenseModal.jsx`
- (Helpers already tested in Task 1 — no new test file; the modal wiring is phone-smoketested.)

**Interfaces:**

- Consumes: `EXPENSE_CATEGORIES`, `buildUnlinkedExpensePayload` from Task 1; `onAdd(expense)` (already the `addExpense` action).
- Produces: `AddExpenseModal` accepts two new optional props — `initialMode: "item" | "stop"` (default `"item"`) and `defaultStopId: string` — and can create an unlinked, categorized, stop-scoped expense.

- [ ] **Step 1: Extend the component signature and state**

In `src/shared/modals/AddExpenseModal.jsx`, update the props destructure (currently lines 5-14) to add `initialMode` and `defaultStopId`:

```js
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
```

Add the import at the top of the file (after the existing imports):

```js
import {
  EXPENSE_CATEGORIES,
  buildUnlinkedExpensePayload,
} from "../constants/expenseCategories";
```

Add new state alongside the existing `useState` hooks (after line 22):

```js
const [mode, setMode] = useState(initialMode); // 'item' | 'stop'
const [stopId, setStopId] = useState(defaultStopId);
const [category, setCategory] = useState("groceries");
const [error, setError] = useState("");
```

- [ ] **Step 2: Add the unlinked save handler**

Add this function next to the existing `handleSave` (after line 69):

```js
async function handleSaveUnlinked() {
  if (saving) return;
  const payload = buildUnlinkedExpensePayload({
    amount,
    category,
    note,
    stopId,
    userEmail,
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
```

- [ ] **Step 3: Add the mode toggle + stop-mode UI**

Immediately inside `<div className="detail-content">` (before the `{step === "select" && ...}` block, currently line 88), add a mode toggle:

```jsx
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
```

Then gate the existing item-mode blocks so they only show in item mode. Change the two conditions:

- `{step === "select" && (` → `{mode === "item" && step === "select" && (`
- `{step === "amount" && selectedItem && (` → `{mode === "item" && step === "amount" && selectedItem && (`

After the item-mode `{step === "amount" ...}` block (before the closing `</div>` of `detail-content`, currently line 219), add the stop-mode form:

```jsx
{
  mode === "stop" && (
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
        <div style={{ color: "var(--error)", fontSize: 12, marginBottom: 8 }}>
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
  );
}
```

- [ ] **Step 4: Verify + commit**

Run: `npx vitest run` and `npm run lint`
Expected: all tests PASS (no regressions), 0 lint errors.

Phone smoketest (human): FAB → Add expense → toggle "Log to a stop (no item)" → pick stop + category + amount → Add → appears under Unlinked with the right category in the breakdown.

```bash
git add src/shared/modals/AddExpenseModal.jsx
git commit -m "feat(expenses): Slice 3 — 'log to a stop (no item)' mode in AddExpenseModal"
```

---

## Task 4: "Add expense" entry point on each StopSection

**Files:**

- Modify: `src/features/itinerary/StopSection.jsx`
- Modify: `src/features/itinerary/TodayPage.jsx` (pass `items` to the combined-view `StopSection`, which currently omits it — see note)

**Interfaces:**

- Consumes: `AddExpenseModal` (Task 3), with `initialMode="stop"` and `defaultStopId={stop.id}`; the `addExpense` action and `stops`/`userEmail` props already threaded into `StopSection`.
- Produces: a per-stop "Add expense" button opening the modal pre-filled with that stop.

- [ ] **Step 1: Import the modal and add local state**

In `src/features/itinerary/StopSection.jsx`, add the import after the existing `AddItemModal` import (line 13):

```js
import AddExpenseModal from "../../shared/modals/AddExpenseModal";
```

Add state next to the existing `showAddItem` (line 44):

```js
const [showAddExpense, setShowAddExpense] = useState(false);
```

- [ ] **Step 2: Add the button + modal**

Directly after the existing `+ Add item to {stop.name}` button block (currently lines 398-405), add:

```jsx
{
  addExpense && (
    <button
      className="itin-add-item-btn"
      onClick={() => setShowAddExpense(true)}
      style={{ marginTop: 8 }}
    >
      + Add expense to {stop.name}
    </button>
  );
}
{
  showAddExpense && (
    <AddExpenseModal
      items={items}
      stops={stops}
      onAdd={addExpense}
      addExpense={addExpense}
      addItem={addItem}
      setFile={setFile}
      userEmail={userEmail || ""}
      initialMode="stop"
      defaultStopId={stop.id}
      onClose={() => setShowAddExpense(false)}
    />
  );
}
```

- [ ] **Step 3: Ensure the combined-view StopSection receives `items`**

In `src/features/itinerary/TodayPage.jsx`, the combined-view `<StopSection>` (the `selectedDate && activeStops.length > 1` branch, ~lines 195-212) already passes `items={items}`. Confirm both `<StopSection>` render sites pass `items`, `addExpense`, `stops`, and `userEmail`. They do — no change needed unless a prop is missing; if missing, add it. (This step is a verification checkpoint, not necessarily an edit.)

- [ ] **Step 4: Verify + commit**

Run: `npx vitest run` and `npm run lint`
Expected: all tests PASS, 0 lint errors.

Phone smoketest (human): Itinerary → a stop → "+ Add expense to <stop>" → modal opens in stop mode with that stop preselected → save → shows under Budget → Unlinked.

```bash
git add src/features/itinerary/StopSection.jsx src/features/itinerary/TodayPage.jsx
git commit -m "feat(expenses): Slice 4 — 'Add expense' entry point on each StopSection"
```

---

## Task 5: Full edit for unlinked expenses (ExpenseCard) + clickable Unlinked rows

**Files:**

- Modify: `src/shared/components/ExpenseCard.jsx`
- Modify: `src/features/expenses/BudgetPage.jsx`
- (Helpers already tested in Task 1.)

**Interfaces:**

- Consumes: `EXPENSE_CATEGORIES`, `categoryLabel`, `buildUnlinkedExpenseChanges`, `validateUnlinkedExpenseDraft` from Task 1; `updateExpense`/`deleteExpense` actions; `stops`.
- Produces: tapping an Unlinked row in the Budget tab opens `ExpenseCard`, which — for an unlinked expense — edits amount, category, note, and stop, then saves via `updateExpense`.

- [ ] **Step 1: ExpenseCard — detect unlinked and add edit state**

In `src/shared/components/ExpenseCard.jsx`, add imports after the existing ones (line 4):

```js
import {
  EXPENSE_CATEGORIES,
  categoryLabel,
  buildUnlinkedExpenseChanges,
  validateUnlinkedExpenseDraft,
} from "../constants/expenseCategories";
```

After `const isNew = !expense;` (line 11), add:

```js
// Unlinked (stop-level) expenses support full edit: amount, category, note, stop.
const isUnlinked = !!expense && !expense.item_id;
const [category, setCategory] = useState(expense?.category || "other");
const [note, setNote] = useState(expense?.note || "");
const [stopId, setStopId] = useState(expense?.stop_id || "");
```

- [ ] **Step 2: ExpenseCard — save changes for unlinked**

Extend `handleSave` so the unlinked branch persists all edited fields. Change the `else if (expense)` branch (currently lines 34-36) to:

```js
      } else if (expense && isUnlinked) {
        const draftError = validateUnlinkedExpenseDraft({ amount: amountInput });
        if (draftError) {
          setError(draftError);
          setSaving(false);
          return;
        }
        const changes = buildUnlinkedExpenseChanges(
          { amount: amountInput, category, note, stop_id: stopId },
          expense
        );
        if (Object.keys(changes).length > 0) await updateExpense(expense.id, changes);
      } else if (expense) {
        if (val !== Number(expense.amount)) await updateExpense(expense.id, { amount: val });
      }
```

- [ ] **Step 3: ExpenseCard — render editable fields for unlinked**

In the details block, replace the read-only Type/Stop/Note rows (currently lines 86-103, the `{displayItem?.type && ...}`, `{displayStop?.name && ...}`, `{expense?.note && ...}` rows) so that unlinked expenses render editable selects/inputs while linked expenses keep the existing read-only rows:

```jsx
{
  isUnlinked ? (
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
  );
}
```

Also update the header so an unlinked expense with no item shows its category label instead of "Expense". Change the `<h2>` (line 67) to:

```jsx
<h2 className="detail-name" style={{ fontSize: 18 }}>
  {displayItem?.name ||
    expense?.note ||
    (isUnlinked ? categoryLabel(expense?.category) : "Expense")}
</h2>
```

- [ ] **Step 4: BudgetPage — make Unlinked rows clickable + show stop + category**

In `src/features/expenses/BudgetPage.jsx`, add the import (after line 3):

```js
import { categoryLabel } from "../../shared/constants/expenseCategories";
```

Attach a stop to each unlinked expense in the `unlinkedExpenses` memo (currently lines 48-52):

```js
const unlinkedExpenses = useMemo(() => {
  return (expenses || [])
    .filter((e) => !e.item_id)
    .map((e) => ({ ...e, stop: e.stop_id ? stopsMap.get(e.stop_id) : null }))
    .sort(
      (a, b) =>
        (new Date(b.created_at).getTime() || 0) -
        (new Date(a.created_at).getTime() || 0),
    );
}, [expenses, stopsMap]);
```

Replace the Unlinked row markup (currently lines 115-158) so the row is clickable and shows category + stop, and the inline delete button does not open the card:

```jsx
{
  unlinkedExpenses.map((e) => (
    <div
      key={e.id}
      className="budget-item budget-item-unlinked"
      onClick={() => setSelectedExpense(e)}
      style={{ cursor: "pointer" }}
    >
      <div className="bi-left">
        <div className="bi-name">{e.note || categoryLabel(e.category)}</div>
        <div className="bi-meta">
          <span className="bi-type">{categoryLabel(e.category)}</span>
          {e.stop?.name && <span> · {e.stop.name}</span>}
          {e.created_at && (
            <span> · {new Date(e.created_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="bi-right">
        <div className="bi-paid">{$f(Number(e.amount))}</div>
        <button
          onClick={async (ev) => {
            ev.stopPropagation();
            if (!confirm("Delete this expense? This cannot be undone.")) return;
            try {
              await deleteExpense(e.id);
            } catch (err) {
              console.warn("Failed to delete expense:", err);
              alert("Failed to delete expense.");
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--danger-light)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          delete
        </button>
      </div>
    </div>
  ));
}
```

Confirm the existing `ExpenseCard` render (currently ~lines 202-216) passes `stops={stops}`, `updateExpense`, and `deleteExpense` — it does. `selectedExpense` for an unlinked row has `item` undefined, so `onViewItem`'s button is hidden (`onViewItem && displayItem`), which is correct.

- [ ] **Step 5: Verify + commit**

Run: `npx vitest run` and `npm run lint`
Expected: all tests PASS, 0 lint errors.

Phone smoketest (human): Budget → Unlinked → tap a row → edit amount/category/note/stop → Save → row reflects the change; Delete still works; the breakdown regroups.

```bash
git add src/shared/components/ExpenseCard.jsx src/features/expenses/BudgetPage.jsx
git commit -m "feat(expenses): Slice 5 — full edit for unlinked expenses + clickable Budget rows"
```

---

## Final verification (before opening the PR)

- [ ] `npx vitest run` — all suites green.
- [ ] `npm run lint` — 0 errors.
- [ ] `npm run build` — succeeds.
- [ ] `/code-review` the full branch diff; address findings (or record accepted ones).
- [ ] Push `feat/stop-expenses`; open PR **into `dev`** with a short summary + the phone-smoketest checklist above.

---

## Self-Review

**Spec coverage:**

- Decision (1) unified category list, linked locked / unlinked pickable → Task 1 (`EXPENSE_CATEGORIES`) + Task 3/5 (pickers only in stop/unlinked paths; linked keeps `category: item.type`, no picker added). ✅
- Decision (2) two entry points (modal toggle + StopSection button) → Task 3 + Task 4. ✅
- Decision (3) full edit for unlinked (amount, category, note, stop; save/delete) → Task 5. ✅
- Decision (4) extend AddExpenseModal + ExpenseCard + one shared constant, no parallel modal → Tasks 1, 3, 5 (no new modal component). ✅
- "No DB migration" → Global Constraints; nothing under `supabase/migrations/`. ✅
- "Unlinked section clickable, show stop + category" → Task 5 Step 4. ✅
- "computeBudgetTotals/BudgetSummary group unlinked by own category, not Other" → Task 2. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✅

**Type/name consistency:** `buildUnlinkedExpensePayload`, `buildUnlinkedExpenseChanges`, `validateUnlinkedExpenseDraft`, `categoryLabel`, `orderBudgetTypeKeys`, `EXPENSE_CATEGORIES`, `CATEGORY_ORDER` — defined in Task 1, consumed with identical names in Tasks 2/3/5. `initialMode`/`defaultStopId` props consistent between Task 3 (definition) and Task 4 (use). ✅
