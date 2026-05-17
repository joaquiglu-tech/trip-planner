# Anisita Full Review — Panel Input Document

## Project Overview
Anisita is a trip planner PWA (React 19 + Vite 8 + Supabase + Vercel) for two users planning a Spain/Italy trip (Jul 12 - Aug 2, 2026). 4-tab app: Itinerary, Plan, Expenses, Profile. ~100 items, 16 stops, 7 confirmed expenses.

**URL:** https://trip-planner-app-sable.vercel.app
**Stack:** React 19, Vite 8, Supabase (Postgres + Auth + Realtime), Vercel, Google Maps/Places API, Xotelo (live hotel prices)

## Source Files Under Review
All source code is at: `/Users/Joaquin1/Documents/Trip Planner/trip-planner-app/src/`

Key files:
- `shared/hooks/TripContext.jsx` — Dual context provider (data + actions)
- `shared/hooks/useItems.js` — Items CRUD + realtime (190 lines)
- `shared/hooks/useStops.js` — Stops CRUD + realtime (132 lines)
- `shared/hooks/useExpenses.js` — Expenses CRUD + realtime (61 lines)
- `shared/hooks/useLivePrices.js` — Xotelo price fetching + DB writeback (80 lines)
- `shared/hooks/usePlaceData.js` — Google Places lazy fetch + caching (37 lines)
- `shared/hooks/useItemFiles.js` — File management for confirmed items (39 lines)
- `shared/components/DetailModal.jsx` — Item detail modal, edit mode, expenses (537 lines)
- `shared/components/ExpenseCard.jsx` — Expense create/edit/delete (115 lines)
- `features/itinerary/TodayPage.jsx` — Itinerary tab
- `features/plan/SelectPage.jsx` — Plan tab with filters
- `features/expenses/BudgetPage.jsx` — Expenses tab
- `shared/modals/AddItemModal.jsx`, `AddStopModal.jsx`, `AddExpenseModal.jsx`
- `index.css` — Single CSS file (563 lines)

## Data Flow Map (Phase 2 substitute)
See: `/Users/Joaquin1/Documents/Trip Planner/trip-planner-app/docs/reviews/state-store-map.md`

## Pre-Existing Agent Findings

### A. Click-Path Audit (4 agents, 34 bugs)

**CRITICAL:**
1. Clicking "Confirmed" opens ExpenseCard but never sets status if user closes without saving (DetailModal.jsx:129) — 3 agents independently flagged this
2. Stale closure in setStatus — reads captured `items` array for stay deselection logic (useItems.js:112-128)
3. Double vibrate on status change — both DetailModal:128 and useItems:113 call navigator.vibrate

**HIGH:**
4. conf→sel expense deletion is fire-and-forget — no `await`, errors swallowed with empty catch (DetailModal.jsx:130)
5. Delete stop orphans items — stop_ids not cleaned up (StopSection.jsx:99-102)
6. Only first expense visible in ExpenseCard — phantom expenses invisible (DetailModal.jsx:220)
7. Expense created before status set to conf — inconsistent on failure (ExpenseCard.jsx:20-21)
8. onClose inline arrow causes stacked history entries — back button trap (DetailModal.jsx:57-62)
9. AddExpenseModal shows `stop.sleep` instead of `stop.name` — wrong field (AddExpenseModal.jsx:75)
10. addStop captures stale `stops` closure — duplicate sort_order on rapid add (useStops.js:102)
11. Today auto-navigate fails — stops not loaded when useState initializes (TodayPage.jsx:21)
12. Delete stop shows "unlink" warning but actually abandons items (StopSection.jsx:99-102)

**MEDIUM:**
13. selectedItem stale closure for onDelete created_by check (SelectPage.jsx:138)
14. filterCity useEffect missing dep, re-applies on tab switch (SelectPage.jsx:17-22)
15. Status sort ignores direction variable (SelectPage.jsx:65-68)
16. combinedStopIds array created inline causes unnecessary recomputation (StopSection.jsx:50)
17. getPlaceData not in useEffect deps — low-risk staleness (DetailModal.jsx:64-69)
18. Cannot clear estimated_cost to 0 by emptying field (DetailModal.jsx:280-281)
19. selectedExpense holds stale item/stop snapshots in BudgetPage (BudgetPage.jsx:36)
20. Unlinked expense delete: no confirmation, no error handling (BudgetPage.jsx:71)
21. Deleting expense doesn't prompt about reverting conf status (ExpenseCard.jsx:33-43)
22. Xotelo status shows "found" when estimate is null — misleading (AddItemModal.jsx:60)
23. Transport mode + rental toggle can desync (AddItemModal.jsx:164-170)
24. AddExpenseModal back button doesn't reset amount/note (AddExpenseModal.jsx:106)
25. No date validation in AddStopModal — end_date < start_date allowed (AddStopModal.jsx:122)

**LOW:**
26. Edit mode backdrop click does nothing (DetailModal.jsx:316)
27. Expense created_by always empty string (ExpenseCard.jsx:20)
28. Recent activity rows not tappable (OverviewView.jsx:70)
29. PlaceSearch onBlur setTimeout race with fast re-focus (PlaceSearch.jsx:96)
30. TopBar progress counts cities not stops (TopBar.jsx:2-6)

### B. Browser QA (live Playwright testing)

**Console Errors (62 total):**
- Xotelo CORS errors (56) — All data.xotelo.com/api/rates calls blocked. Live hotel prices not loading.
- Google Directions API not authorized (6) — Route rendering fails on transport items.

**Visual QA:**
- Light mode: clean, consistent across all tabs at 375px and 1440px
- Dark mode: well-implemented, good contrast throughout
- DetailModal: photo carousel, badges, status selector all render correctly
- Stop view: map + numbered schedule + plan section working
- No visual regressions observed

### C. Design System Audit — Score: 72/100

| Dimension | Score | Key Issue |
|-----------|-------|-----------|
| Color consistency | 8/10 | 118 inline styles with hardcoded hex values bypass dark mode |
| Typography | 7/10 | 13 distinct font sizes with no clear scale |
| Spacing | 7/10 | Soft rhythm (not strict 4px/8px scale), inline overrides |
| Components | 8/10 | Good reuse (ItemCard, DetailModal shared), two empty-state patterns |
| Responsive | 7/10 | 4 breakpoints, no max-width on wide screens |
| Dark mode | 8/10 | Good coverage, but inline hex colors don't adapt |
| Animation | 7/10 | Purposeful, prefers-reduced-motion supported, no exit animations |
| Accessibility | 5/10 | No focus styles, contrast failures, no focus trap |
| Info density | 8/10 | Clean, progressive disclosure with details/summary |
| Polish | 7/10 | Uses native alert()/confirm(), no error boundary |

No AI slop detected. Design is intentional Linear/Vercel-inspired minimal.

### D. Accessibility Audit — 22 violations

**P0 Critical (5):**
- No focus trap in any modal (5 modals)
- Toast invisible to screen readers (no role/aria-live)
- div-as-button in BudgetPage (not focusable, no keyboard)
- AddItemModal/AddStopModal/AddExpenseModal missing role="dialog"
- Close buttons missing aria-label in 3 modals

**P1 High (7):**
- FAB menu has no keyboard support or ARIA
- Place search results not accessible as listbox
- No <main> landmark
- Missing section labels/ARIA on filters
- Color contrast failures (--text-muted #999 on white = 2.85:1)
- File delete buttons too small (14x14px)
- progressbar missing aria-valuemin/max

**P2 Medium (7):** Form labels not associated, status relies on color alone, heading hierarchy flat, confirm() dialogs, carousel dots not labeled
**P3 Low (3):** No skip link, lang attribute, external link indication

### E. Database Review — 12 issues

**Critical:**
- Missing ON DELETE CASCADE on expenses.item_id and place_cache.item_id
- Likely missing RLS policies on stops and place_cache tables
- useLivePrices writes to items table bypassing useItems (dual write path)

**High:**
- Optimistic updates without rollback (updateItem, updateStop)
- Missing indexes on expenses.item_id, place_cache.item_id
- Race condition: realtime INSERT + local addItem can create duplicates
- Google API key exposed in client-side photo URLs

### F. Performance Review — 10 issues

**P0:**
- useTrip() merges both contexts — every page re-renders on any data change
- getPlaceData has `places` in useCallback deps — destabilizes actions context
- useItemFiles inline computed dependency

**P1:**
- setStatus closes over items — unstable action callback
- addStop closes over stops — same
- No React.memo on any list component (100+ items)

**P2:**
- Silent failures (console.warn without user feedback)
- Duplicate stops fetch (useItems and useStops both query stops)
- O(n*m) expense-to-item join in BudgetPage
- Timer not cleared on unmount in DetailModal

## Screenshots
Available at project root:
- qa-mobile-itinerary.png, qa-mobile-plan.png, qa-mobile-expenses.png
- qa-desktop-itinerary.png, qa-desktop-plan.png
- qa-desktop-itinerary-dark.png, qa-desktop-plan-dark-proper.png
- qa-desktop-rome-stop-dark.png, qa-desktop-detail-modal-dark.png
- qa-mobile-detail-modal-dark.png
