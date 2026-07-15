# Anisita — Pending Items (2026-05-14)

## Code Changes

### Quick Fixes
1. **Status selector in edit mode** — DetailModal EditMode should have status pills so you can change status while editing without saving first
2. **Confirm without expense** — allow setting status to 'conf' without requiring a confirmed price (e.g. restaurant booking with no cost yet)
3. **Profile back button** — ProfilePage has no way to navigate back to the trip

### Features
4. **Sticky sort + filter buttons (Booking.com pattern)** — Plan tab: replace inline filter bar with sticky sort+filter buttons at top. Each opens a modal with the filter/sort options. Saves mobile screen space.
5. **Time conflict alerts** — warn when 2 stops overlap in dates or 2 items overlap in start/end times
6. **Date preselection** — when creating/editing an item in a specific stop's context, preselect that stop's start date. End date defaults to start date + 1 hour. Also applies when creating from a stop page in itinerary.
7. **Custom pull-to-refresh** — implement touch-event-based pull-to-refresh following Twitter/Instagram PWA pattern. Needed because the app-shell nested-scroller architecture blocks native pull-to-refresh.

### Investigate
8. **Google Directions API still failing** — The API is enabled in Google Cloud Console but transport route rendering still shows errors. Investigate: check API key restrictions (HTTP referrer, API restrictions list), verify the Directions API is enabled for the correct project, test with a direct API call. (Note: an API key was previously committed in plaintext here — rotate it and keep keys in env vars only.)

## Flagged during workflow-setup lint cleanup (2026-07-14)

9. **Dead props — confirm intended or remove wiring.** Two props are passed by parents but never consumed by the child (removed from the child destructures to clear lint, but parents still pass them):
   - `OverviewView` was passed `onItemTap={setSelectedItem}` (`TodayPage.jsx:93`) but never wired it to tappable cards — unlike sibling views (`StopSection`/`ScheduleList`/`PlanSection`) which do. Decide: should overview items open the DetailModal on tap?
   - `TopBar` was passed `onRefresh={retryAll}` (`App.jsx:71`) but renders no refresh control. Decide: was a manual-refresh button intended? (Relates to #7 pull-to-refresh.)
10. **`useItems.js:218` reads a ref during render.** `const stopsData = stopsDataRef.current` is read during render and returned to `useLivePrices`. Flagged by `react-hooks/refs` (relaxed to `warn`, not refactored — it's load-bearing realtime data flow that needs the app running to verify). Review whether `stopsDataRef` should be state, and whether live-price recompute timing is correct.
11. **`react-hooks/set-state-in-effect` warnings** (PlaceSearch, DetailModal, ProfilePage, TodayPage, SelectPage, AddStopModal) — mostly legit "sync external value → state" patterns. Revisit case-by-case; some may be simplifiable per the react.dev "you might not need an effect" guidance.
