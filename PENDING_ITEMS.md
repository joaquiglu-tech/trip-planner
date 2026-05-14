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

## Manual Actions (User)
8. **Enable Google Directions API** — Go to Google Cloud Console → APIs & Services → Enable the Directions API for your project. The API key is already in the app, it just needs the Directions API enabled. This fixes 6 console errors on transport route rendering.
