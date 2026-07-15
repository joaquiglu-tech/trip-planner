-- ============================================================================
-- Pending DB changes from the 2026-07-15 review — M01 + C5.
-- Paste this whole block into the Supabase SQL editor and run once.
-- Safe & idempotent: wrapped in a transaction, re-runnable, and it ABORTS
-- (changing nothing) if M01's pre-check finds pre-existing duplicate expenses.
-- ============================================================================
begin;

-- ── M01: max 1 expense per item ────────────────────────────────────────────
-- Pre-check guard: abort the whole transaction if any item already has >1
-- expense (the unique index would otherwise fail). Reconcile those first.
do $$
declare dupes int;
begin
  select count(*) into dupes from (
    select item_id from public.expenses
    where item_id is not null
    group by item_id having count(*) > 1
  ) d;
  if dupes > 0 then
    raise exception
      'M01 aborted: % item(s) have duplicate expenses. Reconcile them, then re-run.', dupes;
  end if;
end $$;

create unique index if not exists expenses_item_id_unique
  on public.expenses (item_id)
  where item_id is not null;

-- ── C5: private reservations bucket + RLS ───────────────────────────────────
update storage.buckets set public = false where id = 'reservations';

drop policy if exists "reservations read (authenticated)"   on storage.objects;
drop policy if exists "reservations insert (authenticated)" on storage.objects;
drop policy if exists "reservations update (authenticated)" on storage.objects;
drop policy if exists "reservations delete (authenticated)" on storage.objects;

create policy "reservations read (authenticated)"   on storage.objects
  for select to authenticated using (bucket_id = 'reservations');
create policy "reservations insert (authenticated)" on storage.objects
  for insert to authenticated with check (bucket_id = 'reservations');
create policy "reservations update (authenticated)" on storage.objects
  for update to authenticated using (bucket_id = 'reservations');
create policy "reservations delete (authenticated)" on storage.objects
  for delete to authenticated using (bucket_id = 'reservations');

commit;

-- After running: the app already uses signed URLs (Slice 3), so receipts keep
-- working; the expenses table now rejects a 2nd expense per item at the DB.
