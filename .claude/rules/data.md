# Rules for data access (Supabase & external APIs)

Applies to `src/services/**` (supabase, googlePlaces, hotelPrices, xotelo, enrichItem, storage).

- All DB/storage/API access goes through `src/services/` — never scatter Supabase clients or
  raw fetches across components/hooks.
- Never hand-edit migrations. Generate them and review the SQL before applying. `.env` and
  secrets are off-limits (the protect-paths hook blocks them).
- On writes, only set the columns you own; preserve columns owned by other flows.
  `estimated_cost` is read-only here — it's written by `useLivePrices` from Xotelo, not by forms.
- Expenses are the source of truth for payments (max 1 expense per item). Don't derive payment
  state from anywhere else.
- Xotelo flow: TripAdvisor URL → extract key → live prices → DB writeback. Keep the key
  extraction and writeback in the service layer.
