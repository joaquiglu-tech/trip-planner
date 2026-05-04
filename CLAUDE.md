# Anisita — Trip Planner PWA

## Tech Stack
- React 19 + Vite 8 (JavaScript, no TypeScript)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (auto-deploys from main)
- Google Maps JavaScript API + Places API (New)
- Xotelo API (live hotel prices from Booking.com)

## Project Structure
```
src/
  features/         — Feature modules (itinerary, plan, expenses, auth)
  shared/           — Shared components, modals, hooks (TripContext)
  services/         — External API integrations (Supabase, Google, Xotelo)
  test/             — Vitest tests (55 tests)
```

## State Management
- TripContext (shared/hooks/TripContext.jsx) provides all data + actions
- Pages consume via useTrip() hook — no prop drilling
- Hooks: useItems, useStops, useExpenses, usePlaceData

## Database (Supabase)
- **stops** — Trip stops (cities/towns with dates, coords)
- **items** — Everything you do/book/eat (linked to stops via stop_ids TEXT[])
- **expenses** — Payments (linked to items via item_id)
- **place_cache** — Google Places API cache (photos, ratings, addresses)

## Git Workflow
- Work on `dev` branch
- Build: `npm run build` | Test: `npx vitest run`
- Push dev: `git push origin dev`
- Merge to main: `git checkout main && git merge dev && git push origin main`
- Vercel auto-deploys from main

## Key Decisions
- All data from database — no hardcoded data files
- Items link to stops via stop_ids TEXT[] (one-to-many)
- Expenses are the source of truth for payments (estimated_cost is read-only)
- Google Maps API key in VITE_GOOGLE_MAPS_API_KEY env var, exported from services/supabase.js
- DetailModal is unified view — no separate edit mode, fields save on blur
- Transport items have origin/dest with mode-aware map routing
- "Food" type replaces dining/special — single category
- No urgent field — removed
- Single start_time/end_time datetime pair for all item types
