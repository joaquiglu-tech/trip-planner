# Anisita — Trip Planner PWA

## Tech Stack
- React 19 + Vite 8 (JavaScript, no TypeScript)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (auto-deploys from main)
- Google Maps JavaScript API + Places API + Routes API
- Xotelo API (live hotel prices from Booking.com)

## Project Structure
```
src/
  features/         — Feature modules (itinerary, plan, expenses, auth)
  shared/           — Shared components, modals, hooks
  services/         — External API integrations (Supabase, Google, Xotelo)
```

## Database (Supabase)
- **stops** — Trip stops (cities/towns with dates)
- **items** — Everything you do/book/eat (linked to stops via stop_ids array)
- **expenses** — Payments (linked to items via item_id)
- **place_cache** — Google Places API cache

## Git Workflow
- Work on `dev` branch
- Build and test: `npm run build`
- Push dev: `git push origin dev`
- Merge to main: `git checkout main && git merge dev && git push origin main`
- Vercel auto-deploys from main

## Key Decisions
- All data from database — no hardcoded data files
- Items link to stops via stop_ids TEXT[] (one-to-many)
- Expenses are the source of truth for payments
- Live hotel prices from Xotelo API (cached 24h in memory)
- Google Places for photos, ratings, addresses (cached in place_cache)
- "Food" type replaces dining/special — single category
