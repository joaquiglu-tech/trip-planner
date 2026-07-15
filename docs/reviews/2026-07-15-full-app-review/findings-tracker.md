# Anisita — Full-App Code Review: Findings Tracker

**Date:** 2026-07-15
**Scope:** Whole app (React 19 + Vite PWA on Supabase) — services, hooks, shared components/modals, features (itinerary/plan/expenses/auth), config.
**Method:** `bmad-code-review` driven across the codebase. Fan-out = **4 areas × 2 review layers = 8 subagents** (Blind Hunter = `bmad-review-adversarial-general`; Edge Case Hunter = `bmad-review-edge-case-hunter`) + **2 `/code-review` second-opinion passes** on the riskiest money/data + DetailModal/auth files. Acceptance Auditor skipped (no spec → no-spec mode). ~4,400 LOC covered.
**Totals:** 97 findings — 5 Critical · 53 Medium · 39 Low (deduplicated across 10 review layers).

---

## Legend

- **Severity:** 🔴 Critical (fix before next deploy) · 🟠 Medium (high-value) · 🟡 Low (nit / parking-lot)
- **Status:** `[ ]` open · `[~]` in progress · `[x]` done · `[-]` won't fix / deferred (add reason)
- **Flags:** `VERIFIED` = confirmed against source during the review · `×N` = independently flagged by N review layers (convergence) · `DECISION` = a resolved design choice applies (see below)

## Decided design choices (locked with Joaquin, 2026-07-15)

1. **Currency = USD everywhere.** No conversion model. Treat all amounts as dollars; enforce single currency and round money to 2 decimals. (Resolves the mixed-currency findings.)
2. **`estimated_cost` read-only for Xotelo-linked stays.** Only `useLivePrices` writes it; the Edit-mode cost input must be read-only for stays with a `xotelo_key`.
3. **Receipts → private bucket + signed URLs.** The `reservations` bucket must not be public.

## Convergent themes (appear across multiple files — fix as patterns, not one-offs)

- **`.catch()` chained on Supabase query builders** — builder is a thenable with no `.catch` (verified: postgrest-js 2.104.1). → C1.
- **`lat/lng === 0` dropped by truthiness** (`|| null`, `if (lat && lng)`) — services + hooks + DetailModal. → M05.
- **Realtime `DELETE` relies on `payload.old.id`** — needs `REPLICA IDENTITY FULL`. → M02.
- **Optimistic writes without rollback / dedup** — addItem, updateStop, deleteStop, setStatus. → C3, M07, M08.
- **`setState` after unmount** — many hooks lack cancel/cleanup guards. → L-cluster.
- **Duplicated domain rules** (cost/date/expense math) — violates single-source-of-truth. → C4, M13, M-dupes.

---

## 🔴 CRITICAL

- [x] **C1 · `deleteItem` throws on every delete → orphaned expenses + zombie item** — `src/shared/hooks/useItems.js:204-205` · `VERIFIED` · ✅ Slice 1: extracted `cleanupItemChildren(client, id)` (awaits + swallows, no `.catch` on builder); tested incl. root-cause repro.
  - _Failure:_ `.catch()` is chained on the raw Supabase query builder (`supabase.from('expenses').delete().eq(...).catch(...)`). postgrest-js 2.104.1's builder has `.then` but **no `.catch`/`.finally`** (verified: `typeof proto.catch === 'undefined'`), so it throws `TypeError` synchronously. The item DELETE (line 197) already committed; the throw hits the outer catch (212) which re-adds the deleted item to the UI. Expense/place_cache/storage cleanup never runs → orphaned expense rows permanently inflate BudgetPage "Confirmed"/`confTotal`; item flickers back until reload. Line 205 (`place_cache`) has the same bug.
  - _Fix:_ `try { await supabase.from('expenses').delete().eq('item_id', id) } catch(e){ console.warn(...) }` per cleanup call; drop `.catch` chaining.

- [x] **C2 · Forms write the read-only `estimated_cost`, racing the Xotelo writeback** — `src/shared/components/DetailModal.jsx:302,461,282`; create-seed `src/shared/hooks/useItems.js:159` · `VERIFIED` `×4` · `DECISION 2` · ✅ Slice 2: `isXoteloManaged(item)` helper; DetailModal cost input is read-only ("Managed by live prices") for Xotelo stays and `handleSave` skips `estimated_cost` for them. Tested.
  - _Failure:_ Edit-mode "Estimated cost ($)" input feeds `changes.estimated_cost` (302); `handleTripAdvisorUrl` also sets it (282). `rules/data.md` says `estimated_cost` is read-only and only `useLivePrices` writes it. For a Xotelo-linked stay, a manual edit and the next price refresh clobber each other — last write wins, non-deterministic.
  - _Fix:_ Make the cost input read-only for stays with `xotelo_key`; do not include `estimated_cost` in `changes` for those. (Non-stay items may keep a user-owned cost field — confirm during implementation.)

- [x] **C3 · `addItem` has no realtime-dedup guard → duplicate item rows** — `src/shared/hooks/useItems.js:179` · `VERIFIED` · ✅ Slice 1: extracted `appendOrReplaceById(list, item)`; used in `addItem` + realtime handler (also dedups the reverse race). Tested.
  - _Failure:_ Optimistic `setItems(prev => [...prev, merged])` has no `prev.some(id)` check, while the realtime INSERT echo (89-95) also appends when the id isn't found. If the realtime event lands first, the row is added twice and persists (findIndex only updates the first copy) → duplicated card + double-counted cost. `addExpense` (useExpenses.js:43) guards correctly; `addItem` doesn't.
  - _Fix:_ Guard `if (prev.some(it => it.id === data.id)) return prev;` before appending.

- [x] **C4 · Budget math duplicated AND already drifted** — `src/features/itinerary/OverviewView.jsx:13-26` vs `src/features/expenses/BudgetSummary.jsx:10-47` · `VERIFIED` `×3` · ✅ Slice 1: extracted `computeBudgetTotals(items, expenses)`; both consumers call it. Canonical rule = confirmed sums positive expenses only (refunds/zero excluded), consistently. `budgetSummary.test.js` now imports the real fn.
  - _Failure:_ OverviewView `confTotal` sums **all** expenses (`:24`); BudgetSummary skips `amt <= 0` (`:38`). A refund/negative or zero expense makes the Home "Confirmed" and Budget-tab "Confirmed" disagree for the same trip. Comment at OverviewView.jsx:12 admits it's a copy. Violates single-source-of-truth.
  - _Fix:_ Extract one aggregator (e.g. `computeBudgetTotals(items, expenses)`) into `utils`; call from both. Fold in USD rounding (DECISION 1) and the `sumItemExpenses` helper (see M14).

- [~] **C5 · Receipts/reservations stored in a PUBLIC bucket with guessable paths (PII)** — `src/services/storage.js:10-11,23` (reached via `useItemFiles`, DetailModal upload) · `×2` · `DECISION 3` · ✅ Slice 3 (code): `storage.js` now issues signed URLs (`createSignedUrl`/`createSignedUrls`, 24h TTL) instead of `getPublicUrl`. ⏳ PENDING: flip bucket to private + add RLS in Supabase — steps in `C5-private-reservations-bucket.md`.
  - _Failure:_ `getPublicUrl` on the `reservations` bucket + path `${itemId}/${Date.now()}` → reservation docs/receipts are world-readable to anyone with/guessing the URL (stable item id + enumerable timestamp), no auth. RLS on Storage doesn't gate public URLs.
  - _Fix:_ Private bucket + `createSignedUrl` for reads; generated migration/RLS as needed (do not hand-edit migrations). Own slice.

---

## 🟠 MEDIUM

### Data integrity

- [~] **M01 · Max-1-expense-per-item unenforced → double-tap doubles paid total** — `src/shared/hooks/useExpenses.js:39-47`; selectable list `src/shared/modals/AddExpenseModal.jsx:28-49`; sums all in `TripContext.jsx:32` · `×4` · ✅ Slice 2 (code): `itemHasExpense` guard in `addExpense` (single choke point — covers all creation paths); tested. ⏳ PENDING: DB partial unique index — SQL in `M01-expenses-unique-index.sql`, apply via Supabase (has a pre-check for existing dupes).
  - _Fix:_ DB unique constraint on `expenses.item_id` (generated migration) + guard in `addExpense`/`AddExpenseModal` (exclude items that already have an expense; upsert or surface conflict).
- [x] **M02 · Realtime DELETE relies on `payload.old.id` (needs REPLICA IDENTITY FULL)** — `useItems.js:85`, `useExpenses.js:25`, `useStops.js:71` · `×2` · ✅ Slice 4: `if (!payload.old?.id) return` guard in useItems + useStops DELETE handlers (useExpenses already dedups by id). Default replica identity includes the PK, so this is belt-and-suspenders.
  - _Failure:_ Without full replica identity, `payload.old.id` is undefined → deleted rows never removed locally (lingering item double-counts in expenseMap). _Fix:_ verify/set replica identity; guard `if (!payload.old?.id) return`.
- [ ] **M03 · `estimated_cost` written as `NaN` from bad/missing dates** — `src/services/hotelPrices.js:15-17` (also `:14` rate missing `.rate`; checkOut≤checkIn → negative/zero nights), `src/shared/hooks/useLivePrices.js:74` (null dates → `"null"` string to Xotelo) · `×3`
  - _Fix:_ validate both dates parse + finite and `nights > 0` before computing; filter rates to finite `rate`; return null otherwise.
- [x] **M04 · `setStatus` partial failure → stop left with no selected stay, no rollback** — `src/shared/hooks/useItems.js:126-148` (deselect at 132 commits, target update at 148 throws) · `×2` · ✅ Slice 4: reordered — target update runs FIRST (self-rolling-back), then best-effort deselect of `conflictingStays()` with its own rollback. A failed change never leaves 0 stays selected.
  - _Fix:_ only deselect others after the target update succeeds, or roll back deselects in a catch.
- [x] **M05 · `lat/lng === 0` silently dropped by truthiness** — `services/googlePlaces.js:53-54`, `services/enrichItem.js:16`, `useItems.js:20-22`, `useStops.js:43-44`, `DetailModal.jsx:316-317` · `×4` · ✅ Slice 4: new `toCoord()` helper used in `mergeItem`; `?? null`/`!= null` in DetailModal origin/dest, googlePlaces, enrichItem; `== null` in useStops enrich checks. Tested.
  - _Failure:_ equator/prime-meridian coords coerced to null → missing/mislocated map marker; useStops re-enriches valid lat-0 stops. _Fix:_ use `?? null` / `!= null` / `Number.isFinite`.
- [ ] **M06 · `conf` item with no expense vanishes from Budget tab but still counts in `selTotal`** — `src/features/expenses/BudgetPage.jsx:30` (`planned = items.filter(status==='sel')` only)
  - _Fix:_ include conf-without-expense items in the breakdown.
- [x] **M07 · `deleteStop` failure permanently drops the row** — `src/shared/hooks/useStops.js:127-134` · `×2` · ✅ Slice 4: capture prev, re-add (sorted) on error and rethrow — no more false "realtime re-adds" comment.
  - _Failure:_ optimistic remove; on DB error only `console.warn` — the comment "Realtime will re-add" is false (nothing changed server-side, no event fires). _Fix:_ re-add stop on error.
- [x] **M08 · `updateStop` no rollback on DB error** — `src/shared/hooks/useStops.js:86-95` · ✅ Slice 4: capture prev, restore (sorted) on error before rethrow.
  - _Failure:_ optimistic state (incl. dates that drive itinerary grouping + live-price window) stays applied on failure; only warns. _Fix:_ capture prev, restore on catch (like useItems.updateItem).
- [x] **M09 · `deleteItem` rollback loses sort position** — `src/shared/hooks/useItems.js:200,214` · ✅ Slice 4: rollback uses `insertBySortOrder()` (re-inserts at sort_order, dedup by id). Tested.
  - _Failure:_ re-adds via `[...p, prev]` (appended to end, ignoring `sort_order`). _Fix:_ re-insert by sort_order or trigger reload.
- [x] **M10 · `StopSection` delete: `updateItem` throws mid-unlink → half-unlinked items, stop not deleted** — `src/features/itinerary/StopSection.jsx:100-113` · ✅ Slice 4: whole unlink→delete sequence wrapped in try/catch with a user-facing alert on failure. (Fully atomic unlink would need a DB function — noted, out of scope.)
  - _Fix:_ try/catch; unlink then delete atomically.

### Money / currency (DECISION 1 = USD)

- [ ] **M11 · Mixed currencies summed as raw numbers** — `BudgetSummary`, `OverviewView`, `useItems.js:5` (`$f`) · `×2`
  - _Fix (per DECISION 1):_ enforce USD-only; no conversion. Remove any implicit multi-currency assumption.
- [x] **M12 · Money not rounded to 2 decimals** — `src/shared/hooks/useItems.js:5` (`$f = '$'+(n||0).toLocaleString()`) · ✅ Slice 1: `$f` now `Number(n)`-coerced + `{ maximumFractionDigits: 2 }`. Tested.
  - _Failure:_ float sums render `$1,234.567`. _Fix:_ `toLocaleString(undefined,{maximumFractionDigits:2})` or round at aggregation. Also handles negative `$-5` (see L-fmt).
- [x] **M13 · Budget aggregation NaN-poisoning from non-numeric amount** — `BudgetSummary.jsx:24,42`, `OverviewView.jsx:24` · ✅ Slice 1: `computeBudgetTotals`/`sumItemExpenses` use `Number(x) || 0`. Tested.
  - _Failure:_ `Number(e.amount||0)` on a non-numeric string → NaN poisons totals → whole budget shows `$NaN`. _Fix:_ `Number(e.amount)||0`.
- [x] **M14 · "Sum expenses for an item" reimplemented in 3 places** — `BudgetSummary.jsx:24`, `BudgetPage.jsx:131`, DetailModal · ✅ Slice 1: extracted `sumItemExpenses(expenses, itemId)`; adopted by `computeBudgetTotals` + `BudgetPage`. DetailModal call site migrates in Slice 5.
  - _Fix:_ extract `sumItemExpenses(expenses, itemId)` into the shared cost module (couples with C4).
- [ ] **M15 · `detectConflicts` false-positives on bare time strings across different days** — `src/features/itinerary/utils.js:120`
  - _Failure:_ raw string compare of `start_time`/`end_time`; `mergeItem` mixes full datetime-local and bare `HH:MM`, so different-day items on a multi-day stop flag as conflicting. _Fix:_ normalize to comparable datetimes (attach date) before comparing.

### DetailModal / expense flow

- [ ] **M16 · DetailModal shows the WRONG item's photo when reused for a linked item** — `src/shared/components/DetailModal.jsx:56,71-76`
  - _Failure:_ `place` seeded once via `useState(placeData)`; fetch guard `if (place?.photo_url) return` never refetches when `it.id` changes while the sheet stays mounted (opening an item from the Expenses tab) → item B renders item A's image/address/hours. _Fix:_ `setPlace(null)` at top of the `[it?.id]` effect, or key the modal by `it.id`.
- [ ] **M17 · Edits silently lost tapping the pricing/expense row in Edit mode** — `src/shared/components/DetailModal.jsx:107,462,532`
  - _Failure:_ `onExpenseClick` runs `setEditing(false); setShowExpenseCard(true)` → unmounts EditMode, discards unsaved `draft`, no warning. _Fix:_ save (or confirm-discard) before leaving edit mode.
- [ ] **M18 · Partial expense-deletion leaves data inconsistent on status downgrade** — `src/shared/components/DetailModal.jsx:140-146` (dup 357-363) · `×3`
  - _Failure:_ deletes expenses one-by-one; on mid-loop failure sets `failed` and returns without `setStatus` → some expenses gone while item still "Confirmed". _Fix:_ delete atomically / re-check + roll back on partial failure.
- [ ] **M19 · Status downgrade gates expense deletion on `expenseAmount`, not `itemExpenses.length`** — `src/shared/components/DetailModal.jsx:137`
  - _Failure:_ status conf→sel/'' with a zero/undefined-amount expense → status changes, expenses orphaned, payment state contradicts status. _Fix:_ gate on `itemExpenses?.length`.
- [ ] **M20 · `setStatus(conf)` not awaited before ExpenseCard opens** — `src/shared/components/DetailModal.jsx:136`
  - _Fix:_ await + catch before opening the card (else card opens against an unconfirmed item on write failure).
- [ ] **M21 · Realtime update to the item during Edit → concurrent edit silently lost** — `src/shared/components/DetailModal.jsx:254-267`
  - _Fix:_ reconcile draft against the new baseline or warn on external change.
- [ ] **M22 · Clearing `estimated_cost`/`hrs` to empty can never unset the value** — `src/shared/components/DetailModal.jsx:301-302,311-312` · `×2`
  - _Failure:_ `parseFloat('')` → NaN → guard skips the diff; the field can't be set back to empty/null (and a genuine `0` is skipped by `ec !== (Number(it.estimated_cost)||0)`). _Fix:_ treat empty string as explicit `null` change. (Largely moot for stays once C2 makes it read-only.)
- [ ] **M23 · Negative cost/hrs accepted and persisted** — `DetailModal.jsx:301-302,311-312`, `AddItemModal.jsx:124`
  - _Fix:_ clamp `>= 0` before writing.
- [ ] **M24 · Whitespace/empty name persisted on save** — `src/shared/components/DetailModal.jsx:293,376`
  - _Fix:_ block save if `!draft.name.trim()`.

### Xotelo / search UX

- [ ] **M25 · Xotelo lookup fires per keystroke (no debounce/await/catch)** — `DetailModal.jsx:271-285,417`, `AddItemModal.jsx:74-79,102-113` · `×2`
  - _Failure:_ overlapping `fetchStayEstimate` calls race (last-resolved wins, can apply stale estimate); unhandled rejections; `AddItemModal:74-79` runs the fetch inside a `setForm` updater → StrictMode double-fetch. _Fix:_ debounce + seq/request token + try/catch; move fetch out of the updater.
- [ ] **M26 · PlaceSearch stale-result race + stale results on error** — `PlaceSearch.jsx:24-49` (older fetch resolves after newer), `:36-48` (non-ok/throw leaves previous results); same in `AddStopModal.jsx:47-57`
  - _Fix:_ AbortController/seq token; `setResults([])` in else/catch.
- [ ] **M27 · Selected place missing `location` → undefined coords saved** — `PlaceSearch.jsx:68-80`, `AddStopModal.jsx:63-67`
  - _Fix:_ reject/flag results without lat/lng before select (breaks map routing otherwise).
- [ ] **M28 · `PlaceSearch` crashes on a stop with null `name`** — `src/shared/components/PlaceSearch.jsx:54-55`
  - _Failure:_ `.toLowerCase()` on undefined throws, crashes the modal. _Fix:_ `(s.name||'').toLowerCase()`.

### Crash / robustness (props & inputs)

- [ ] **M29 · Undefined `items`/`stops` props → crash on first render** — `TopBar.jsx:2`, `AddExpenseModal.jsx:30`, `AddItemModal.jsx:195`
  - _Fix:_ default `= []` on the props.
- [ ] **M30 · `SelectPage` name sort crashes on nameless item** — `src/features/plan/SelectPage.jsx:57`
  - _Fix:_ `(a.name||'').localeCompare(b.name||'')`.
- [ ] **M31 · `ExpenseCard` empty/NaN amount → silent no-op; `isNew && item==null` → expense silently not created** — `src/shared/components/ExpenseCard.jsx:17-19,23-29`
  - _Fix:_ show error instead of silent `return`; guard/disable when no item.
- [ ] **M32 · Conf with blank/negative `confirmed_cost` marked confirmed silently** — `AddItemModal.jsx:136`, `ExpenseCard.jsx:23`
  - _Fix:_ surface a message or block confirm.
- [ ] **M33 · Oversize attachment only fails after save** — `AddItemModal.jsx:244` (DetailModal checks `f.size > 5MB` at add time)
  - _Fix:_ mirror the 5MB check at add time.

### Timezone / dates

- [ ] **M34 · UTC "today" vs local calendar → wrong day near midnight** — `TodayPage.jsx:20` (`toISOString()`), `utils.js:63-74` (`getTodayDayIndex`/`getDaysUntilTrip` parse bare `YYYY-MM-DD` as UTC vs local `now`), `utils.js:140-141` · `×3`
  - _Fix:_ one consistent local-date formatter; compare via `toDateStr` strings.
- [ ] **M35 · `StopSection` dates can't be cleared; inverted range accepted** — `src/features/itinerary/StopSection.jsx:21-29`
  - _Fix:_ allow explicit clear; validate `end >= start`.
- [ ] **M36 · Multi `stop_ids`: only `[0]` used** — `ExpenseCard.jsx:15`, `AddExpenseModal.jsx:46,81`, `DetailModal.jsx:239`
  - _Failure:_ expense hard-bound to first stop; other stops ignored. _Fix:_ decide/display across all stops.
- [ ] **M37 · `ScheduleList`: item dated outside stop range dumped onto day one** — `src/features/itinerary/ScheduleList.jsx:28-34`
  - _Fix:_ keep out-of-range items in an explicit "unscheduled" group.

### Architecture / project rules

- [ ] **M38 · Direct `fetch()` to Google Places inside presentational components (duplicated)** — `PlaceSearch.jsx:27`, `AddStopModal.jsx:35`
  - _Fix:_ move into `services/googlePlaces`; components call the service/hook.
- [ ] **M39 · Inline `supabase.auth.*` in page components (bypasses `useAuth`)** — `Login.jsx:16-17`, `ProfilePage.jsx:21,30` · `×2`
  - _Fix:_ route auth through the hook / a service.
- [ ] **M40 · Hardcoded `'Lima'` home-city rule** — `MapComponents.jsx:145,174,226` (vs dynamic `stops[0]` in `OverviewView.jsx:49,65`) · `×2`
  - _Failure:_ breaks "no hardcoded data"; map includes origin + filter is dead for any non-Lima trip. _Fix:_ derive home from `stops[0]`/a flag, single source.
- [x] **M41 · Live-price writeback stamps `updated_by`/`updated_at` → spurious "X updated" toast + false audit** — `useLivePrices.js:50` → `useItems.js:96,113-114` · `×2` · ✅ Slice 2: `updateItem(id, changes, { stampUser:false })` for automated writes (no updated_by/at bump); `useLivePrices` uses it; realtime toast gated by `shouldNotifyUpdate` (suppresses updates that don't bump updated_at). Tested.
  - _Fix:_ write `estimated_cost` without touching `updated_by`, or tag automated writes so the toast is suppressed.
- [ ] **M42 · Directions callbacks race effect cleanup → leaked/duplicate routes** — `MapComponents.jsx:96-108,210-222` · `×2`
  - _Fix:_ per-effect cancelled flag checked before push/render.
- [x] **M43 · Service worker caches private Supabase REST data 1h, not purged on logout** — `vite.config.js:47-50` · ✅ Slice 3: `purgeDataCache()` (`src/services/swCache.js`) deletes the `supabase-api` cache; `useAuth` calls it on `SIGNED_OUT`. Tested.
  - _Failure:_ previously-fetched trip/expense data served from cache after sign-out/offline. _Fix:_ scope/purge data cache on sign-out (auth endpoints already NetworkOnly).
- [ ] **M44 · `AddItemModal` spreads UI-only fields into the item insert** — `AddItemModal.jsx:121-131`
  - _Failure:_ forwards non-column keys (`tripadvisor_url`, `confirmed_cost`, `expense_note`, raw `origin`/`dest`); relies on unstated column-stripping downstream. _Fix:_ whitelist columns before insert. (Also orphaned-storage-on-delete: see M-storage below.)

### Services / external API robustness

- [ ] **M45 · `googlePlaces` cache-read outside try + `.single()` on multi-row** — `src/services/googlePlaces.js:6`
  - _Failure:_ `.single()` network error escapes (unhandled rejection); multiple place*cache rows → `.single()` errors → cache always misses → Places re-fetch + quota burn. \_Fix:* move select into try; use `.maybeSingle()`/`.limit(1)`.
- [ ] **M46 · `/api/xotelo` has no timeout + no dev proxy; failures swallowed** — `src/services/hotelPrices.js:7-8`
  - _Failure:_ no AbortController → hang; no `server.proxy` in vite.config → 404 under `npm run dev`, silently returns null. _Fix:_ AbortController+timeout; wire dev proxy or document; log diagnostics. Also URL-encode query params (`:7`).
- [ ] **M47 · Places 429/quota not distinguished from other failures** — `src/services/googlePlaces.js:27`
  - _Fix:_ branch on 429 for backoff/skip vs permanent fail.
- [ ] **M48 · Xotelo key extraction misses `d\d+`-only URLs** — `src/services/xotelo.js:6`
  - _Failure:_ URL without `g\d+` → null key → no live prices. _Fix:_ also match valid standalone key form.
- [ ] **M49 · Maps API key baked into persisted photo URLs; no presence guard** — `googlePlaces.js:38,48` (stored in `place_cache.photo_urls`), `main.jsx:12`, `supabase.js:11`
  - _Failure:_ key rotation breaks all cached photo URLs (30-day CacheFirst); missing `VITE_GOOGLE_MAPS_API_KEY` → `APIProvider(undefined)`, silent map failure. _Fix:_ store media ref without key / re-sign on read; guard/warn on missing key like the Supabase check.
- [ ] **M50 · `storage` edge gaps** — `src/services/storage.js`
  - _Failure:_ `>100` files no pagination (`:19`); no-extension filename → whole name as ext / malformed path (`:6`); null `file` → raw TypeError (`:5`). _Fix:_ paginate list; guard extension parsing; early-guard null file.
- [ ] **M51 · App-shell null guards** — `src/main.jsx:10` (`getElementById('root')` null → `createRoot` throws), `src/App.jsx:28` (empty `user.email` → trip scoped to `''`)
  - _Fix:_ assert root exists; handle/flag missing email before scoping trip data.
- [ ] **M52 · `useLivePrices` input/type gaps** — `useLivePrices.js:17` (`stops` undefined → `.length` throws), `:48` (`price.total` string → `!== Number(estimated_cost)` always true → redundant writes/type drift)
  - _Fix:_ `(stops||[]).length`; `Number(price.total)` before compare/write.
- [ ] **M53 · Orphaned storage files on item delete / status downgrade** — `DetailModal.jsx:143-146,232`, `useItemFiles`
  - _Failure:_ files never removed; since files load only for conf items they become unreachable but still stored. _Fix:_ delete the item's storage folder on item delete; decide policy on downgrade. (Interacts with C1 cleanup.)

---

## 🟡 LOW (parking-lot)

### setState-after-unmount / lifecycle

- [ ] **L01 · `useToast` timer never cleared on unmount** — `useToast.js:9-10` (no `clearTimeout`) · `×2`
- [ ] **L02 · `useAuth` `getSession` setState after unmount** — `useAuth.jsx:10`
- [ ] **L03 · `useItemFiles` no cancel guard + stale entries never pruned** — `useItemFiles.js:13-19` (also double-filters per render, no eviction) · `×2`
- [ ] **L04 · `useConfirm` rapid re-invoke drops pending promise; unmount hangs caller** — `useConfirm.js:6-10` · `×2`
- [ ] **L05 · `PlaceSearch` blur-timeout setState after unmount** — `PlaceSearch.jsx:96`
- [ ] **L06 · `DetailModal.getPlaceData` setState after unmount** — `DetailModal.jsx:71-76`
- [ ] **L07 · `DetailModal.savedTimerRef` not cleared on unmount** — `DetailModal.jsx:61-62`

### Focus / a11y / navigation

- [ ] **L08 · Nested focus traps fight; `ConfirmModal` has no trap** — `DetailModal.jsx:116,238,245`, `ConfirmModal.jsx`
- [ ] **L09 · `useFocusTrap` refocuses a removed trigger** — `useFocusTrap.js:34` (check `isConnected`)
- [ ] **L10 · `DetailModal` has no Escape-to-close** — `DetailModal.jsx:64-69` (other modals do)
- [ ] **L11 · Close via ✕/backdrop leaves dangling history entry** — `DetailModal.jsx:64-69,117` (no `history.back()` on programmatic close)
- [ ] **L12 · Nested modal double history push / stacked Escape** — `AddExpenseModal.jsx:15-25` + `AddItemModal.jsx:50-60`
- [ ] **L13 · Backdrop/Escape discards a dirty form with no warning** — all Add modals + ExpenseCard (dirty-check before close)
- [ ] **L14 · Empty search dropdown indistinguishable from loading** — `PlaceSearch.jsx:104`, `AddStopModal.jsx:30,108`

### Dates / sort / numbering (nits)

- [ ] **L15 · `AddStopModal` date-order check runs before presence check** — `AddStopModal.jsx:70-71`
- [ ] **L16 · Equal start/end dates → zero-night stop saved** — `AddStopModal.jsx:70`
- [ ] **L17 · Single-day stop never registers as "today"** — `utils.js:63-69` (exclusive end)
- [ ] **L18 · `ScheduleList` `perDay` divides by `nights`, not `nights+1` → empty trailing day** — `ScheduleList.jsx:44-48` · `×2`
- [ ] **L19 · Map waypoints `slice(0,8)` silently drops middle stops** — `MapComponents.jsx:78`
- [ ] **L20 · `allStopItems` useMemo omits `combinedStopIds` (+ statusFilter) from deps** — `StopSection.jsx:63-73` · `×2`
- [ ] **L21 · NaN-sort tiebreaks** — `OverviewView.jsx:28-31` (missing `updated_at`), `BudgetPage.jsx:23,27` (missing `created_at`), `PlanSection.jsx:11`/`SelectPage.jsx:59` (equal `start_time`, no secondary sort → nondeterministic order)
- [ ] **L22 · `utils` calendar assumes stops chronologically sorted** — `utils.js:129-148` (compute min-start/max-end instead)
- [ ] **L23 · Zero-item stop shows green "ready" checkmark** — `utils.js:87-90`
- [ ] **L24 · Multiple sel/conf stays in one stop → arbitrary first shown/mapped** — `utils.js:59-61` (define tie-break)

### Formatting (nits)

- [ ] **L25 · `formatStopDate` renders "undefined undefined" when `end_date` missing** — `utils.js:14-17`
- [ ] **L26 · Date range spanning year boundary shows no year ("Dec 30 – Jan 2")** — `utils.js:8-19`
- [ ] **L27 · Time without minutes renders "2:undefined PM"** — `utils.js:30-40`
- [ ] **L28 · Invalid timestamp renders "NaNd ago"** — `utils.js:44-53`
- [ ] **L29 · Negative amount renders "$-5"** — `utils.js:1-5`/`useItems.js:5` (couples with M12)
- [ ] **L30 · `Toast` object message missing `.message` renders empty** — `Toast.jsx:3`
- [ ] **L31 · `TopBar` undefined `city`/`name` → skewed ratio + "undefined to undefined"** — `TopBar.jsx:3-6,10`
- [ ] **L32 · PhotoCarousel: all photos 404 → blank carousel with active dots/arrows** — `DetailModal.jsx:574`

### Duplication / dead code / efficiency

- [ ] **L33 · StatusSelector logic duplicated Summary vs Edit** — `DetailModal.jsx:131-152` vs `349-369` (extract `<StatusSelector>`; couples with M18 fix)
- [ ] **L34 · File-chip list + upload row duplicated between modes** — `DetailModal.jsx:219-226` vs `479-495` (extract `<Attachments>`)
- [ ] **L35 · Dead `|| ''` fallbacks after throw guard** — `supabase.js:6-10`
- [ ] **L36 · Redundant 10-minute session poll duplicates `onAuthStateChange`** — `useAuth.jsx:24-31`
- [ ] **L37 · `BudgetSummary` O(items×expenses) nested scans** — `BudgetSummary.jsx:24,39` (build Maps once; BudgetPage already has `itemsMap`)

### Auth feedback (borderline MED)

- [ ] **L38 · Login sign-up gives no confirmation/next-step feedback** — `Login.jsx:11-20` (show "check your email")
- [ ] **L39 · ProfilePage swallows save errors** — `ProfilePage.jsx:19-27` · `×2` (surface `error.message`)

---

## ✅ Verified healthy (no action)

- **Item-numbering single-source invariant intact** — `StopSection` `itemNumberMap` feeds both map markers (`DayMap`) and schedule cards; not forked.
- `useSettings`, `useOnlineStatus`, `usePlaceData` core logic clean (usePlaceData has a minor dup-fetch nit noted under services if pursued).

---

## Proposed implementation slices (foundation/security-first)

Each slice = small vertical change, TDD (RED→GREEN→REFACTOR), tests + lint green, re-run `/code-review` on the diff, commit, check off items here.

1. **Slice 1 — data-integrity core:** C1, C3, C4 (+ M12 rounding, M13, M14). _Code-only, unambiguous._
2. **Slice 2 — invariant enforcement:** C2 (estimated_cost read-only for stays), M01 + migration (max-1 expense), M41.
3. **Slice 3 — security:** C5 (private bucket + signed URLs, generated migration), M43 (cache purge on logout).
4. **Slice 4 — realtime/optimistic robustness:** M02, M04, M05, M07, M08, M09, M10.
5. **Slice 5 — DetailModal correctness:** M16–M24, L33, L34.
6. **Slice 6 — dates/timezone + budget completeness:** M15, M34, M35, M37, M06.
7. **Slice 7 — search/Xotelo UX:** M25, M26, M27, M28, M03, M52.
8. **Slice 8 — architecture rules:** M38, M39, M40, M44.
9. **Slice 9 — services robustness:** M45–M51, M53.
10. **Slice 10 — nits parking-lot:** L01–L39 (batch by theme).
