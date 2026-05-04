# Anisita — Trip Planner PWA

## Tech Stack
- React 19 + Vite 8 (JavaScript, no TypeScript)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (auto-deploys from main)
- @vis.gl/react-google-maps (Google's official React wrapper)
- Google Maps JavaScript API + Places API (New)
- Xotelo API (live hotel prices from Booking.com/Expedia/Agoda)

## Project Structure
```
src/
  features/         — Feature modules
    itinerary/      — 8 files: TodayPage, OverviewView, StopSection, ScheduleList,
                      PlanSection, StatusFilter, MapComponents, utils
    plan/           — 3 files: SelectPage, FilterBar, ItemCard
    expenses/       — 2 files: BudgetPage, BudgetSummary
    auth/           — 2 files: Login, ProfilePage
  shared/           — Reusable components, hooks, modals
    components/     — DetailModal, PlaceSearch, TopBar, BottomTabs, Toast
    hooks/          — TripContext, useItems, useStops, useExpenses, useLivePrices,
                      useItemFiles, useToast, usePlaceData, useAuth, useSettings
    modals/         — AddItemModal, AddExpenseModal, AddStopModal
  services/         — supabase, googlePlaces, hotelPrices, xotelo, enrichItem, storage
  test/             — 7 test files, 74 tests
```

## State Management
- Dual TripContext: TripDataContext (data) + TripActionsContext (stable callbacks)
- Pages consume via useTrip(), useTripData(), or useTripActions()
- Focused hooks: useItems (CRUD+realtime), useLivePrices (Xotelo→DB writeback),
  useItemFiles, useToast, useStops, useExpenses (incremental realtime), usePlaceData

## Database (Supabase)
- **stops** — Trip stops with dates, coords, google_place_id
- **items** — 46 columns: type-specific fields, transport origin/dest, xotelo_key
- **expenses** — Payments linked to items (1:1 relationship)
- **place_cache** — Google Places photos/ratings/addresses

## Key Architecture Decisions
- All data from database — no hardcoded data files
- Items link to stops via stop_ids TEXT[] (one-to-many)
- Expenses are source of truth for payments. 1 expense per item max.
- estimated_cost is read-only — updated by useLivePrices from Xotelo
- Google Maps API key in VITE_GOOGLE_MAPS_API_KEY env var
- DetailModal: Summary mode (populated fields + read-only API data + Edit button)
  → Edit mode (all type-conditional fields + batch Save/Cancel)
- Same DetailModal used from all 3 tabs (Plan, Itinerary, Expenses)
- Clicking expense in Expenses tab opens linked item's DetailModal
- Status selector saves immediately; form fields batch-save
- Transport: origin/dest with mode-aware map routing (@vis.gl/react-google-maps)
- Itinerary: stops/dates toggle = filters on items table
- Plan tab: labeled filter rows (Type/Status/City) + sort dropdown with asc/desc
- Section grouping changes with sort (type→status→flat list)
- Photo carousel: CSS scroll-snap + arrow buttons for desktop
- Item numbering: frontend-computed from sorted order, shared between schedule cards and map markers
- Xotelo integration: TripAdvisor URL → extract key → live prices → DB writeback
- PWA cache: Supabase API 1h, Google Maps 7d, Places 30d

## Git Workflow
- Work on `dev` branch
- Build: `npm run build` | Test: `npx vitest run`
- Merge to main: `git checkout main && git merge dev && git push origin main`
- Vercel auto-deploys from main
