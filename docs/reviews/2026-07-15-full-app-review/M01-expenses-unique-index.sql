-- ============================================================================
-- M01 — Enforce "max 1 expense per item" at the database level.
-- ============================================================================
-- Status: PROPOSED — review and apply via the Supabase dashboard (SQL editor)
-- or `supabase migration new`. This repo has no local Supabase project, and
-- migrations must be generated/applied through Supabase, never hand-edited into
-- supabase/migrations/ (project guardrail). This file is a review artifact only.
--
-- The client already guards this in useExpenses.addExpense (itemHasExpense),
-- but a DB constraint is the real enforcement — it also catches concurrent
-- writes from two devices, which the client guard cannot.
--
-- Unlinked expenses (item_id IS NULL) stay unlimited: a partial unique index
-- ignores NULLs, so "expenses not tied to an item" are unaffected.
-- ----------------------------------------------------------------------------

-- STEP 1 — Pre-check. Creating the index will FAIL if any item already has
-- more than one expense. Run this first; it must return ZERO rows.
SELECT item_id, count(*) AS n
FROM public.expenses
WHERE item_id IS NOT NULL
GROUP BY item_id
HAVING count(*) > 1;

-- If STEP 1 returns rows, reconcile those items first (merge or delete the
-- extra expenses) before running STEP 2.

-- STEP 2 — Create the partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS expenses_item_id_unique
  ON public.expenses (item_id)
  WHERE item_id IS NOT NULL;

-- Rollback (if ever needed):
--   DROP INDEX IF EXISTS public.expenses_item_id_unique;
