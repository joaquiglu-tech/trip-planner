# Rules for features/ (pages & feature modules)

Applies to `src/features/**` — the tab-level pages and their sub-components
(itinerary, plan, expenses, auth).

- Pages are thin: they read data via the `useTrip*` hooks (or feature hooks) and hand off to
  presentational components. No direct Supabase calls inline.
- Keep each feature self-contained under its folder; shared UI belongs in `src/shared/components/`.
- Status changes save immediately; form fields batch-save (Save/Cancel). Preserve that split.
- Item numbering is frontend-computed from sorted order and shared between schedule cards and
  map markers — don't fork the numbering logic.
- Mobile-first: this runs in an Android phone browser. Design for small viewports and touch.
