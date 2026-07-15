# Anisita — Trip Planner PWA

## What this is

A personal PWA (Android, browser-based — no app-store build) for planning a trip and
tracking everything about it in one place: expenses, itinerary, receipts, and reservations.
Solo project. Work happens as **new features and fixes** on an already-built app, often
driven from a phone.

> **Working context — phone-first (non-negotiable).** This project is driven almost entirely
> from an Android phone via Claude Code on the web/mobile. Every choice must assume that:
>
> - No in-session browser — no Playwright/e2e here. Claude runs unit/integration tests + lint;
>   smoketests happen in the real app on the phone. Don't ask the human to run desktop-only tooling.
> - Keep work reviewable on a small screen: small diffs, small commits, small PRs, clear summaries.
> - **New sessions start on `main`** (the default branch). Anything that must be available in the
>   next session — tooling, `.claude/` config, plugins — has to be **merged to `main`**, not left on
>   a feature branch (the phone UI can't reliably check out an arbitrary branch).
> - Prefer doing the mergeable, low-friction thing over multi-step flows that are painful to drive
>   from a phone.

## Tech Stack

- React 19 + Vite 8 (JavaScript, no TypeScript)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel (auto-deploys from main)
- @vis.gl/react-google-maps (Google's official React wrapper)
- Google Maps JavaScript API + Places API (New)
- Xotelo API (live hotel prices from Booking.com/Expedia/Agoda)

## How we work (non-negotiable)

- **Plan before code.** Anything bigger than a one-sentence diff: explore → plan → code → verify → commit.
- **Build in vertical slices.** One complete end-to-end capability at a time; finish and commit before the next.
- **Verify every change.** End each task with the checks the environment can run — tests + lint passing. "Looks done" is not done.
- **Tests ship with the code.** Any functionality you create or change includes its tests in the same change.
- **Small diffs, commit per slice.** Keep rollback trivial.
- **The repo is the memory.** Persist decisions to `docs/`. Treat each session as disposable.
- **Phone-driven reality:** no browser is available in-session, so no Playwright/e2e here. Claude runs unit/integration tests + lint; the human runs smoketests in a real browser.

## Guardrails (always)

- **Never commit directly to `main`.** `main` is production (Vercel auto-deploys it) — see Git Workflow.
- Never hand-edit database migrations. Generate them (Supabase) and review the SQL.
- Do not edit `.env`, secrets, or files under `supabase/migrations/` directly.
- Every non-trivial diff gets an adversarial review (built-in `/code-review`); risky areas (auth, expense/currency math, PII, data model) also get a careful human read.
- Quality gates (tests + lint) must pass before a task is "done" — the Stop hook enforces this.

## Commands

- Run app (dev): `npm run dev`
- Build: `npm run build`
- Run all tests: `npm test` (vitest run)
- Watch tests: `npm run test:watch`
- Run a single test: `npx vitest run src/test/utils.test.js`
- Lint: `npm run lint` (eslint)

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
  test/             — 8 test files
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

## The build workflow (per feature / per fix)

The **execution layer is Superpowers**, bundled as repo files under `.claude/skills/` (same
mechanism as the `bmad-*` skills). Invoke each by its bare skill name. Not every step every
time — scale to the change.

1. **Brainstorm** (`brainstorming`) — refine a rough idea through questions, explore alternatives.
2. **Plan** (`writing-plans`) — break work into small tasks with exact file paths and verification. Plans land in `docs/superpowers/plans/`.
3. **Build** (`subagent-driven-development`) — fresh subagent per task with two-stage review. `executing-plans` is the batched alternative.
4. **TDD** (`test-driven-development`) — RED → GREEN → REFACTOR.
5. **Debug** (`systematic-debugging`) — four-phase root-cause analysis.
6. **Review** (built-in `/code-review` + `requesting-code-review`) — adversarial pass before merge. Add `/security-review` for risky areas (auth, expense math, PII).

BMAD skills complement this loop: `bmad-spec` (formal spec contract), `bmad-investigate` (deep
forensic tracing when a bug outgrows systematic-debugging), `bmad-correct-course` (scope changed
mid-flight), `bmad-retrospective`, plus doc utilities.

## Frameworks & skills

- **Superpowers** (BUNDLED under `.claude/skills/`, vendored from obra/superpowers-marketplace):
  the execution loop above — `brainstorming`, `writing-plans`, `subagent-driven-development`,
  `executing-plans`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`,
  `receiving-code-review`, `verification-before-completion`, `using-git-worktrees`,
  `dispatching-parallel-agents`, `finishing-a-development-branch`, `using-superpowers`,
  `writing-skills`. Bundled as repo files (not a plugin) so they load at every session start on
  web/mobile — the plugin path doesn't reliably load in fresh cloud sessions. To update: re-vendor
  the folders from the marketplace and commit.
- **BMAD** (bundled under `.claude/skills/bmad-*`, config in `_bmad/`) — 10 skills that don't
  overlap Superpowers: `bmad-spec`, `bmad-investigate`, `bmad-correct-course`, `bmad-retrospective`,
  `bmad-document-project`, `bmad-generate-project-context`, `bmad-shard-doc`, `bmad-index-docs`,
  `bmad-help`, `bmad-customize`.
- **Harness built-ins** (in every session): `code-review`, `security-review`, `verify`, `run`, `simplify`.
- Superpowers writes plans/specs to `docs/superpowers/plans/` and `docs/superpowers/specs/` (already in use).
- On this brownfield app, a good first move is `bmad-document-project` + `bmad-generate-project-context`
  so Claude has an accurate model of the existing code.

## Conventions

- **Data access:** goes through `src/services/` (supabase, googlePlaces, hotelPrices, xotelo, enrichItem, storage) — keep queries out of components.
- **Components** stay presentational; data flows in via props or the `useTrip*` hooks. No direct DB calls in components.
- **Shared domain logic** (cost/currency, date/itinerary math) lives in one place — never duplicate a rule across files.
- **Tests** colocated in `src/test/` as `*.test.js`.
- **Component reuse:** before creating any UI element, check existing components and reuse the pattern. Keep spacing/typography consistent. Mobile-first — the app runs in a phone browser.

## Git Workflow

- **`main` = production.** Never committed to directly; only updated by merging a PR. Vercel auto-deploys `main`.
- **`dev` = integration branch.** Day-to-day work lands here. Small/safe changes can go straight to `dev`; anything non-trivial gets a short feature branch (`feat/…`, `fix/…`) → PR **into `dev`**.
- **Release = PR from `dev` → `main`.** That's the only path to production, so every prod change is reviewed and green before it deploys.
- Vercel builds a preview deploy for `dev` and every PR — use it for smoketests.
- Build: `npm run build` | Test: `npm test` (vitest run)

## Compaction policy

When compacting, always preserve: the list of modified files, the current spec/task, the test
commands, and any decision not yet written to `docs/`.
