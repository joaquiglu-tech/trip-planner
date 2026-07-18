# Itinerary Expenses Section + Shared Budget Card — Design

Date: 2026-07-18
Branch: `claude/itinerary-expenses-section-94br6x`

## Goal

Three related changes to the Itinerary tab:

1. **Expenses section per stop** — each stop in the Itinerary shows a list of its
   logged expenses.
2. **One shared budget card in all 3 tabs** — reuse the existing `BudgetSummary`
   card (already used in Plan + Expenses) in the Itinerary too, replacing the
   different `home-stats` card on Overview. On a specific stop, the same card is
   filtered to that stop.
3. **Remove the Stops/Dates toggle** — the Itinerary keeps only the stops view;
   the dates view is unused and goes away.

## Context (current state)

- `BudgetSummary` (`src/features/expenses/BudgetSummary.jsx`) is the reusable card.
  It takes `items` + `expenses`, computes totals via `computeBudgetTotals`
  (`src/shared/hooks/useItems.js`), and expands to a per-type breakdown. Used in
  `SelectPage` (Plan) and `BudgetPage` (Expenses).
- `OverviewView` (Itinerary) renders a _different_, simpler card: `home-stats`
  (Estimated / Confirmed only). This is the inconsistency to remove.
- `TodayPage` owns the Stops/Dates toggle (`itin-mode-toggle`, `selectorMode`
  state) and all dates-mode pill + filtering logic (`getCalendarDates`,
  `view.type === "date"`, `selectedDate`, `combinedStopIds`).
- Per-stop content lives in `StopSection` (dates/stay header, Map, Schedule,
  Plan section, add buttons). It receives `items` + `expenseMap`, not `expenses`.
- Expenses belong to a stop two ways: linked to an item that is in the stop
  (`e.item_id` → item with `itemInStop(item, stopId)`), or tagged directly to the
  stop (`e.stop_id === stopId`). `BudgetPage` already uses both patterns.

## Decisions (confirmed with user)

- **Expenses section content:** a **logged-expenses list** — the expenses tied to
  the stop as tappable rows (name · type/category · date · amount), mirroring the
  Expenses tab's "Confirmed" list, scoped to the stop. Not a full Confirmed/
  Planned/Unlinked breakdown.
- **Stop scope:** an expense belongs to a stop if its linked item is in the stop
  (`itemInStop`) **or** it is tagged to the stop (`e.stop_id === stopId`). Same
  scope drives both the filtered card and the list.
- **Card placement:** top of each stop's content (right after the dates/stay
  header). Expenses list is **per stop only** — not on Overview. Overview shows
  the full-trip `BudgetSummary`.

## Task 3 — Remove the Stops/Dates toggle (do first)

`src/features/itinerary/TodayPage.jsx`:

- Delete the `itin-mode-toggle` block and `selectorMode` state.
- Render only the stops pills; drop the `calendarDates.map(...)` dates branch.
- Remove date-mode paths: `view.type === "date"`, `selectedDate`,
  `combinedStopIds`, and the "overlapping stops combined view" `StopSection`
  branch. `activeStops` collapses to `overview → []`, `stop → [stops[idx]]`.
- Keep the Overview pill, Today pill, stop pills, and `StatusFilter`.
- Remove now-unused imports: `toDateStr`, `getCalendarDates`, `todayStr`.

`src/features/itinerary/StopSection.jsx`:

- Remove the now-dead `selectedDate` / `combinedStopIds` props and their code
  paths (each stop view is always a single stop now): the local `getItemDate`
  helper, the `stopIdsToMatch` combining, and the `selectedDate` date-filtering in
  `scheduled` / `allStopItems`. `stopIdsToMatch` becomes `[stop.id]`.

Pure date helpers (`getCalendarDates`, `getItemDate`-style logic) **remain** in
`utils.js` — they are pure and independently tested; leaving them keeps the diff
focused. `dateFiltering.test.js` continues to pass unchanged (its "date mode"
block tests a local function, not app code).

## Task 2 — Shared budget card, stop-filtered

- **Reuse `BudgetSummary` as-is.** No new props, no edits to it. Callers pass
  filtered arrays.
- **New pure helper** in `src/features/itinerary/utils.js`:

  ```js
  // Items + expenses belonging to a single stop, for a stop-scoped BudgetSummary.
  export function stopBudgetSlice(items, expenses, stopId) {
    const stopItems = (items || []).filter((it) => itemInStop(it, stopId));
    const itemIds = new Set(stopItems.map((it) => it.id));
    const stopExpenses = (expenses || []).filter(
      (e) => (e.item_id && itemIds.has(e.item_id)) || e.stop_id === stopId,
    );
    return { items: stopItems, expenses: stopExpenses };
  }
  ```

  Pure, side-effect-free, uses existing `itemInStop`. Colocated + tested in
  `src/test/`.

- `OverviewView`: replace the `home-stats` block with
  `<BudgetSummary items={items} expenses={expenses} />` (full-trip totals). Drop
  the now-unused `stats` memo and `computeBudgetTotals` / `$f` imports if unused.
- `StopSection`: compute `stopBudgetSlice(items, expenses, stop.id)` and render
  `<BudgetSummary items={slice.items} expenses={slice.expenses} />` at the top of
  the stop's content (after the dates/stay header). Requires passing `expenses`
  to `StopSection` (see Task 1).

## Task 1 — Logged-expenses list per stop

`StopSection.jsx`:

- Gains an `expenses` prop.
- Builds the stop's logged expenses from `stopBudgetSlice(...).expenses`, enriched
  with `{ item, stop }` (like `BudgetPage`), sorted newest-first via
  `expenseSortValue` (`src/shared/constants/expenseDate.js`).
- Renders them as tappable rows reusing the existing `.budget-item` / `.bi-*`
  markup: name (`e.item?.name || e.note || category`), meta (type/category ·
  date via `expenseDisplayDate`), amount (`$f`). Empty state when none.
- Placement: a new "Expenses" section after the Plan section, before the add
  buttons.

Modal wiring stays centralized (mirroring `BudgetPage`):

- `TodayPage` owns `selectedExpense` state + renders `ExpenseCard`
  (`src/shared/components/ExpenseCard.jsx`) with `onViewItem` jumping to the
  linked item's `DetailModal`. It already has `addExpense` / `updateExpense` /
  `deleteExpense`.
- `StopSection` gets a new `onExpenseTap` prop and calls it with the enriched
  expense. `StopSection` stays presentational.

## Architecture / boundaries

- `BudgetSummary` unchanged and pure (no cross-feature imports).
- All stop-filtering logic is one tested helper (`stopBudgetSlice`) in
  `itinerary/utils.js` (pure, no service/fetch imports — satisfies lib rules).
- Modal state stays in the page (`TodayPage`); `StopSection` stays presentational
  (data via props).
- Mobile-first: reuse existing `.budget-summary`, `.budget-item`, `.sect-title`
  markup — no new visual patterns.

## Testing

- Unit tests for `stopBudgetSlice` (in `src/test/`, `*.test.js`):
  - empty stop → empty items + expenses
  - item-linked expense included when item is in stop
  - stop-level unlinked expense (`e.stop_id`) included
  - multi-stop item (in two stops) included for each
  - item / expense not in stop excluded
  - null/undefined `items` / `expenses` safe
- Feed a slice into `computeBudgetTotals` and assert stop totals match (refund /
  zero handling is already delegated to and covered by `computeBudgetTotals`).
- Full suite stays green: `npm test`.
- Lint clean: `npm run lint`.

## Out of scope

- No changes to `BudgetSummary`, `computeBudgetTotals`, or the expense data model.
- No changes to the Plan / Expenses tabs beyond the shared card already used there.
- Dates-view feature is removed from the UI but pure date helpers remain in
  `utils.js`.
