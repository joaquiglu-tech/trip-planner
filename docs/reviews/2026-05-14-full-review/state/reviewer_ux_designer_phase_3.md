# UX Design Review -- Anisita Trip Planner PWA

**Reviewer:** UX Designer
**Date:** 2026-05-14
**Scope:** User flows, cognitive load, error recovery, feedback quality
**Overall Score: 6/10**

---

## Score Justification

The app has a thoughtful information architecture and a clean visual language. The three-tab structure (Itinerary/Plan/Expenses) maps well to distinct user goals. Progressive disclosure in the DetailModal is well done -- showing only populated fields in summary mode and everything in edit mode. The status workflow (not added -> selected -> confirmed) is a sound mental model for trip planning.

However, the app has several flow-breaking UX bugs that would leave users confused or stuck, particularly around the confirm-status-to-expense pipeline, error recovery, and destructive actions. The reliance on native `alert()` and `confirm()` dialogs undermines the otherwise polished visual design and prevents the app from communicating context (like what will happen to linked data).

---

## Top Findings

### P0 -- Flow-breaking issues

**F1. Clicking "Confirmed" opens ExpenseCard but never sets status if user dismisses**
- File: `src/shared/components/DetailModal.jsx:129`
- When a user taps "Confirmed", the code does `setShowExpenseCard(true); return;` -- it opens the expense card but does not set the status. If the user closes the ExpenseCard without saving (tapping backdrop or X), the item remains in its previous status with no feedback about what happened. The user sees the status selector snap back. This is the primary conversion flow for the app (selecting -> confirming an item) and it silently fails.
- **Impact:** Users will think "Confirmed" is broken. They have to understand an implicit contract: "fill in the expense to complete confirmation." Nothing in the UI communicates this.
- **Fix:** Either (a) set status to 'conf' immediately when clicking Confirmed, then optionally prompt for expense, or (b) show explicit instructional text in the ExpenseCard like "Enter the amount to confirm this booking" and handle the dismiss case by reverting or prompting.

**F2. Expense deletion on status downgrade is fire-and-forget with swallowed errors**
- File: `src/shared/components/DetailModal.jsx:130`
- When moving from conf to sel/none, expenses are deleted in a `for` loop with `try {} catch {}` (empty catch). If any deletion fails, the user has no idea. The status change proceeds, but the expense may still exist in the database, creating a data inconsistency the user cannot see or fix.
- **Impact:** Users lose money tracking data silently. The app's core value proposition -- expense tracking -- becomes unreliable.
- **Fix:** Await all deletions, show error if any fail, and do not change status until deletions succeed. Or at minimum, show a toast on failure.

**F3. Back button trap from DetailModal history manipulation**
- File: `src/shared/components/DetailModal.jsx:57-62`
- The modal pushes a history entry on mount with `window.history.pushState`. If `onClose` is an inline arrow (which it is in all three pages: `() => setSelectedItem(null)`), React re-creates it on every render. The `useEffect` has `[onClose]` as a dependency, so it re-runs, pushing duplicate history entries. Pressing back multiple times does nothing visible because each press pops one of the stacked entries, all calling the same close handler on an already-closed modal.
- **Impact:** Users pressing back repeatedly after closing a modal will find they cannot navigate backward through the app. This is a fundamental mobile PWA interaction pattern that is broken.
- **Fix:** Remove `onClose` from the useEffect dependency array, or wrap onClose in useCallback at the call site, or use a ref for the close handler.

**F4. Delete stop says "unlink" but actually orphans items**
- File: `src/features/itinerary/StopSection.jsx:99-102`
- The confirm dialog says "This will unlink N items" but `deleteStop` does not actually update the items' `stop_ids` to remove the deleted stop ID. Items retain a reference to a stop that no longer exists. These items become invisible in the Itinerary tab (which groups by stop) and can only be found via the Plan tab.
- **Impact:** Users lose items they may have carefully curated. The confirm dialog actively misleads them about the consequence.
- **Fix:** `deleteStop` should cascade-clear `stop_ids` from affected items, or the UI should list affected items and require explicit acknowledgment.

### P1 -- Significant usability issues

**F5. No undo for destructive actions anywhere in the app**
- Files: `DetailModal.jsx:215`, `StopSection.jsx:99-102`, `ExpenseCard.jsx:33-43`, `BudgetPage.jsx:71`
- Every delete action uses `confirm()` followed by permanent deletion. There is no undo, no soft-delete, no grace period. The native confirm dialog is also jarring on mobile -- it breaks out of the app's design language and is easy to tap accidentally.
- **Impact:** One mis-tap permanently destroys data. For a collaborative trip planner where two people are editing, this is high risk.
- **Fix:** Implement toast-based "Undo" for deletions (soft-delete with a 5s window), or at minimum replace `confirm()` with an in-app confirmation modal that matches the design system.

**F6. Unlinked expense delete has no confirmation**
- File: `src/features/expenses/BudgetPage.jsx:71`
- The unlinked expense delete button is a tiny "delete" text link with an inline `onClick={() => deleteExpense(e.id)}`. No confirmation. No error handling. No undo.
- **Impact:** Easy accidental deletion of financial data.
- **Fix:** Add at minimum a confirm step, preferably a toast-based undo.

**F7. ExpenseCard only shows first expense per item; phantom expenses invisible**
- File: `src/shared/components/DetailModal.jsx:220`
- `(itemExpenses || [])[0] || null` -- only the first expense is passed to ExpenseCard. If somehow multiple expenses exist for an item (possible via race conditions or direct DB edits), the user cannot see, edit, or delete the extras.
- **Impact:** Money tracking inaccuracy. Users may wonder why their totals don't add up.
- **Fix:** Show a list of expenses when multiple exist, or enforce the 1:1 constraint at the DB level and handle the edge case in the UI.

**F8. AddExpenseModal shows `stop.sleep` instead of `stop.name`**
- File: `src/shared/modals/AddExpenseModal.jsx:75`
- The code reads `{stop?.name && <span> . {stop.sleep}</span>}`. It checks for `stop.name` truthiness but renders `stop.sleep`, which is likely undefined for most stops. Users see blank metadata or "undefined" next to expense items.
- **Impact:** Confusing display in the expense creation flow. Minor but sloppy.
- **Fix:** Change `stop.sleep` to `stop.name`.

**F9. Status sort ignores direction**
- File: `src/features/plan/SelectPage.jsx:65-68`
- The sort comparison for status does not multiply by `dir`. Ascending and descending produce the same order. Users toggling sort direction for status see no change.
- **Impact:** Broken user expectation. The sort control appears non-functional for this option.
- **Fix:** Add `* dir` to the status sort return value.

**F10. Today auto-navigate fails on first load**
- File: `src/features/itinerary/TodayPage.jsx:21`
- `getTodayDayIndex(stops)` runs during `useState` initialization, but stops may not be loaded yet. If stops arrive after the initial render, `todayIdx` is `null` and the view defaults to 'overview'. During the actual trip, the user would expect to land on today's stop.
- **Impact:** During the trip, the main value of the Itinerary tab -- showing today's plan -- fails silently.
- **Fix:** Use a useEffect to update view when stops load and todayIdx becomes available.

### P2 -- Moderate usability issues

**F11. Cannot clear estimated_cost to 0 by emptying the field**
- File: `src/shared/components/DetailModal.jsx:280-281`
- `const ec = parseFloat(draft.estimated_cost); if (!isNaN(ec) && ec !== (Number(it.estimated_cost) || 0))` -- if the user clears the field, `parseFloat('')` returns NaN, so the change is never saved. A user who wants to remove an incorrect estimate cannot do so.
- **Impact:** Frustrating data correction scenario.
- **Fix:** Treat empty string as explicit 0 and include it as a change.

**F12. Edit mode backdrop click does nothing**
- File: `src/shared/components/DetailModal.jsx:316`
- In edit mode, the overlay div has no `onClick={onClose}`. If a user taps outside the modal sheet while editing, nothing happens. This breaks the established pattern from summary mode where backdrop click closes. Users may think the app is frozen.
- **Impact:** Inconsistent interaction pattern within the same component.
- **Fix:** Add backdrop click handler that either closes (with unsaved changes warning) or explicitly shows "tap Cancel to exit."

**F13. Toast is invisible to screen readers**
- File: `src/shared/components/Toast.jsx`
- The Toast component renders a plain `<div>` with no `role="status"` or `aria-live` attribute. State changes communicated via toast (like "Ania updated Hotel Smeraldo") are invisible to assistive technology users.
- **Impact:** Accessibility violation; collaborative features are inaccessible.
- **Fix:** Add `role="status"` and `aria-live="polite"` to the toast container.

**F14. Expense `created_by` always empty string**
- File: `src/shared/components/ExpenseCard.jsx:20`
- When creating a new expense from DetailModal's confirm flow, `created_by: ''` is hardcoded. The ExpenseCard never knows who paid. The "Paid by" row in the expense detail only shows if `expense.created_by` is truthy, so it's always hidden for expenses created this way.
- **Impact:** For a two-person trip, knowing who paid is essential for splitting costs. This data is lost.
- **Fix:** Pass the current user's email through to the ExpenseCard creation flow.

**F15. Deleting an expense does not prompt about reverting confirmed status**
- File: `src/shared/components/ExpenseCard.jsx:33-43`
- A user can delete the expense on a confirmed item without any indication that the item should perhaps be reverted to 'selected' status. The item stays "confirmed" with $0 in expenses.
- **Impact:** Data inconsistency that confuses the budget view.
- **Fix:** After expense deletion, prompt or automatically revert status to 'sel', or at least show a warning.

### P3 -- Minor issues

**F16. Native alert() for save errors breaks design language**
- Files: `DetailModal.jsx:306`, `AddItemModal.jsx:96`, `AddExpenseModal.jsx:36`
- All save error paths use `alert()`. This is jarring on mobile and provides no actionable guidance.
- **Fix:** Use the existing toast system for errors, with a retry option.

**F17. Double vibrate on status change**
- Files: `DetailModal.jsx:128`, `useItems.js:113` (per review input)
- Both the UI layer and the hook layer call `navigator.vibrate(15)`. The user feels two quick buzzes for one action.
- **Fix:** Remove the vibrate call from one layer.

**F18. Recent activity rows not tappable**
- File: `src/features/itinerary/OverviewView.jsx:70`
- The recent activity list shows item names but clicking them does nothing. Users will naturally try to tap an item name to see its details.
- **Fix:** Add `onClick={() => onItemTap(r)}` and `cursor: pointer` to the row.

---

## What the App Does Well

1. **Information architecture is solid.** The three-tab split (Itinerary for time-based view, Plan for catalog/filtering, Expenses for money) maps to distinct user goals without overlap. The Overview landing page with destination cards is a strong entry point.

2. **Progressive disclosure in DetailModal.** Summary mode shows only populated fields and read-only API data. Edit mode reveals everything. This reduces cognitive load significantly for a 46-column data model. The section grouping (Basic, Stops, Type-specific, Schedule, Pricing, Links, Notes) is logical.

3. **Status workflow mental model.** The three-state status (not added -> selected -> confirmed) with visual color coding (neutral/purple/green) is intuitive and carries through consistently from cards to badges to map markers to budget sections.

4. **Collaborative features.** Real-time updates with toast notifications ("Ania booked Hotel Smeraldo") create a sense of shared planning. The system handles concurrent edits gracefully for the happy path.

5. **Smart defaults and auto-enrichment.** Google Places auto-fetch for photos/ratings/hours, Xotelo live hotel prices, auto-generated transport routes from origin/dest -- these reduce manual data entry substantially.

6. **Responsive layout works.** The single-column mobile layout transitions cleanly to two-column grids on tablet/desktop. The bottom tab bar respects safe area insets. The scroll-snap photo carousel degrades gracefully.

7. **Dark mode implementation.** CSS custom properties with proper dark theme values. The design tokens are well-structured. Contrast is good in dark mode.

8. **Empty states exist.** The app handles zero-data scenarios with helpful messages ("No items found -- try adjusting your filters"). Not all empty states have CTAs, but the important ones do.

---

## Recommendation: APPROVE_WITH_FIXES

The app is usable for its target audience (two users planning a specific trip) and the visual design is clean. However, the P0 issues around the confirm-to-expense flow (F1), silent expense deletion (F2), and the back button trap (F3) need to be fixed before this is reliable for actual trip planning with real money. The stop deletion data loss (F4) is also a must-fix.

Minimum fixes before relying on this for the Jul-Aug 2026 trip:
- F1: Fix the confirm status flow so users understand what happened
- F2: Handle expense deletion errors visibly
- F3: Fix the history stack manipulation
- F4: Actually clean up items when deleting a stop
- F8: Fix the `stop.sleep` typo
- F9: Fix status sort direction
- F14: Pass user email to expense creation from DetailModal

The P2 and P3 issues are polish items that can be addressed incrementally.
