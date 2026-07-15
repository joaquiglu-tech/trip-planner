# Rules for shared domain logic & utilities

Applies to pure helpers (e.g. `src/features/itinerary/utils`, cost/date math shared across features).

- Pure and side-effect-free: no Supabase clients, no `fetch`, no imports from service modules.
- Single source of truth for domain rules (expense/currency math, date/itinerary logic,
  sort/grouping order). Never hardcode the same threshold or rule in two places.
- Tests colocated in `src/test/` as `*.test.js`, covering the edge cases (empty trips, missing
  dates, multi-stop items, currency rounding).
