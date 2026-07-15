# Smoketest — Slices 1–4 (phone / Vercel preview)

Unit tests cover the extracted logic; these check the _wired_ behavior that only
shows in the running app. Use the `dev` preview deploy.

## Slice 1 — data integrity

- [ ] **Delete an item** that has a linked expense → item disappears and stays
      gone (no flicker-back); its expense no longer shows in Budget "Confirmed". (C1)
- [ ] **Add an item** → exactly one card appears (no duplicate). (C3)
- [ ] Home "Confirmed" total == Budget tab "Confirmed" total for the same trip;
      amounts show ≤2 decimals. (C4, M12)

## Slice 2 — invariants

- [ ] Open a **Xotelo-linked stay** → "Estimated cost" field is read-only
      ("Managed by live prices"); editing other fields + Save doesn't change the price. (C2)
- [ ] Try to **add a 2nd expense** to an item that already has one → blocked with
      a clear message (not silently doubled). (M01 client guard)
- [ ] Leave the app open across a price refresh → **no "Joaquin updated…" toast**
      for the automated price change. (M41)

## Slice 3 — security

- [ ] Open an item's **receipt** → it loads (signed URL). (C5 code)
- [ ] **Log out** → reopen/refresh → previous trip data is NOT shown from cache
      before re-auth. (M43)
- [ ] _(After running APPLY-pending-supabase.sql)_ paste an old public-style
      storage URL in incognito → 400/403, not the file. (C5 infra)

## Slice 4 — realtime / optimistic

- [ ] Select stay B in a stop where stay A was selected → A deselects, B selected;
      if offline/flaky, you never end up with **zero** stays selected. (M04)
- [ ] Edit a stop's dates with no connection → the change reverts (doesn't stick
      as "saved"). (M08)
- [ ] Delete a stop offline → it reappears (not silently gone). (M07)
- [ ] A place exactly on the equator/prime meridian still maps. (M05 — edge case)
