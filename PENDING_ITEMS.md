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
8. **Google Directions API still failing** — The API is enabled in Google Cloud Console but transport route rendering still shows errors. Investigate: check API key restrictions (HTTP referrer, API restrictions list), verify the Directions API is enabled for the correct project, test with a direct API call. The key is `AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA`.
