# Rules for shared/ components, hooks & modals

Applies to `src/shared/**` (components, hooks, modals).

- Components are pure presentational. No direct Supabase/`fetch` calls; data flows in via props
  or the `useTrip*` / feature hooks.
- Reuse before you build: DetailModal, PlaceSearch, TopBar, BottomTabs, Toast already exist —
  extend the existing pattern rather than adding a parallel one.
- DetailModal is shared across all 3 tabs (Plan, Itinerary, Expenses) and has two modes
  (Summary → Edit). Keep both modes working when you touch it.
- Hooks own their slice of state/realtime (useItems, useStops, useExpenses, useLivePrices, …).
  Keep a hook focused; don't merge concerns.
- Mobile-first, touch-friendly. Keep spacing/typography consistent with existing screens.
