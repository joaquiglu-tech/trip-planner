# Anisita — Comprehensive App Code Review (2026-07-15)

**Scope:** Whole-app review of the Anisita trip-planner PWA (React 19 + Vite, Supabase, Google Places, Xotelo), with emphasis on **correctness, security, and expense/currency/data logic**, plus resolution of the open items in `PENDING_ITEMS.md`.

**Method (Superpowers `requesting-code-review`):** three focused reviewer subagents — (1) expense/currency/data-integrity, (2) security, (3) React correctness & hooks — run in parallel over the current checkout, then synthesized here. The highest-impact findings were re-verified directly against the code before inclusion.

**Baseline at review time:**

- Tests: **84 passed / 84** (8 files) ✅
- Lint: **0 errors, 25 warnings** (includes the flagged `react-hooks/refs` at `useItems.js:220`, `exhaustive-deps` at `useLivePrices.js:65`, and the `set-state-in-effect` set in item #11).

Confidence is noted where a finding depends on runtime behavior or on DB constraints/RLS that are not in the repo (`supabase/migrations/**` and policy SQL are not committed).

---

## Severity summary

| #   | Severity   | Area         | Finding                                                                                                                      | Location                                                                                                       |
| --- | ---------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| C1  | Critical   | Security     | Live Google API key committed in tracked docs                                                                                | `docs/superpowers/plans/2026-05-14-pending-items.md:777,828`, `…/specs/2026-05-14-pending-items-design.md:115` |
| C2  | Critical   | Security     | Reservation files (receipt/booking PII) world-readable via public bucket                                                     | `src/services/storage.js:10,23`                                                                                |
| C3  | Critical   | Expense      | `AddExpenseModal` creates duplicate expenses & never promotes to `conf` → 1:1 invariant break + budget desync                | `src/shared/modals/AddExpenseModal.jsx:36-53`, `App.jsx:98`                                                    |
| C4  | Critical   | Expense      | Plan-tab "Add item" drops confirmed cost silently (data loss)                                                                | `src/features/plan/SelectPage.jsx:136`, `AddItemModal.jsx:136`                                                 |
| C5  | Critical   | Expense      | Stay auto-deselect orphans its expense → keeps polluting "Confirmed"                                                         | `src/shared/hooks/useItems.js:126-147`                                                                         |
| C6  | Critical\* | React/Maps   | Unmemoized `mapItems` prop re-fires `fitBounds` + uncached Directions calls every render (map jump; likely root-cause of #8) | `src/features/itinerary/StopSection.jsx:145`, `MapComponents.jsx:46-112`                                       |
| I1  | Important  | Security     | Client fully trusts RLS, but no RLS/policy SQL in repo to verify                                                             | `supabase/` (no migrations)                                                                                    |
| I2  | Important  | Security     | Supabase project ref + pooler DSN committed                                                                                  | `supabase/.temp/*` (tracked)                                                                                   |
| I3  | Important  | Security     | External/user URLs rendered as `href` with no scheme allowlist (`javascript:` XSS)                                           | `DetailModal.jsx:204,209,214`                                                                                  |
| I4  | Important  | Security     | Upload validation client-only; `AddItemModal` path has no size check                                                         | `src/services/storage.js:5-12`, `AddItemModal.jsx:157`                                                         |
| I5  | Important  | Expense      | Currency assumed USD; Xotelo `currency` captured then dropped                                                                | `hotelPrices.js:25`, `xotelo.js:22-28`, `useLivePrices.js:42-54`                                               |
| I6  | Important  | Expense/Data | `estimated_cost` written by forms — contradicts read-only rule; overwritten by live prices                                   | `DetailModal.jsx:301-302`, `AddItemModal.jsx:124`                                                              |
| I7  | Important  | Expense      | `nights === 0` (single-day stop) → `estimated_cost` 0                                                                        | `src/services/hotelPrices.js:15-17`                                                                            |
| I8  | Important  | Expense      | Non-numeric `amount` (`NaN`) not skipped → poisons whole total                                                               | `BudgetSummary.jsx:24,37-38`                                                                                   |
| I9  | Important  | React/Data   | Live-price writeback bumps `updated_by` → pollutes "Recent activity"                                                         | `useLivePrices.js:48-53` → `useItems.js:113-114`, `OverviewView.jsx:28-32`                                     |
| I10 | Important  | React        | `allStopItems` memo missing `combinedStopIds` dep → stale in combined-date view                                              | `StopSection.jsx:63-73`                                                                                        |
| I11 | Important  | Testing      | Highest-risk paths untested; `budgetSummary.test.js` tests a copy, not the component                                         | `src/test/*`                                                                                                   |

\*C6 marked Critical because it plausibly root-causes the already-known-broken Directions feature (#8) and makes the map hard to use; confidence medium on the Directions link.

Minor items are listed in their own section below.

---

## Critical

### C1 — Live Google API key committed in tracked docs (billing-theft risk)

**Files:** `docs/superpowers/plans/2026-05-14-pending-items.md:777,828`, `docs/superpowers/specs/2026-05-14-pending-items-design.md:115` (value `AIzaSyD7…`, masked here). Verified present in the working tree and history. _Not_ in `src/` (the app reads `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) and _not_ literally in `PENDING_ITEMS.md` — item #8 only references that a key was committed.

**Why it matters:** A Google Maps _browser_ key is exposed in the client bundle by design, so the real control is **HTTP-referrer + API restrictions**, not secrecy. PENDING #8 says the key's restrictions are uncertain. If unrestricted (plausible, given Directions is being debugged), anyone can lift it and bill Directions/Places/Maps to the project.

**Fix:** Rotate the key in Google Cloud; restrict the new key to the production origin(s) via HTTP-referrer and to only the APIs used; replace the value in the docs with a placeholder. History rewrite is optional for a browser key, but rotation + restriction is mandatory.

### C2 — Reservation files (receipt/booking PII) are world-readable

**Files:** `src/services/storage.js:10,23` — the `reservations` bucket is served via `getPublicUrl(path)`; path is `${itemId}/${Date.now()}.${ext}` (`:7`). URLs are persisted in app state and rendered as `href` (`DetailModal.jsx:221,484`).

**Why it matters:** Uploaded receipts / booking confirmations (guest names, confirmation codes, addresses) are readable by anyone with the URL, no auth. UUID `itemId` makes enumeration hard, but any leaked URL = permanent unauthenticated access.

**Fix:** Make the bucket private; serve via `createSignedUrl(path, ttl)`; back it with a Storage RLS policy scoped to the owner. Do not rely on UUID unguessability as access control.

### C3 — `AddExpenseModal` breaks the 1-expense-per-item invariant and desyncs the budget

**Files:** `src/shared/modals/AddExpenseModal.jsx:36-53` (wired `onAdd={addExpense}` at `App.jsx:98`). Unlike `ExpenseCard.jsx:23-25`, it does **not** check for an existing expense on the item and **never** promotes the item to `conf`. (No in-repo unique constraint on `expenses(item_id)` visible — _confidence medium_ it's truly unenforced.)

**Failure scenario:** Item X is `sel`, est $100. Add expense → $80. X stays `sel` with an $80 expense. `BudgetSummary.jsx:16-33` counts X's **estimate $100** in "Selected", `confCount` (`:22`) does not increment, yet the second loop (`:36-44`) adds $80 to `confTotal`. Header shows "$80 confirmed / 0 booked" and "Selected" is wrong. Repeat → two expenses on one item; `DetailModal` shows only `itemExpenses[0]` (`:238`), so the duplicate is invisible in the item UI but still summed everywhere.

**Fix:** In `handleSave`, block/redirect to an update when `expenses.some(e => e.item_id === selectedItem.id)`, and set status to `conf` on create (mirror `ExpenseCard.jsx:24-25`). Ideally add a DB unique index on `expenses(item_id)`.

### C4 — Confirmed cost entered in the Plan-tab add flow is silently discarded

**Files:** `src/features/plan/SelectPage.jsx:136` renders `<AddItemModal … onAdd={addItem} />` with **no `addExpense` prop** (verified). `AddItemModal.jsx:136` guards expense creation with `if (form.status === 'conf' && cost > 0 && addExpense)`, but the confirmed-cost input still renders (`:215-227`).

**Failure scenario:** From Plan tab: add "Hotel", status Confirmed, cost $600, Save & Confirm. Item saves as `conf`; `addExpense` is `undefined` so the block is skipped — no expense row, no warning. Budget falls back to `estimated_cost` (likely 0 → "$0" for a booked hotel).

**Fix:** Pass `addExpense` (and `userEmail`) to `AddItemModal` in `SelectPage.jsx` (as `App.jsx:97` already does), or hide the confirmed-cost field when `addExpense` is absent.

### C5 — Deselecting a conflicting stay orphans its expense

**Files:** `src/shared/hooks/useItems.js:126-147` sets conflicting stays' status to `''` but never deletes their expenses (contrast the guarded downgrade in `DetailModal.jsx:137-147`).

**Failure scenario:** Stay A is `conf` with a $500 expense. Selecting Stay B for the same stop flips A to `''`. `BudgetSummary.jsx:16` drops A from "Selected", but the second loop (`:36-44`) still adds A's $500 to `confTotal`. Budget reports $500 confirmed for an abandoned hotel, and A is an orphaned `''` item carrying an expense.

**Fix:** When auto-deselecting a stay, delete its linked expense (or warn), consistent with the DetailModal downgrade path.

### C6 — Map re-fits and re-issues Directions on every render (UX bug + quota; likely part of #8)

**Files:** `StopSection.jsx:145` passes `mapItems={scheduled.filter(it => it.type !== 'transport')}` — `.filter()` yields a **new array identity every render** (verified). `MapComponents.jsx:46-57` fit-bounds effect depends on `mapItems`, so it re-runs on every `StopSection` re-render (live-price ticks, `expenseMap` changes, status edits), calling `map.fitBounds(...)` and snapping the viewport back. `MapComponents.jsx:60-112,190-237`: inter-item routes are cached by `directionsCache[routeKey]` (`:74`) but **transport routes are not**, so each re-run issues fresh `DirectionsService().route(...)` calls. _Confidence: medium-high on the map-jump; medium on the Directions/#8 link._

**Why it matters:** On a phone the map visibly jumps back whenever anything upstream updates; repeated uncached Directions calls burn quota and can trip rate/referrer errors — plausibly contributing to PENDING #8.

**Fix:** Memoize the derived arrays in `StopSection` (`const mapItemsForMap = useMemo(() => scheduled.filter(it => it.type !== 'transport'), [scheduled])`) and pass the stable reference; likewise stabilize `RouteMap`'s inline `points` (`MapComponents.jsx:134`). Add an `origin|dest|mode` cache for transport routes, matching the item-route cache.

---

## Important

### I1 — Client trusts RLS, but no RLS/policies are in the repo to verify

`supabase/` has only `.temp/` — no `migrations/`, no policy SQL. Every read/write uses the anon key (public in the bundle by design). If RLS is missing/permissive on `stops`, `items`, `expenses`, `place_cache`, or the storage bucket, any anonymous client can read/write all rows. **Fix:** Confirm `ENABLE ROW LEVEL SECURITY` + per-user policies on every table and the bucket; commit the policy migrations so this is reviewable (CLAUDE.md already mandates reviewed migrations). _Unverifiable from source today._

### I2 — Supabase project ref + pooler connection string committed

`supabase/.temp/project-ref`, `linked-project.json`, `pooler-url` are **tracked** (verified) and reveal the project ref, org id, and the Postgres pooler DSN (host + DB username, no password). Not a credential leak alone, but hands an attacker the exact DB host/username for targeted attacks. **Fix:** `git rm --cached supabase/.temp/` and add `supabase/.temp/` to `.gitignore` (Supabase CLI treats it as local state).

### I3 — User/external URLs rendered as `href` without scheme validation

`DetailModal.jsx:204,209` render `href={opt.url}` and `:214` `href={it.link}` directly from stored/enriched data with no `http(s):` allowlist. A stored `javascript:` value is an XSS-on-click vector (React 19 warns but does not robustly block all cases). **Fix:** Only emit the anchor when `new URL(v).protocol` is `http:`/`https:` — reuse the guard already used for `faviconUrl` at `DetailModal.jsx:87`.

### I4 — Upload validation is client-only

`storage.js:5-12` does no content-type/size check; `ext = file.name.split('.').pop()` trusts the filename. `DetailModal.jsx:92` enforces 5MB client-side, but `AddItemModal.jsx:157` uploads with **no size check**. `accept="…"` attributes are bypassable. **Fix:** Enforce size + allowed MIME on the bucket policy (`allowed_mime_types`/`file_size_limit`) and add the 5MB guard to the AddItemModal path.

### I5 — Currency assumed USD everywhere; Xotelo currency dropped

`hotelPrices.js:25` returns `currency`, but `xotelo.js:22-28` and `useLivePrices.js:42-54` never propagate/check it — only the numeric `total` is written to `estimated_cost`, and `$f` (`useItems.js:5`) hard-prefixes `$`. If Xotelo returns EUR/GBP, prices are stored as bare numbers and shown as dollars. **Fix:** Assert `currency === 'USD'` before writeback (skip/flag otherwise), or store & display the currency.

### I6 — `estimated_cost` written by forms (contradicts the read-only rule)

`DetailModal.jsx:301-302` and `AddItemModal.jsx:124` write `estimated_cost`, but the data rule says it is written _only_ by `useLivePrices`. For a stay with a `xotelo_key`, a manual edit is overwritten by the next live-price writeback (`useLivePrices.js:48-54`) with no indication — the edit "reverts". For non-stay types the form is the only cost source, so rule and code are in genuine tension. **Fix (product call):** make the field read-only for xotelo-linked stays, or document that manual estimates are transient for those.

### I7 — `nights === 0` yields `estimated_cost` 0

`hotelPrices.js:15-17`: `nights = Math.round((checkOut - checkIn)/86400000)`, `total = perNight * nights`, with no `Math.max(1, …)` (unlike `utils.js:27 calcNights`). A single-day stop (`start_date == end_date`) → `nights = 0` → `total = 0` for a real hotel. **Fix:** Floor nights at 1, matching `calcNights`.

### I8 — `NaN` amount poisons the whole total

`BudgetSummary.jsx:37-38`: `const amt = Number(e.amount || 0); if (amt <= 0) return;` — `NaN <= 0` is `false`, so a `NaN` amount is not skipped and `confTotal += NaN` makes the confirmed total `NaN`, rendered as "$0" by `$f`. Same at `:24`. Low likelihood (inputs go through `parseFloat`) but blast radius is the entire summary. **Fix:** `if (!Number.isFinite(amt) || amt <= 0) return;`.

### I9 — Live-price writeback pollutes the "Recent activity" feed

`useLivePrices.js:48-53` writes through `updateItem`, which stamps `updated_at`/`updated_by = currentUserEmail` (`useItems.js:113-114`). `OverviewView.jsx:28-32,84` shows any item with `updated_by` as "updated", so every automatic Xotelo refresh makes a hotel jump to the top of "Recent activity" as if the user edited it. **Fix:** Write `estimated_cost` via a path that doesn't bump `updated_by` (this is exactly why the data rule makes it a machine-owned column), or exclude price-only writes from the feed.

### I10 — `allStopItems` memo missing `combinedStopIds` dependency

`StopSection.jsx:63-73`: `allStopItems` reads `stopIdsToMatch` (= `combinedStopIds || [stop.id]`) but deps are `[items, stop.id, selectedDate]`. In combined-date mode, if `combinedStopIds` changes while the others don't, `planItems` (`:80`) goes stale and the Plan section can show the wrong stop set. **Fix:** Add `combinedStopIds` to deps; since it's a fresh array each render (`TodayPage.jsx:99`), stabilize it (e.g. a joined string key), as the `scheduled` memo already does at `:50`.

### I11 — Test coverage gaps on the highest-risk paths

`src/test` has good coalescing/date tests, but **no** test for: preventing a second expense per item (C3), an expense on a `sel` item / unlinked expense into `confTotal` (`BudgetSummary.jsx:39-41`), orphaned expense after auto-deselect (C5), currency handling (I5), `NaN`/non-numeric amount (I8), or `hotelPrices` nights/total (I7). Also, `budgetSummary.test.js` re-implements a local `calculateBudget` copy instead of importing `BudgetSummary`'s function — the component's real code isn't under test and can drift. **Fix:** Add tests for the above (ships-with-the-code per CLAUDE.md) and test the actual exported budget function.

---

## Minor

- **`useItems.js:15` `priceLabel`:** `!it.estimated_cost` treats string `'0'` as truthy → activity with `estimated_cost === '0'` renders blank instead of "Free" (numeric `0` renders "Free"). Normalize via `itemCost(it)`.
- **`useItems.js:5` `$f`:** `toLocaleString()` with no `maximumFractionDigits` → `$f(100.5)` → "$100.5" while most values are whole-dollar. Inconsistent formatting.
- **`useLivePrices.js:70-77` `getStayDates`:** uses only `stop_ids[0]`; a multi-stop stay gets nights from the first stop only. Low likelihood.
- **`DetailModal.jsx:136`:** `setStatus(it.id,'conf')` not awaited before opening ExpenseCard; `ExpenseCard.jsx:25` may re-call `setStatus` on a stale prop (idempotent, harmless).
- **`utils.js:63-74` (`getTodayDayIndex`):** date-strings parse as UTC midnight while `new Date()` is local → "today" can be off by a day near boundaries in non-UTC zones. Known trade-off.
- **`BudgetPage.jsx:37`:** "Confirmed (n)" list excludes unlinked expenses, but `BudgetSummary` `confTotal` includes them (`'other'`) → header total and list count can legitimately disagree.
- **`SelectPage.jsx:25,136` — dead modal:** `setShowAddModal(true)` is never called; the bottom `AddItemModal` is unreachable. Remove or wire a button. (Plan-tab item-add currently only works via the global FAB in `App.jsx`.)
- **`DetailModal.jsx:61-62`:** `savedTimerRef` timeout not cleared on unmount → `setSaved('')` may fire post-unmount (harmless in React 18). Add a cleanup.
- **Modal history-stack pattern** (`DetailModal.jsx:64-69`, `AddStopModal.jsx:16-26`, `AddItemModal.jsx:50-60`, `AddExpenseModal.jsx:15+`): `pushState` on mount, but closing via ✕ doesn't `history.back()`, leaving an orphan history entry. Uniform across modals; minor UX.
- **`useItemFiles.js:19`:** file state only grows; never pruned when an item leaves `conf` / is deleted. Small memory creep.
- **PWA caches Supabase REST** (`vite.config.js:47-50`, `NetworkFirst`, 1h): trip data (some PII) persists in Cache Storage — a concern on a shared device. Auth is correctly excluded (`NetworkOnly`, `:52-54`). Consider not caching REST or documenting the tradeoff.
- **`googlePlaces.js:38`:** Google API key ends up in `place_cache.photo_url(s)` and rendered as `img src` — one more copy to rotate. Prefer building photo-media URLs at render time.
- **`index.html:18`:** external font CSS from `cdn.jsdelivr.net` with no SRI — supply-chain surface. Self-host or add `integrity`/`crossorigin`.

---

## PENDING_ITEMS.md — resolution

### #8 — Google Directions API key committed / Directions failing

**Confirmed exposure.** The live key value is in `docs/superpowers/plans/2026-05-14-pending-items.md` and `…/specs/…-design.md` (see C1) — `PENDING_ITEMS.md` itself only references it. **Action:** rotate + restrict (HTTP-referrer + API list) + scrub the docs. Separately, C6 (uncached transport Directions calls re-firing every render) is a plausible functional contributor to the "still failing" symptom — fix the array-identity/caching issue and retest before assuming it's purely a console/restriction problem.

### #9 — Dead props

Both **verified dead** (children don't destructure them; parents still pass them):

- **`OverviewView` `onItemTap`** (`TodayPage.jsx:93`): `OverviewView.jsx:6` destructures `{ items, stops, expenses, onDaySelect }` only. **Recommendation: REMOVE.** Overview is a dashboard — destination cards mean "navigate" (`onDaySelect`), unlike the item-list siblings. _If_ item-detail-on-tap is genuinely wanted, wire the **recent-activity rows** (`OverviewView.jsx:81`, `onClick={() => onItemTap(r)}`), which already render real items — not the destination cards. Product call; don't leave it passed-and-ignored.
- **`TopBar` `onRefresh`** (`App.jsx:71`): `TopBar.jsx:1` destructures `{ items, stops, session, onProfileClick }`; renders no refresh control. **Recommendation: REMOVE.** `retryAll` is already wired to the error-state "Try again" button (`App.jsx:62`); manual refresh belongs to pull-to-refresh (#7).

### #10 — `useItems.js` reads a ref during render

**Verified benign — dead code, not a behavioral bug.** `stopsData` (`useItems.js:220` read, `:224` return) is referenced nowhere else (grep: only those two lines). Live-price timing is correct because `useLivePrices` is fed from `useStops` state via `TripContext.jsx:19`, not from this value. **Recommendation: DELETE `stopsData`** (the render read at `:220` and its entry in the return at `:224`). This clears the `react-hooks/refs` warning at zero risk. **Do not** convert `stopsDataRef` to state.

### #11 — `set-state-in-effect` warnings

**None are bugs (no category-c / infinite-loop / cascading-render).**

- Legit external/DOM/async sync: `PlaceSearch.jsx:14-16,19-51`; `DetailModal.jsx:71-76` (place fetch — add an `eslint-disable-next-line` to document intent); `ProfilePage.jsx:14-17`; `TodayPage.jsx:44-49`; `AddStopModal.jsx:29-61`.
- Simplifiable (derived-state-via-effect; move to an event handler at navigation): `SelectPage.jsx:17-22`; `TodayPage.jsx:37-42` (also closes over stale `view` and re-runs on `stops.length` change — adding/deleting a stop while on Overview snaps to "today").

---

## Strengths (worth preserving)

- **Context split is real, not cargo-culted** — `TripContext.jsx:37-77`: `actions` is memoized over stable `useCallback`s, `data` has a complete dep list; genuine re-render isolation.
- **Realtime discipline** — `useItems.js:104`, `useStops.js:82`, `useExpenses.js:36` all `removeChannel` on cleanup; no leaked channels. Optimistic updates with full rollback + toast (`useItems.js:122-149,189-216`).
- **Live-price loop avoidance** — `useLivePrices.js:12-14,28-29,48` keys on `id:xotelo_key` and only writes when `total !== estimated_cost`, with `fetchedRef` — no fetch→writeback→refetch loop.
- **Single-source item numbering** — computed once (`StopSection.jsx:53-57`) and shared by schedule cards and map markers; not forked.
- **Correct client security posture** — anon key only (no `service_role` in the bundle), Xotelo proxy pins host + `encodeURIComponent`s params (no SSRF/injection), no `dangerouslySetInnerHTML`, `rel="noopener"` on `_blank` links, auth endpoints excluded from the PWA cache.
- **De-dupe on realtime INSERT** — `useExpenses.js:26-30,42-45` reconciles optimistic insert with the echoed realtime row by `id`.

---

## Recommended fix order

1. **C1 + #8** — rotate & restrict the Google key, scrub docs (security + likely unblocks Directions debugging).
2. **C2 + I1 + I2** — private bucket + signed URLs; confirm & commit RLS policies; untrack `supabase/.temp/`.
3. **C3, C4, C5** — close the expense-invariant holes (dedupe/promote in `AddExpenseModal`; pass `addExpense` in `SelectPage`; delete orphaned expenses on auto-deselect). Add the DB unique index on `expenses(item_id)`.
4. **C6** — memoize map array props + cache transport routes; retest the map/Directions on the phone.
5. **I5–I10** — currency guard, `estimated_cost` ownership, nights floor, `NaN` guard, activity-feed noise, memo dep.
6. **#9, #10** — remove the three dead props/values (quick lint wins).
7. **I11** — backfill tests for the C3/C5/I5/I7/I8 paths; make `budgetSummary.test.js` import the real function.
8. **I3, I4** — URL scheme allowlist; server-side upload limits.
9. Minor items as convenient.
