# Vercel environment variables (required)

The app reads these at **build time** (Vite inlines `import.meta.env.VITE_*`). They must be set in **Vercel → Project → Settings → Environment Variables** for **both Production and Preview** (and Development if you use `vercel dev`).

| Variable                   | Required?   | If missing                                                                                                                           |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`        | **Yes**     | `src/services/supabase.js` throws at module load → the whole bundle fails before React mounts → **blank/black screen before login**. |
| `VITE_SUPABASE_ANON_KEY`   | **Yes**     | Same as above.                                                                                                                       |
| `VITE_GOOGLE_MAPS_API_KEY` | Recommended | App still loads; maps and place search are disabled (a console warning is logged).                                                   |

Current values live in the Vercel dashboard. The Supabase URL is `https://eestsuywkpxddjvyqers.supabase.co`; the anon key is a **public** client key (safe to expose in the bundle) — never put the Supabase `service_role` key in a `VITE_*` var.

## Why "both Production and Preview"

If a required var is set for Production only, every **Preview** deployment (dev branch, PRs) builds without it and boots to a blank screen — so a broken build can pass "Ready" and go unnoticed until it reaches production. Keep the vars enabled for Production **and** Preview so preview smoketests catch it.

## Incident (2026-07-17)

A `VITE_SUPABASE_*` var went missing/empty in Vercel. Every _new_ build (production and previews) then crashed at module load → pure black screen before the login page. An older deployment kept working because the value was baked in at its build time. A `git revert` did **not** fix it (a rebuild re-bakes the current/broken env); the fix was restoring the env var + redeploying.

Guardrails added after this incident:

- `index.html` boot fallback: shows a readable message if the bundle never mounts (covers module-load failures like this one).
- `src/shared/components/ErrorBoundary.jsx`: catches React _render_ errors and shows a Reload screen instead of a blank page (does **not** catch module-load errors — the boot fallback does).

**Fastest diagnosis if the app is blank again:** open the last known-good deployment's own URL (Vercel keeps every past build live). If it works but new builds don't, it's a build-time/env difference, not code — check these env vars first.
