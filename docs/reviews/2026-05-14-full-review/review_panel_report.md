# Anisita Review Panel Report

**Work reviewed:** Anisita Trip Planner PWA (full app)
**Date:** 2026-05-14
**Panel:** 4 reviewers (UX Designer, UI/Visual Designer, Mobile PWA Specialist, Devil's Advocate) + Completeness Auditor + Severity Verifier + Supreme Judge
**Pre-panel agents:** 8 (4 click-path auditors, design system auditor, a11y architect, database reviewer, performance optimizer)
**Verdict:** APPROVE_WITH_FIXES | **Score: 5.5/10** | **Confidence: High**

---

## Executive Summary

Anisita has a solid foundation — clean design, sound data architecture, working realtime collaboration, and good PWA infrastructure. However, the app's primary conversion flow (selecting -> confirmed) silently fails when the expense card is dismissed. Error handling across the board relies on `console.warn` with empty catches, optimistic updates have no rollback, and there is zero offline awareness for an app that will be used during international travel in 58 days.

**1 P0, 17 high-priority P1s, 23 lower-priority P1s, 14 P2s, 9 P3s** across 64 deduplicated findings from 12 agents and 4 expert reviewers.

---

## Panel Scores

| Reviewer | Initial | Final | Recommendation |
|----------|---------|-------|----------------|
| UX Designer (50% agreement) | 6/10 | 6/10 | APPROVE_WITH_FIXES |
| UI/Visual Designer (40%) | 6.5/10 | 6/10 | APPROVE_WITH_FIXES |
| Mobile PWA Specialist (30%) | 5.5/10 | 5/10 | REQUEST_CHANGES |
| Devil's Advocate (20%) | 6.5/10 | 6/10 | APPROVE_WITH_FIXES |
| **Judge** | — | **5.5/10** | **APPROVE_WITH_FIXES** |

---

## Dispute Resolutions

| Dispute | Ruling | Reasoning |
|---------|--------|-----------|
| Offline support | **P1** (not P0) | Workbox NetworkFirst/3s timeout provides partial read cache. App serves stale data, doesn't break. |
| Back button trap | **P1** | Navigation friction, not data loss. Three dismiss mechanisms work. |
| Accessibility | **P2** (defer) except `role="dialog"` on Add modals (P1) | Zero impact for 2 sighted mobile users. Fix dialog roles as 1-line consistency fix. |
| Dark mode hex colors | **P1** | 32 inline values don't adapt, but 90% of dark mode works well. |

---

## Must Fix Before Trip (Jul 12)

### P0 — Critical

| # | Finding | File | Fix |
|---|---------|------|-----|
| 1 | **Confirm flow silently fails on dismiss** — clicking Confirmed opens ExpenseCard but status never changes if user closes without saving | DetailModal.jsx:129 | Set status to `conf` immediately, open ExpenseCard as optional enrichment |

### P1 — High Priority (17 items)

| # | Finding | File | Fix |
|---|---------|------|-----|
| 2 | Expense deletion unawaited + empty catch | DetailModal.jsx:130 | `await` each call, handle errors, abort status change on failure |
| 3 | Delete stop orphans items | useStops.js:122, StopSection.jsx:101 | Clear deleted stop ID from items' stop_ids |
| 4 | Offline awareness (banner + disable writes) | New hook + App.jsx | `useOnlineStatus` hook + offline banner |
| 5 | Back-button history corruption | DetailModal.jsx:57-62 | Wrap `onClose` in `useCallback` at 3 call sites |
| 6 | Add modals have no history management | AddItemModal/AddStopModal/AddExpenseModal | Add pushState/popstate pattern |
| 7 | `stop.sleep` typo | AddExpenseModal.jsx:75 | Change to `stop.name` |
| 8 | Expense `created_by` always empty | ExpenseCard.jsx:20 | Pass + use `userEmail` prop |
| 9 | Status sort ignores direction | SelectPage.jsx:67 | Add `* dir` |
| 10 | No currency support ($ for EUR trip) | useItems.js:5 + others | Add currency selector or default to EUR |
| 11 | SVG-only manifest icons (iOS install broken) | vite.config.js, index.html | Generate PNG icons |
| 12 | Optimistic update: no rollback on failure | useItems.js:101-110 | Store pre-state, restore on error |
| 13 | deleteItem rollback mechanism is impossible | useItems.js:165-184 | Store pre-state instead of relying on realtime |
| 14 | Competing stay deselection is silent | useItems.js:116-125 | Show toast naming affected item |
| 15 | No session expiry handling | useAuth.jsx | Handle refresh failures, force re-auth |
| 16 | No conflict resolution for simultaneous edits | DetailModal.jsx EditMode | Compare draft base vs current before save |
| 17 | Failed data load shows empty app forever | useItems/useStops/useExpenses | Show error state with retry button |
| 18 | Unlinked expense delete: zero confirmation | BudgetPage.jsx:71 | Add `confirm()` guard |

---

## Should Fix (P1 Lower Priority — 23 items)

| # | Finding | File | Fix |
|---|---------|------|-----|
| 19 | Hardcoded hex colors bypass dark mode (32 values) | 7+ JSX files | Extract into CSS vars with `[data-theme="dark"]` overrides |
| 20 | **Xotelo CORS — live hotel prices completely broken** | hotelPrices.js | Add Vercel API route proxy (`/api/xotelo`) to avoid CORS |
| 21 | **Google Directions API not authorized** | MapComponents.jsx | Enable Directions API on the Google Cloud Console API key |
| 22 | **Add ON DELETE CASCADE** to expenses + place_cache FKs | Supabase migration | `ALTER TABLE expenses ADD CONSTRAINT ... ON DELETE CASCADE` |
| 23 | **Verify RLS policies on stops + place_cache** | Supabase SQL | Run `SELECT * FROM pg_policies` — same bug class as the expenses UPDATE we just fixed |
| 24 | **useLivePrices dual write path** bypasses useItems | useLivePrices.js:49-56 | Route writes through `updateItem` instead of direct DB |
| 25 | **`--text-muted` contrast failure** (#999 on white = 2.85:1) | index.css:13 | Change to `#767676` (4.54:1 ratio) |
| 26 | Decorative drag handle with no swipe-to-dismiss | DetailModal.jsx:109 | Remove `.detail-handle` or implement touch gesture |
| 27 | No undo/soft-delete anywhere | Multiple files | Add undo toast with 5s window |
| 28 | Hardcoded "Lima" filter in OverviewView | OverviewView.jsx:39,54 | Add `is_home` boolean to stops |
| 29 | Stale closure in `setStatus` reads captured `items` | useItems.js:112-128 | Use ref for items lookup |
| 30 | Stale closure in `addStop` for sort_order | useStops.js:102 | Use functional updater or ref |
| 31 | `useLivePrices` fallback uses entire trip date range | useLivePrices.js:78 | Skip fetch if stay has no stop |
| 32 | Geist font CDN not cached for offline | index.html:10, vite.config.js | Add to Workbox runtimeCaching |
| 33 | All 4 pages mounted simultaneously | App.jsx:61-66 | Conditional render per active tab |
| 34 | `useTrip()` merges both contexts (defeats split) | TripContext.jsx:72-77 | Migrate to `useTripData()` + `useTripActions()` |
| 35 | `getPlaceData` deps destabilize actions context | usePlaceData.js:34 | Remove `places` from deps, use ref |
| 36 | Add `role="dialog"` + `aria-modal` to 3 Add modals | AddItemModal/AddStopModal/AddExpenseModal | 1-line per file |
| 37 | enrichItem dual write path | enrichItem.js, useItems.js:157-161 | Route through useItems |
| 38 | `viewport-fit=cover` + safe area insets missing | index.html, index.css | Add to viewport meta, apply `env(safe-area-inset-*)` |
| 39 | Missing indexes on `expenses.item_id`, `place_cache.item_id` | Supabase migration | `CREATE INDEX IF NOT EXISTS ...` |
| 40 | Duplicate stops fetch (useItems + useStops both query) | useItems.js:51-53 | Share stops data via ref or context |
| 41 | O(n*m) expense-to-item join in BudgetPage | BudgetPage.jsx:14-16 | Build items Map for O(1) lookups |

---

## Nice to Have (P2 — 14 items) & Defer (P3 — 9 items)

Dark mode FOUC, native dialogs, date validation, today auto-navigate, file upload restrictions, empty states, CSS hardcoded colors, focus-visible styles, toast a11y, typography scale, inline style extraction, landmarks, focus traps, max-width, pull-to-refresh, env validation, stop IDs, React.memo.

---

## Strengths

1. **Clean, intentional design** — Linear/Vercel-inspired. No AI slop. Design score 72/100.
2. **Sound data architecture** — Dual context, Supabase realtime, well-normalized schema.
3. **Progressive disclosure** — DetailModal summary→edit, plan tab filters, itinerary stops/dates toggle.
4. **Working PWA infrastructure** — Workbox caching with tiered strategies exists.
5. **Real-time collaboration** — Live sync with toast notifications for remote edits.
6. **Feature completeness** — Maps, live hotel prices, photo carousels, file attachments, budget tracking.

---

## Suggested Execution Plan

| Week | Items | Theme |
|------|-------|-------|
| **Week 1** | #1-9 | Surgical bug fixes (confirm flow, expense handling, typos) |
| **Week 2** | #4-6, 10-11, 15, 17 | New code (offline, history, icons, session, error states) |
| **Week 3** | #12-14, 16, 18 | State management (rollback, conflicts, notifications) |
| **Weeks 4-6** | #19-32 | Polish (dark mode, closures, performance) |
| **Post-trip** | #33-55 | Accessibility, design system cleanup |

---

## Files

All review artifacts are at:
`docs/reviews/2026-05-14-full-review/`

- `review_input.md` — consolidated input from 8 pre-panel agents
- `state/reviewer_*_phase_3.md` — independent reviews (4 files)
- `state/reviewer_*_phase_4.md` — confidence calibrations (4 files)
- `state/phase_5_debate_round1.md` — debate summary
- `state/phase_7_blind_finals.md` — final scores
- `state/phase_8_audit.md` — completeness audit (14 new findings)
- `state/phase_11_severity_verification.md` — severity verification table
- `state/phase_14_judge_ruling.md` — supreme judge ruling (full details)
- `../state-store-map.md` — data flow map

Screenshots: `qa-*.png` files in project root (10 screenshots across mobile/desktop/light/dark).
