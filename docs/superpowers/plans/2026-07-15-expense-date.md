# Expense Date Implementation Plan

**Goal:** Give every expense a real, meaningful date. A **linked** expense copies its item's start date at creation (read-only, mirroring how category is locked to the item type); an **unlinked** (stop) expense carries a user-picked `expense_date` that defaults to today and is fully editable. Budget sort/display use `expense_date`, falling back to `created_at` for legacy rows.

## Locked decisions

1. **Linked date = derived & read-only.** Copy the item's start date (`items.start_time` → `YYYY-MM-DD`) at creation; if the item has no `start_time`, leave `expense_date` null → display falls back to `created_at`.
2. **Unlinked default = today** (`todayStr()`), fully editable.
3. **Sort & display use `expense_date`**, falling back to `created_at`. Existing rows backfilled `expense_date = created_at::date`.

## DB migration (applied via Supabase connector — DONE)

```sql
alter table public.expenses add column if not exists expense_date date;
update public.expenses set expense_date = created_at::date
  where expense_date is null and created_at is not null;
```

Nullable + backward-compatible (currently-live prod code ignores the column). Applied to project `eestsuywkpxddjvyqers`; 32/32 rows backfilled. Migration name: `add_expenses_expense_date`.

## Creation sites that must stamp `expense_date` (linked → `itemStartDate(item) || null`)

- `src/shared/components/ExpenseCard.jsx` — create-for-existing-item (`item`).
- `src/shared/modals/AddItemModal.jsx` — new confirmed item (`form.start_time`).
- `src/shared/modals/AddExpenseModal.jsx` — item mode (`selectedItem`).

Unlinked creation: `AddExpenseModal` stop mode → `expense_date` from the date input (default `todayStr()`), through `buildUnlinkedExpensePayload`.

## Display / sort / edit sites

- `src/features/expenses/BudgetPage.jsx` — sort confirmed + unlinked by `expenseSortValue`; show `expenseDisplayDate`.
- `src/shared/components/ExpenseCard.jsx` — Date row: read-only `expenseDisplayDate` for linked; editable `<input type="date">` for unlinked.

## Slices

- **Slice 1** — `src/shared/constants/expenseDate.js`: `itemStartDate`, `expenseSortValue`, `expenseDisplayDate` (pure, tested).
- **Slice 2** — `expenseCategories.js` builders carry `expense_date`; three linked sites stamp `itemStartDate`; `AddExpenseModal` stop mode date input (default today). Builder tests extended.
- **Slice 3** — `BudgetPage` sort/display; `ExpenseCard` date row (linked read-only / unlinked editable).

Verify per slice: `npm test` + `npm run lint` green; build green before PR. `/code-review` the branch; PR into `dev`.
