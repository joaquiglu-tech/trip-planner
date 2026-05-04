# Anisita — Trip Planner PWA

## Tech Stack
- React 19 + Vite 8 (JavaScript, no TypeScript)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (auto-deploys from main)
- @vis.gl/react-google-maps (Google's official React wrapper)
- Google Maps JavaScript API + Places API (New)
- Xotelo API (live hotel prices from Booking.com)

## Project Structure
```
src/
  features/         — Feature modules (itinerary[8 files], plan, expenses, auth)
  shared/           — Shared components, modals, hooks
  services/         — External API integrations (Supabase, Google, Xotelo)
  test/             — Vitest tests (74 tests, 7 files)
```

## State Management
- Dual TripContext: TripDataContext (data) + TripActionsContext (callbacks)
- Pages consume via useTrip(), useTripData(), or useTripActions()
- Focused hooks: useItems (CRUD), useLivePrices, useItemFiles, useToast, useStops, useExpenses, usePlaceData

## Database (Supabase)
- **stops** — Trip stops (cities/towns with dates, coords)
- **items** — Everything you do/book/eat (linked to stops via stop_ids TEXT[])
- **expenses** — Payments (linked to items via item_id)
- **place_cache** — Google Places API cache (photos, ratings, addresses)

## Git Workflow
- Work on `dev` branch
- Build: `npm run build` | Test: `npx vitest run`
- Merge to main: `git checkout main && git merge dev && git push origin main`
- Vercel auto-deploys from main

## Key Decisions
- All data from database — no hardcoded data files
- Items link to stops via stop_ids TEXT[] (one-to-many)
- Expenses are the source of truth for payments (estimated_cost is read-only)
- Google Maps API key in VITE_GOOGLE_MAPS_API_KEY env var
- DetailModal: Summary mode (populated fields, read-only API data) + Edit mode (batch save)
- Status selector saves immediately; form fields batch-save with explicit Save button
- Transport items have origin/dest with mode-aware map routing (@vis.gl/react-google-maps)
- Itinerary: stops/dates toggle = filter on items table. Stops filter by stop_ids, dates filter by item start_time
- Single start_time/end_time datetime pair for all item types
- No urgent field, no check_in/check_out, no depart/arrive — all consolidated
