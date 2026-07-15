# Phase 11: Severity Verification

**Date:** 2026-05-14
**Inputs:** Phase 5 debate synthesis, Phase 7 blind finals, source code verification

---

## Methodology

For each P0/P1 finding from the panel, I:
1. Read the actual source code at the cited location
2. Classified as [EXISTING_DEFECT] or [PLAN_RISK]
3. Verified whether the code does what the reviewer claimed
4. Checked for existing safety mechanisms
5. Assigned verified severity (P0 requires [EXISTING_DEFECT])

---

## Severity Verification Table

| # | Finding | Panel Severity | Verified? | Type | Actual Severity | Reason |
|---|---------|---------------|-----------|------|----------------|--------|
| 1 | **Confirm flow silently fails on dismiss (F1)** | P0 (CRITICAL, universal) | YES | [EXISTING_DEFECT] | **P0** | DetailModal.jsx:129 — `if (opt.value === 'conf' && st !== 'conf') { setShowExpenseCard(true); return; }` bypasses `setStatus`. If user dismisses ExpenseCard via close button, backdrop tap, or back button, status remains unchanged with no feedback. The `return` statement prevents `setStatus` on line 131 from ever executing. Bug exists right now in the primary workflow. |
| 2 | **Zero offline awareness (P0-1)** | P0 (CRITICAL) | YES | [EXISTING_DEFECT] | **P1** | Confirmed: zero `navigator.onLine` references in `/src`. No offline banner, no stale-data indicator, no write queue. However, Workbox config (vite.config.js:37-40) provides NetworkFirst with 3s timeout for Supabase API calls, so reads degrade to stale cache silently rather than failing completely. The app does not crash or show a blank screen offline -- it shows stale data. Downgrading from P0 because the Workbox safety net means the app is degraded but not broken offline. Still P1 because writes silently fail with only `console.warn`. |
| 3 | **Back-button history corruption (P0-2 / F3 / Bug #8)** | P0 -> HIGH (debate converged) | YES | [EXISTING_DEFECT] | **P1** | DetailModal.jsx:57-62 — `useEffect` depends on `[onClose]`. All three call sites (TodayPage:119, SelectPage:137, BudgetPage:127) pass `onClose={() => setSelectedItem(null)}` as an inline arrow. Each parent re-render creates a new arrow, triggering the effect, which calls `pushState` again. Cleanup removes the popstate listener but does NOT undo the `pushState`. With Supabase realtime, parent re-renders are frequent. Verified: the bug is real. Keeping at P1 (not P0) because it causes navigation friction, not data loss. Three dismiss mechanisms still work. |
| 4 | **AddItemModal has no history management (Phase 4 new)** | P1 (implied) | YES | [EXISTING_DEFECT] | **P1** | AddItemModal.jsx — no `pushState` or `popstate` handler anywhere in the component (confirmed by reading full source). DetailModal has one (line 57-62), but AddItemModal does not. Hardware back while AddItemModal is open navigates away from the app. Verified defect. |
| 5 | **`stop.sleep` typo (F8 / Bug #9)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | AddExpenseModal.jsx:75 — `{stop?.name && <span> . {stop.sleep}</span>}`. The stops table has no `sleep` column; the correct field is `stop.name` (already guarded by `stop?.name`). This renders as empty/undefined text next to a dot separator in the item list within AddExpenseModal. Trivial bug, confirmed. |
| 6 | **Expense `created_by` inconsistency (F14 / N7)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | ExpenseCard.jsx:20 — `created_by: ''` hardcoded when creating expense via the confirm flow. Compare with AddExpenseModal.jsx:32 — `created_by: userEmail` correctly set. The ExpenseCard component does not receive `userEmail` as a prop (verified: line 6 params list). Same operation, two paths, one loses the "who paid" data. Verified defect. |
| 7 | **Status sort ignores direction (F9)** | P1 | YES | [EXISTING_DEFECT] | **P1** | SelectPage.jsx:65-67 — `if (sortField === 'status') { const order = { conf: 0, sel: 1, '': 2 }; return ((order[a.status] ?? 2) - (order[b.status] ?? 2)); }`. Lines 62-64 multiply by `dir` for name/price/date. Line 67 does not multiply by `dir`. Ascending and descending status sort produce identical results. Verified, one-line fix. |
| 8 | **Delete stop orphans items (F4 / Bug #5 / Bug #12)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | useStops.js:122-129 — `deleteStop` only does `supabase.from('stops').delete().eq('id', id)`. No code clears `stop_ids` from affected items. StopSection.jsx:101 confirm dialog says "This will unlink N items" but the `deleteStop` function performs no unlinking. Items with the deleted stop's ID in their `stop_ids` array will reference a nonexistent stop, making them invisible in the Itinerary tab (which filters by stop). Items remain visible in Plan tab. Verified: misleading confirm text + data integrity issue. |
| 9 | **Expense deletion unawaited / empty catch (F2, strengthened Phase 4)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | DetailModal.jsx:130 — `for (const exp of itemExpenses) { try { deleteExpense(exp.id); } catch {} }`. `deleteExpense` is async (useExpenses.js), so calling it without `await` returns a Promise. The synchronous `try/catch` catches nothing from the async operation. Rejected promises are unhandled. `setStatus` on line 131 proceeds regardless of deletion success/failure. This can create orphaned expenses if deletion fails. Verified defect. |
| 10 | **SVG-only manifest icons (P1-1)** | P1 | YES | [EXISTING_DEFECT] | **P1** | vite.config.js:25-29 and dist/manifest.webmanifest confirm all three icon entries are SVG (`image/svg+xml`). Safari/iOS does not support SVG in web app manifests. No `apple-touch-icon` meta tag found. PWA install on iOS will fail or produce blank icon. Verified. |
| 11 | **Swipe-to-dismiss handle is decorative (P0-3)** | P0 -> P1 (debate) | YES | [EXISTING_DEFECT] | **P1** | DetailModal.jsx:109 — `<div className="detail-handle" />`. index.css:134 styles it as a visual drag handle. Zero `onTouchStart/Move/End` handlers in `/src` (confirmed via grep). Handle appears in 5 modals (DetailModal summary, DetailModal edit, ExpenseCard, AddExpenseModal, AddStopModal). Three dismiss mechanisms work (close button, backdrop, back button). False affordance but not broken functionality. P1 confirmed. |
| 12 | **Hardcoded hex colors in dark mode (F1-UI)** | P0 -> P1 (debate) | YES | [EXISTING_DEFECT] | **P1** | 32 inline hex values across 7 JSX files confirmed via grep. Key example: DetailModal.jsx:148 — `style={{ background: '#fef3c7', color: '#92400e' }}` on rating badge renders light-mode colors on dark `#161616` card backgrounds. These bypass the CSS custom property system (`var(--*)`) used elsewhere. Not app-breaking (most dark mode works), but specific elements have wrong contrast. P1 confirmed. |
| 13 | **No conflict resolution for simultaneous edits (N2)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | DetailModal.jsx:233 — `EditMode` initializes `const [draft, setDraft] = useState({...})` from `it` props. If `it` updates via realtime during editing, `draft` state is stale (React `useState` initial value is only used on mount). On save (line 269+), changes are diffed against current `it`, but the save itself uses `updateItem` which does last-write-wins. No conflict detection exists. For a 2-user app with realtime, this is a real data loss vector. Verified. |
| 14 | **No currency support for EUR trip (N3)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | useItems.js:5 — `export const $f = (n) => '$' + (n || 0).toLocaleString();`. Hardcoded `$` symbol. All expense amounts, estimated costs, and live prices display as USD. The trip is to Spain/Italy (EUR). ExpenseCard.jsx:64 and AddExpenseModal.jsx:93 also show `$` prefix on input fields. No currency field exists on expenses table per schema. Budget tracking is actively misleading for non-USD expenses. Verified. |
| 15 | **No undo/soft-delete anywhere (F5 / N4)** | P1 (HIGH) | YES | [EXISTING_DEFECT] | **P1** | Every delete operation uses `confirm()` + permanent deletion. DetailModal.jsx:215 — `if (confirm('Delete this item permanently?...')) onDelete()`. BudgetPage.jsx:71 — unlinked expense delete has NO confirm at all (just `onClick={() => deleteExpense(e.id)}`). useItems.js:165 — `deleteItem` removes from UI immediately and cascades through expenses, place_cache, and storage. No soft-delete flag, no undo mechanism. Verified. The BudgetPage unlinked expense case is worse than reported: zero confirmation before permanent deletion. |
| 16 | **No focus-visible styles (F7-UI)** | P1 | YES | [EXISTING_DEFECT] | **P2** | Confirmed zero `:focus-visible` rules in CSS via grep. Real WCAG 2.4.7 violation. However, downgrading to P2 because: (a) 2 known sighted users on touch devices, (b) focus rings primarily affect keyboard navigation which is not the primary interaction mode for a mobile PWA. The defect exists but impact is low for this specific app and user base. |

---

## Summary

- **15 P0/P1 findings verified** against source code
- **All 15 confirmed as [EXISTING_DEFECT]** -- every finding is a real bug in the current codebase, not a speculative risk
- **1 finding kept at P0:** Confirm flow dismiss bug (F1) -- the app's core workflow silently fails
- **1 finding downgraded P0 -> P1:** Offline awareness -- Workbox provides partial safety net for reads
- **1 finding downgraded P1 -> P2:** Focus-visible styles -- real violation but minimal impact for 2 sighted mobile users
- **13 findings confirmed at P1**

### Key observations from verification:
1. The panel was accurate. Every cited code path was verified. No false positives.
2. The debate's severity calibration was sound. The two P0-to-P1 downgrades (dark mode colors, swipe handle) were correct.
3. The only P0 I would override from the debate is offline awareness: the Workbox config provides a meaningful partial safety net that the reviewers underweighted.
4. BudgetPage.jsx:71 unlinked expense delete with zero confirmation is worse than the panel described -- they discussed "no undo" generally but this specific path has no `confirm()` guard at all.
