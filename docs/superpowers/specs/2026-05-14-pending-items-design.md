# Anisita Pending Items — Design Spec (2026-05-14)

8 items: 3 quick fixes, 4 features, 1 investigation.

---

## Item 1: Status selector in edit mode

**Problem:** EditMode in DetailModal has no status pills. User must exit edit, change status in summary, re-enter edit.

**Fix:** Pass `setStatus`, `status` (st), `expenseAmount`, `itemExpenses`, `deleteExpense`, and `confirm` to EditMode. Add the same `status-selector` div from summary mode (lines 129-152) into EditMode between the header and "Basic Info" section. Status saves immediately via `setStatus` (not batched with form save).

**Files:** `src/shared/components/DetailModal.jsx`

---

## Item 2: Confirm without expense

**Problem:** Clicking "Confirmed" in summary mode status selector (line 135) always forces ExpenseCard open. Blocks confirming items with no cost (e.g., restaurant reservations).

**Fix:** Change line 135: call `setStatus(it.id, 'conf')` first, then open ExpenseCard. User can dismiss ExpenseCard without entering anything — status persists either way. The ExpenseCard becomes an optional prompt, not a gate.

**Files:** `src/shared/components/DetailModal.jsx`

---

## Item 3: Profile back button

**Problem:** ProfilePage has no navigation. BottomTabs is hidden on profile tab (App.jsx line 102).

**Fix:**
- Add `onBack` prop to ProfilePage
- Render a back button at top: `<button class="profile-back-btn" onClick={onBack}>< Back</button>`
- In AppShell, pass `onBack={() => navigateTab('itinerary')}` to ProfilePage
- CSS: position at top-left of profile page, styled like a text link button

**Files:** `src/features/auth/ProfilePage.jsx`, `src/App.jsx`, `src/index.css`

---

## Item 4: Sticky sort + filter buttons (Booking.com pattern)

**Problem:** FilterBar has 4 rows (~160px) eating mobile viewport space.

**Design:**
- Replace FilterBar content with a compact layout:
  - Row 1: Search input (full width, compact)
  - Row 2: "Sort" button + "Filter" button (with active-filter badge count)
- Sort button opens a SortModal (bottom sheet) with radio options for sort field + direction
- Filter button opens a FilterModal (bottom sheet) with type pills, status pills, city select
- Active filter badge: count of non-"all" filters applied
- Same state shape in SelectPage — FilterBar still receives `filters`/`setFilters`/`sortBy`/`setSortBy`

**New components:** `SortModal` and `FilterModal` inside FilterBar.jsx (internal, not exported)

**Files:** `src/features/plan/FilterBar.jsx`, `src/index.css`

---

## Item 5: Time conflict alerts

**Design:**
- New function `detectConflicts(items, stops)` in `src/features/itinerary/utils.js`
- **Stop-level conflicts:** Two stops with overlapping date ranges
- **Item-level conflicts:** Two items assigned to the same stop with overlapping `start_time`/`end_time` windows
- Returns `{ stopConflicts: [{stop1, stop2}], itemConflicts: [{item1, item2, stopId}] }`
- Display: yellow warning banner in StopSection when conflicts exist for that stop
- Display in OverviewView if any stop-level conflicts exist
- Non-blocking, informational only

**Files:** `src/features/itinerary/utils.js`, `src/features/itinerary/StopSection.jsx`, `src/features/itinerary/OverviewView.jsx`, `src/index.css`

---

## Item 6: Date preselection

**Problem:** AddItemModal and EditMode start with empty dates. No context from which stop the user navigated.

**Design:**
- Add optional `defaultStopId` prop to AddItemModal
- When provided and stop exists:
  - Pre-select that stop in `stop_ids` array
  - Set `start_time` to stop's `start_date` at `T10:00` (datetime-local format)
  - Set `end_time` to stop's `start_date` at `T11:00`
- In EditMode: when user adds a stop and `start_time` is empty, auto-fill from that stop's dates (same logic)
- Pass `defaultStopId` from:
  - StopSection's "Add item" action (if present)
  - AppShell's FAB when itinerary tab is showing a specific stop

**Files:** `src/shared/modals/AddItemModal.jsx`, `src/shared/components/DetailModal.jsx` (EditMode), `src/features/itinerary/StopSection.jsx`, `src/App.jsx`

---

## Item 7: Custom pull-to-refresh

**Problem:** Native pull-to-refresh doesn't work with the app-shell nested-scroller pattern (`overflow:hidden` on shell, `overflow-y:auto` on `.page`).

**Design:**
- New hook: `src/shared/hooks/usePullToRefresh.js`
- `usePullToRefresh(scrollRef, onRefresh)` — attaches touch listeners to the scroll container
- Logic:
  - `touchstart`: record Y position; only activate if `scrollTop === 0`
  - `touchmove`: if pulling down and started at top, show pull indicator; prevent default after 10px threshold
  - `touchend`: if pulled > 60px, trigger `onRefresh()`; animate indicator back
- Pull indicator: a small spinner/arrow div inserted at top of page, CSS transform for smooth pull animation
- Apply in AppShell: wrap page-container with ref, pass `retryAll` as refresh callback
- Passive touch listeners where possible for scroll performance

**Files:** `src/shared/hooks/usePullToRefresh.js` (new), `src/App.jsx`, `src/index.css`

---

## Item 8: Google Directions API investigation

**Problem:** API key `AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA` — Directions API enabled in console but `DirectionsService.route()` still fails in MapComponents.jsx.

**Investigation steps:**
1. Add `console.error` logging to the DirectionsService callbacks (lines 82, 101) to capture the actual error status string
2. Test direct Directions API REST call with the key via curl
3. Check if API key has HTTP referrer restrictions that block the JS API
4. Check if the correct API is enabled ("Directions API" not "Routes API" — Google renamed things)
5. Verify the fallback polyline (line 106) renders correctly when directions fail

**Code change:** Add error status logging to both DirectionsService.route() callbacks in MapComponents.jsx. If the issue is key restrictions, document the fix needed in Google Cloud Console.

**Files:** `src/features/itinerary/MapComponents.jsx`

---

## Architecture Notes

- All items are independent — no dependencies between them
- Items 1-3: <30 lines each, single-file edits
- Item 4: FilterBar rewrite, ~150 lines new modal code + CSS
- Item 5: New utility + integration into 2 components
- Item 6: Props threading + date logic
- Item 7: New hook + integration
- Item 8: Debugging + minor logging additions

## Execution Plan

One subagent per item, all 8 in parallel. Each subagent must:
1. Verify the issue still exists before implementing
2. Implement the fix
3. Run `npm run build` to verify no build errors
4. Report what was changed
