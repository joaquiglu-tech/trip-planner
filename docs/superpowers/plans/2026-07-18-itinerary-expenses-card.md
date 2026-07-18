# Itinerary Expenses Section + Shared Budget Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Itinerary tab a shared budget card (reused from Plan/Expenses, filtered per stop), a per-stop logged-expenses list, and drop the unused Stops/Dates toggle.

**Architecture:** Reuse the existing `BudgetSummary` card unchanged — callers pass filtered `items`/`expenses`. One new pure helper `stopBudgetSlice(items, expenses, stopId)` (in `itinerary/utils.js`) produces a stop's slice, driving both the filtered card and the expenses list. Modal state stays in the page (`TodayPage`); `StopSection` stays presentational.

**Tech Stack:** React 19 + Vite, Vitest for tests, ESLint. No new dependencies.

## Global Constraints

- Never commit to `main`; work stays on `claude/itinerary-expenses-section-94br6x`.
- Data access only through `src/services/` — this plan touches none (pure/presentational only).
- Shared domain logic pure and side-effect-free (no Supabase/fetch/service imports). `stopBudgetSlice` obeys this.
- Tests colocated in `src/test/` as `*.test.js`.
- `BudgetSummary`, `computeBudgetTotals`, and the expense data model are unchanged.
- Quality gates before "done": `npm test` and `npm run lint` both green.
- Mobile-first; reuse existing `.budget-summary`, `.budget-item`/`.bi-*`, `.sect-title` markup — no new visual patterns.
- Commit identity: `git config user.email noreply@anthropic.com && git config user.name Claude` (already set this session).

---

### Task 1: `stopBudgetSlice` helper (pure, TDD)

**Files:**

- Modify: `src/features/itinerary/utils.js` (add export near `itemInStop`, ~line 86)
- Test: `src/test/stopBudgetSlice.test.js` (create)

**Interfaces:**

- Consumes: existing `itemInStop(it, stopId)` from the same file.
- Produces: `stopBudgetSlice(items, expenses, stopId) → { items: Item[], expenses: Expense[] }`. `items` = items where `itemInStop(it, stopId)`. `expenses` = expenses whose `item_id` is one of those items **or** whose `stop_id === stopId`. Null-safe on both array args.

- [ ] **Step 1: Write the failing test**

Create `src/test/stopBudgetSlice.test.js`:

```js
import { describe, it, expect } from "vitest";
import { stopBudgetSlice } from "../features/itinerary/utils";
import { computeBudgetTotals } from "../shared/hooks/useItems";

const items = [
  {
    id: "i1",
    type: "stay",
    status: "conf",
    estimated_cost: 100,
    stop_ids: ["s1"],
  },
  {
    id: "i2",
    type: "activity",
    status: "sel",
    estimated_cost: 20,
    stop_ids: ["s1", "s2"],
  },
  {
    id: "i3",
    type: "food",
    status: "sel",
    estimated_cost: 30,
    stop_ids: ["s2"],
  },
];
const expenses = [
  { id: "e1", item_id: "i1", amount: 90 }, // linked, in s1
  { id: "e2", item_id: "i3", amount: 25 }, // linked, in s2 only
  { id: "e3", stop_id: "s1", amount: 15, category: "other" }, // stop-level, s1
  { id: "e4", stop_id: "s2", amount: 5, category: "other" }, // stop-level, s2
];

describe("stopBudgetSlice", () => {
  it("returns empty slice for a stop with nothing", () => {
    const r = stopBudgetSlice(items, expenses, "s9");
    expect(r.items).toEqual([]);
    expect(r.expenses).toEqual([]);
  });

  it("includes items in the stop and their linked expenses", () => {
    const r = stopBudgetSlice(items, expenses, "s1");
    expect(r.items.map((i) => i.id).sort()).toEqual(["i1", "i2"]);
    expect(r.expenses.map((e) => e.id).sort()).toEqual(["e1", "e3"]);
  });

  it("includes stop-level unlinked expenses via stop_id", () => {
    const r = stopBudgetSlice(items, expenses, "s2");
    // i2 (multi-stop) + i3; expenses e2 (linked i3) + e4 (stop_id s2)
    expect(r.items.map((i) => i.id).sort()).toEqual(["i2", "i3"]);
    expect(r.expenses.map((e) => e.id).sort()).toEqual(["e2", "e4"]);
  });

  it("counts a multi-stop item for each of its stops", () => {
    expect(
      stopBudgetSlice(items, expenses, "s1").items.some((i) => i.id === "i2"),
    ).toBe(true);
    expect(
      stopBudgetSlice(items, expenses, "s2").items.some((i) => i.id === "i2"),
    ).toBe(true);
  });

  it("is null-safe", () => {
    expect(stopBudgetSlice(null, null, "s1")).toEqual({
      items: [],
      expenses: [],
    });
    expect(stopBudgetSlice(undefined, undefined, "s1")).toEqual({
      items: [],
      expenses: [],
    });
  });

  it("feeds computeBudgetTotals to give stop-scoped totals", () => {
    const r = stopBudgetSlice(items, expenses, "s1");
    const t = computeBudgetTotals(r.items, r.expenses);
    // i1 conf -> expense 90; i2 sel -> est 20  => selTotal 110
    expect(t.selTotal).toBe(110);
    // confirmed = positive expenses in slice: e1 90 + e3 15 = 105
    expect(t.confTotal).toBe(105);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/stopBudgetSlice.test.js`
Expected: FAIL — `stopBudgetSlice is not a function` / not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/features/itinerary/utils.js`, add directly after the `itemInStop` function (after line 88):

```js
// Items + expenses belonging to a single stop, for a stop-scoped BudgetSummary
// and the per-stop expenses list. An expense belongs to the stop if its linked
// item is in the stop, or it is tagged directly to the stop (stop_id).
export function stopBudgetSlice(items, expenses, stopId) {
  const stopItems = (items || []).filter((it) => itemInStop(it, stopId));
  const itemIds = new Set(stopItems.map((it) => it.id));
  const stopExpenses = (expenses || []).filter(
    (e) => (e.item_id && itemIds.has(e.item_id)) || e.stop_id === stopId,
  );
  return { items: stopItems, expenses: stopExpenses };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/stopBudgetSlice.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/itinerary/utils.js src/test/stopBudgetSlice.test.js
git commit -m "feat(itinerary): add stopBudgetSlice helper for stop-scoped budget"
```

---

### Task 2: Remove the Stops/Dates toggle (refactor)

Removes the unused dates view. Guarded by the existing suite staying green — no new tests. Pure deletion of a feature; `getCalendarDates` and other pure date helpers stay in `utils.js` (still exported and tested by `dateFiltering.test.js`).

**Files:**

- Modify: `src/features/itinerary/TodayPage.jsx`
- Modify: `src/features/itinerary/StopSection.jsx`

**Interfaces:**

- Produces: `TodayPage` view state is only `"overview"` or `{ type: "stop", idx }`. `StopSection` no longer accepts `selectedDate` / `combinedStopIds`.

- [ ] **Step 1: Simplify `TodayPage` imports and state**

In `src/features/itinerary/TodayPage.jsx`:

Change the utils import (line 7-13) to drop `toDateStr`, `getCalendarDates`, `todayStr`:

```js
import { formatStopDate, getTodayDayIndex } from "./utils";
```

Delete the `selectorMode` state line (line 42):

```js
const [selectorMode, setSelectorMode] = useState("stops");
```

Delete the `calendarDates` and `todayDateStr` lines (49-50):

```js
const calendarDates = useMemo(() => getCalendarDates(stops), [stops]);
const todayDateStr = todayStr(); // local date (M34), not UTC toISOString
```

- [ ] **Step 2: Simplify `activeStops` and remove date helpers**

Replace the `activeStops` memo (lines 54-64) with:

```js
const activeStops = useMemo(() => {
  if (view === "overview") return [];
  return stops[view.idx] ? [stops[view.idx]] : [];
}, [view, stops]);
```

Delete the `selectedDate` const (67-68) and the `isDateActive` const (72-73):

```js
const selectedDate =
  view !== "overview" && view.type === "date" ? view.date : null;
```

```js
const isDateActive = (date) =>
  view !== "overview" && view.type === "date" && view.date === date;
```

In the `selectorRef` scroll effect (line 92), change the dependency array `[view, selectorMode]` to `[view]`.

- [ ] **Step 3: Remove the toggle + dates pills from render**

Delete the entire `itin-mode-toggle` block (lines 96-110, the `{/* Stops/Dates toggle */}` comment through its closing `</div>`).

Replace the pills block (lines 112-177) so only stops render. The new block:

```jsx
{
  /* Pills: stops */
}
<div className="today-selector" ref={selectorRef}>
  <button
    className={`itin-overview-pill ${view === "overview" ? "active" : ""}`}
    onClick={() => setView("overview")}
  >
    Overview
  </button>
  {isDuringTrip && !isActive(todayIdx) && (
    <button
      className="today-sel-pill today-pill-accent"
      onClick={() => setView({ type: "stop", idx: todayIdx })}
    >
      Today
    </button>
  )}
  {stops.map((s, i) => (
    <button
      key={s.id}
      data-active={isActive(i) ? "true" : "false"}
      className={`today-sel-pill today-sel-pill-stop ${isActive(i) ? "active" : ""} ${i === todayIdx ? "is-today" : ""}`}
      onClick={() => setView({ type: "stop", idx: i })}
      style={{ borderLeftColor: "var(--accent)" }}
    >
      <span className="pill-stop-name" title={s.name}>
        {s.name}
      </span>
      <span className="pill-stop-date">{formatStopDate(s)}</span>
    </button>
  ))}
</div>;
```

- [ ] **Step 4: Collapse the content render to a single stop branch**

Replace the content block (lines 184-236, from `{/* Content: overview or stop sections */}` through the end of the `activeStops.map(...)` expression) with:

```jsx
{
  /* Content: overview or stop section */
}
{
  view === "overview" ? (
    <OverviewView
      items={items}
      stops={stops}
      expenses={expenses}
      onItemTap={setSelectedItem}
      onDaySelect={(idx) => setView({ type: "stop", idx })}
    />
  ) : (
    activeStops.map((stop) => (
      <StopSection
        key={stop.id}
        stop={stop}
        items={items}
        onItemTap={setSelectedItem}
        places={places}
        statusFilter={statusFilter}
        updateStop={updateStop}
        deleteStop={deleteStop}
        updateItem={updateItem}
        addItem={addItem}
        addExpense={addExpense}
        setFile={setFile}
        userEmail={email}
        stops={stops}
        showTitle={false}
        livePrices={livePrices}
        expenseMap={expenseMap}
      />
    ))
  );
}
```

(The `activeStops.length === 0 && view !== "overview"` empty-state block just below stays as-is.)

- [ ] **Step 5: Strip dead date paths from `StopSection`**

In `src/features/itinerary/StopSection.jsx`:

Delete the `getItemDate` helper (lines 16-20):

```js
function getItemDate(startTime) {
  if (!startTime) return null;
  return startTime.includes("T") ? startTime.split("T")[0] : null;
}
```

Remove `selectedDate` and `combinedStopIds` from the props destructure (lines 39-40).

Replace the `scheduled` memo (lines 79-103) with a single-stop version:

```jsx
const scheduled = useMemo(() => {
  return items
    .filter((it) => {
      if (!itemInStop(it, stop.id)) return false;
      if (it.type === "transport" && it.stop_ids?.[0] !== stop.id) return false;
      return true;
    })
    .filter((it) => {
      if (statusFilter === "all")
        return it.status === "sel" || it.status === "conf";
      return it.status === statusFilter;
    })
    .sort(
      (a, b) =>
        (a.start_time || "zz").localeCompare(b.start_time || "zz") ||
        (a.sort_order || 0) - (b.sort_order || 0),
    );
}, [items, stop.id, statusFilter]);
```

Replace the `allStopItems` memo (lines 124-136) with:

```jsx
const allStopItems = useMemo(
  () => items.filter((it) => itemInStop(it, stop.id)),
  [items, stop.id],
);
```

Remove the `stopIdsToMatch` line (line 77) entirely — no longer referenced.

In the compact dates display (lines 246-278), remove the `selectedDate` branch so it always shows the stop range. Replace the `<span>` date expression (lines 252-273) with:

```jsx
<span>{formatStopDate(stop)}</span>;
{
  nights > 1 && <span className="itin-nights">{nights}n</span>;
}
```

Remove `selectedDate` usage in the empty-schedule text (line 364): change

```jsx
                  No items scheduled
                  {selectedDate ? " for this date" : ` for ${stop.name}`}.
```

to

```jsx
                  No items scheduled for {stop.name}.
```

Remove `selectedDate` from `ScheduleList` props (line 356): delete the `selectedDate={selectedDate}` line.

- [ ] **Step 6: Verify suite + lint green**

Run: `npm test`
Expected: PASS (all files, including unchanged `dateFiltering.test.js`).

Run: `npm run lint`
Expected: no errors (watch for unused `toDateStr` import — it's still used by the stop-edit form in `StopSection`, keep it there; confirm no unused vars in `TodayPage`).

- [ ] **Step 7: Commit**

```bash
git add src/features/itinerary/TodayPage.jsx src/features/itinerary/StopSection.jsx
git commit -m "refactor(itinerary): remove unused Stops/Dates toggle, keep stops view only"
```

---

### Task 3: Shared budget card on Itinerary Overview

Replaces the bespoke `home-stats` card with the shared `BudgetSummary` (full-trip totals).

**Files:**

- Modify: `src/features/itinerary/OverviewView.jsx`

**Interfaces:**

- Consumes: `BudgetSummary` (`../expenses/BudgetSummary`), takes `items` + `expenses`.

- [ ] **Step 1: Swap imports**

In `src/features/itinerary/OverviewView.jsx`:

Change line 1-2 from

```js
import { useMemo } from "react";
import { $f, computeBudgetTotals } from "../../shared/hooks/useItems";
```

to

```js
import { useMemo } from "react";
import BudgetSummary from "../expenses/BudgetSummary";
```

- [ ] **Step 2: Remove the `stats` memo**

Delete lines 18-22:

```js
// Single source of truth shared with BudgetSummary (C4)
const stats = useMemo(() => {
  const { selTotal, confTotal } = computeBudgetTotals(items, expenses);
  return { estimated: selTotal, confirmed: confTotal };
}, [items, expenses]);
```

- [ ] **Step 3: Replace the `home-stats` block with the shared card**

Replace the `home-stats` block (lines 64-75) with:

```jsx
<BudgetSummary items={items} expenses={expenses} />
```

- [ ] **Step 4: Verify + lint**

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: no errors (no unused `$f` / `computeBudgetTotals`; `useMemo` still used by `daysLeft` / `recentItems`).

- [ ] **Step 5: Commit**

```bash
git add src/features/itinerary/OverviewView.jsx
git commit -m "feat(itinerary): use shared BudgetSummary card on Overview"
```

---

### Task 4: Stop-filtered budget card in `StopSection`

Adds the shared card, scoped to the stop, at the top of the stop's content.

**Files:**

- Modify: `src/features/itinerary/StopSection.jsx`
- Modify: `src/features/itinerary/TodayPage.jsx` (pass `expenses` prop)

**Interfaces:**

- Consumes: `stopBudgetSlice` (Task 1), `BudgetSummary` (`../expenses/BudgetSummary`).
- Produces: `StopSection` accepts an `expenses` prop and exposes `budgetSlice` (a `useMemo` of `stopBudgetSlice(items, expenses, stop.id)`) reused by Task 5.

- [ ] **Step 1: Pass `expenses` into `StopSection` from `TodayPage`**

In `src/features/itinerary/TodayPage.jsx`, in the `StopSection` render (the `activeStops.map` block from Task 2 Step 4), add `expenses={expenses}` alongside the other props (e.g. after `items={items}`).

- [ ] **Step 2: Add imports + slice memo in `StopSection`**

In `src/features/itinerary/StopSection.jsx`:

Add to the utils import (line 2-9) `stopBudgetSlice`:

```js
import {
  toDateStr,
  formatStopDate,
  calcNights,
  itemInStop,
  getStay,
  validateStopDates,
  stopBudgetSlice,
} from "./utils";
```

Add a new import:

```js
import BudgetSummary from "../expenses/BudgetSummary";
```

Add `expenses` to the props destructure (with the other props, e.g. after `items,`).

Add the memo near the other memos (e.g. after `scheduled`):

```jsx
const budgetSlice = useMemo(
  () => stopBudgetSlice(items, expenses, stop.id),
  [items, expenses, stop.id],
);
```

- [ ] **Step 3: Render the card after the dates/stay header**

In the render, immediately after the `itin-general` block's closing `</div>` (the block that starts `<div className="itin-general">`) and before `<div className="itin-map-schedule">`, insert:

```jsx
<BudgetSummary items={budgetSlice.items} expenses={budgetSlice.expenses} />
```

- [ ] **Step 4: Verify + lint**

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/itinerary/StopSection.jsx src/features/itinerary/TodayPage.jsx
git commit -m "feat(itinerary): stop-filtered BudgetSummary card per stop"
```

---

### Task 5: Per-stop logged-expenses list + `ExpenseCard` wiring

Adds the tappable expenses list to each stop, opening the shared `ExpenseCard` (centralized in `TodayPage`, mirroring `BudgetPage`).

**Files:**

- Modify: `src/features/itinerary/StopSection.jsx`
- Modify: `src/features/itinerary/TodayPage.jsx`

**Interfaces:**

- Consumes: `budgetSlice` (Task 4), `$f` (`../../shared/hooks/useItems`), `categoryLabel` (`../../shared/constants/expenseCategories`), `expenseSortValue` + `expenseDisplayDate` (`../../shared/constants/expenseDate`), `ExpenseCard` (`../../shared/components/ExpenseCard`).
- Produces: `StopSection` calls `onExpenseTap(enrichedExpense)` where `enrichedExpense = { ...expense, item, stop }`. `TodayPage` owns `selectedExpense` state and renders `ExpenseCard`.

- [ ] **Step 1: Build the enriched stop-expenses list in `StopSection`**

In `src/features/itinerary/StopSection.jsx` add imports:

```js
import { $f } from "../../shared/hooks/useItems";
import { categoryLabel } from "../../shared/constants/expenseCategories";
import {
  expenseSortValue,
  expenseDisplayDate,
} from "../../shared/constants/expenseDate";
```

Add `onExpenseTap` to the props destructure.

Add a memo (after `budgetSlice`):

```jsx
const stopExpenses = useMemo(() => {
  return budgetSlice.expenses
    .map((e) => ({
      ...e,
      item: e.item_id ? items.find((it) => it.id === e.item_id) || null : null,
      stop,
    }))
    .sort((a, b) => expenseSortValue(b) - expenseSortValue(a));
}, [budgetSlice.expenses, items, stop]);
```

- [ ] **Step 2: Render the Expenses section after `PlanSection`**

Immediately after the `<PlanSection ... />` element (around line 394-399) and before the `{addItem && (` add-item button, insert:

```jsx
<div className="sect-title" style={{ marginTop: 12 }}>
  Expenses ({stopExpenses.length})
</div>;
{
  stopExpenses.length > 0 ? (
    <div className="budget-list">
      {stopExpenses.map((e) => (
        <div
          key={e.id}
          className="budget-item budget-item-conf"
          onClick={() => onExpenseTap && onExpenseTap(e)}
          style={{ cursor: "pointer" }}
        >
          <div className="bi-left">
            <div className="bi-name">
              {e.item?.name || e.note || categoryLabel(e.category)}
            </div>
            <div className="bi-meta">
              <span className="bi-type">
                {e.item?.type || categoryLabel(e.category)}
              </span>
              {expenseDisplayDate(e) && <span> · {expenseDisplayDate(e)}</span>}
            </div>
          </div>
          <div className="bi-right">
            <div className="bi-paid">{$f(Number(e.amount))}</div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="itin-empty">
      <div className="itin-empty-text">No expenses logged for this stop.</div>
    </div>
  );
}
```

- [ ] **Step 3: Wire `ExpenseCard` in `TodayPage`**

In `src/features/itinerary/TodayPage.jsx`:

Add import:

```js
import ExpenseCard from "../../shared/components/ExpenseCard";
```

Add state near `selectedItem` (line 40):

```js
const [selectedExpense, setSelectedExpense] = useState(null);
```

Pass `onExpenseTap={setSelectedExpense}` to `StopSection` (in the `activeStops.map` block, alongside the other props).

Render the card — add just before the `{/* DetailModal */}` block (around line 243):

```jsx
{
  selectedExpense && (
    <ExpenseCard
      expense={selectedExpense}
      item={selectedExpense.item}
      stops={stops}
      onClose={() => setSelectedExpense(null)}
      onViewItem={() => {
        const it = selectedExpense.item;
        setSelectedExpense(null);
        if (it) setSelectedItem(it);
      }}
      addExpense={addExpense}
      updateExpense={updateExpense}
      deleteExpense={deleteExpense}
    />
  );
}
```

- [ ] **Step 4: Verify + lint**

Run: `npm test`
Expected: PASS.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/itinerary/StopSection.jsx src/features/itinerary/TodayPage.jsx
git commit -m "feat(itinerary): per-stop logged-expenses list with ExpenseCard"
```

---

### Task 6: Final verification + code review

**Files:** none (verification only)

- [ ] **Step 1: Full suite + lint + build**

Run: `npm test` → all green.
Run: `npm run lint` → clean.
Run: `npm run build` → succeeds (catches import/JSX errors the phone smoketest can't).

- [ ] **Step 2: Adversarial review**

Run the built-in `/code-review` on the branch diff (per CLAUDE.md — expense math is a risk area). Address any confirmed findings, re-run tests.

- [ ] **Step 3: Push**

```bash
git push -u origin claude/itinerary-expenses-section-94br6x
```

- [ ] **Step 4: Hand off for phone smoketest**

Summarize for the user to smoketest in the real app (no in-session browser): Overview shows the shared card; each stop shows a stop-filtered card + logged-expenses list that open `ExpenseCard`; the Stops/Dates toggle is gone.

---

## Self-Review

**Spec coverage:**

- Task 1 (spec §Task 1 list) → Task 5. ✅
- Shared card all 3 tabs / stop-filtered (spec §Task 2) → Tasks 3 (Overview) + 4 (stop). Plan/Expenses already use it. ✅
- Remove Stops/Dates toggle (spec §Task 3) → Task 2. ✅
- `stopBudgetSlice` helper + tests (spec §Testing) → Task 1. ✅
- Boundaries: `BudgetSummary` unchanged, helper pure, modal state in page → honored across Tasks 1/4/5. ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✅

**Type consistency:** `stopBudgetSlice(items, expenses, stopId) → { items, expenses }` defined in Task 1, consumed identically in Tasks 4/5. `budgetSlice` memo produced in Task 4, reused in Task 5. `onExpenseTap(enrichedExpense)` shape `{ ...expense, item, stop }` matches `ExpenseCard`'s `expense`/`item`/`stops` props. ✅
