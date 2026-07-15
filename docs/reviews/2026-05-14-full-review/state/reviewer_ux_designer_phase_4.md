# UX Designer -- Phase 4: Confidence Calibration

**Reviewer:** UX Designer
**Date:** 2026-05-14

---

## Finding-by-Finding Re-verification

### F1. Clicking "Confirmed" opens ExpenseCard but never sets status if user dismisses
- **Line cited:** `DetailModal.jsx:129`
- **Actual code (line 129):** `if (opt.value === 'conf' && st !== 'conf') { setShowExpenseCard(true); return; }`
- **Verified:** Yes, exactly as described. The `return` prevents `setStatus` from being called. The ExpenseCard's `onClose` (line 223) is `() => setShowExpenseCard(false)` -- no status change on dismiss. However, I should note: if the user *saves* the expense, `ExpenseCard.handleSave` (line 21) does call `setStatus(item.id, 'conf')`. So the flow works when completed, but silently aborts when dismissed.
- **Confidence: HIGH**

### F2. Expense deletion on status downgrade is fire-and-forget with swallowed errors
- **Line cited:** `DetailModal.jsx:130`
- **Actual code (line 130):** `for (const exp of itemExpenses) { try { deleteExpense(exp.id); } catch {} }`
- **Verified:** Yes, empty catch block confirmed. The `deleteExpense` calls are not awaited either -- they're fire-and-forget promises. Status change proceeds on line 131 regardless.
- **Confidence: HIGH**

### F3. Back button trap from DetailModal history manipulation
- **Line cited:** `DetailModal.jsx:57-62`
- **Actual code:** `useEffect(() => { window.history.pushState(...); ... }, [onClose]);`
- **Verified:** The dependency array is `[onClose]`. All three call sites (TodayPage:119, SelectPage:137, BudgetPage:127) pass inline `() => setSelectedItem(null)`. This creates a new function reference each render, causing the effect to re-run and push duplicate history entries.
- **HOWEVER:** On re-read, the cleanup function `return () => window.removeEventListener('popstate', handlePop)` runs before each re-execution, so the listener doesn't stack. The real issue is the repeated `pushState` calls. Each re-render pushes another history entry. When the user closes the modal and presses back, they pop through these phantom entries -- but each pop fires `handlePop` which calls `onClose` on an already-unmounted component (since cleanup removes the listener on unmount... wait, no: cleanup runs before re-execution *and* on unmount).
- **Revised assessment:** The pushState stacking is real, but the severity depends on how many re-renders occur while the modal is open. If the parent re-renders frequently (e.g., realtime updates changing items), many entries stack. If the parent is stable, only 1-2 entries exist. The bug is real but the "fundamental mobile PWA interaction pattern that is broken" phrasing may overstate it for this specific app's usage pattern.
- **Confidence: MEDIUM** (bug exists, severity may be overstated)

### F4. Delete stop says "unlink" but actually orphans items
- **Line cited:** `StopSection.jsx:99-102`
- **Actual code (line 99-101):** `const itemCount = items.filter(it => itemInStop(it, stop.id)).length; if (confirm('Delete ${stop.name}? ${itemCount > 0 ? 'This will unlink ${itemCount} items.' : ''} This cannot be undone.')) { deleteStop(stop.id); ...`
- **deleteStop (useStops.js:122-129):** Only deletes from the `stops` table. No cascade to items' `stop_ids`.
- **Verified:** Confirmed. `deleteStop` does `supabase.from('stops').delete().eq('id', id)` with no cleanup of items. Items retain the deleted stop's ID in their `stop_ids` array. They become orphaned from the itinerary view which groups by stop.
- **However:** Items are still visible in the Plan tab (SelectPage) which doesn't filter by stop. So "invisible" is too strong -- they're invisible in Itinerary but findable in Plan. The confirm dialog does say "unlink" which is misleading since nothing is unlinked.
- **Confidence: HIGH**

### F5. No undo for destructive actions anywhere in the app
- **Verified:** All delete paths use `confirm()` + permanent delete. No soft-delete pattern exists anywhere.
- **Confidence: HIGH** (but this is a design recommendation, not a bug per se)

### F6. Unlinked expense delete has no confirmation
- **Line cited:** `BudgetPage.jsx:71`
- **Actual code (line 71):** `<button onClick={() => deleteExpense(e.id)} style={{...}}>delete</button>`
- **Verified:** Confirmed. No `confirm()`, no error handling, no undo. Direct delete on click.
- **Confidence: HIGH**

### F7. ExpenseCard only shows first expense per item; phantom expenses invisible
- **Line cited:** `DetailModal.jsx:220`
- **Actual code (line 221):** `expense={(itemExpenses || [])[0] || null}`
- **Verified:** Only first expense is passed. However, the CLAUDE.md says "1 expense per item max" is a design decision. The concern about "race conditions or direct DB edits" creating multiples is speculative. If the 1:1 constraint is enforced at the application layer (and it appears to be -- ExpenseCard creates with `item_id`), phantom expenses are unlikely in practice.
- **Confidence: LOW** (the code is as cited, but the scenario is unlikely given the architecture)

### F8. AddExpenseModal shows `stop.sleep` instead of `stop.name`
- **Line cited:** `AddExpenseModal.jsx:75`
- **Actual code (line 75):** `{stop?.name && <span> · {stop.sleep}</span>}`
- **Verified:** Confirmed exactly. Checks `stop?.name` truthiness but renders `stop.sleep`. The `sleep` field likely doesn't exist on the stop object (stops table has: name, start_date, end_date, coords, google_place_id, tips). This will render as empty or "undefined".
- **Confidence: HIGH**

### F9. Status sort ignores direction
- **Line cited:** `SelectPage.jsx:65-68`
- **Actual code (lines 65-67):** `if (sortField === 'status') { const order = { conf: 0, sel: 1, '': 2 }; return ((order[a.status] ?? 2) - (order[b.status] ?? 2)); }`
- **Verified:** Confirmed. No `* dir` applied. Compare with line 62-64 where `name`, `price`, and `date` all apply `* dir`. Status sort always returns the same order regardless of asc/desc toggle.
- **Confidence: HIGH**

### F10. Today auto-navigate fails on first load
- **Line cited:** `TodayPage.jsx:21`
- **Actual code (line 19-21):** `const todayIdx = getTodayDayIndex(stops);` then `const [view, setView] = useState(isDuringTrip ? { type: 'stop', idx: todayIdx } : 'overview');`
- **Verified:** `getTodayDayIndex(stops)` runs during render. `stops` comes from `useTrip()` which loads from Supabase. On first render, `stops` could be empty (not loaded yet), making `todayIdx` null and `isDuringTrip` false. The `useState` initializer only runs once, so even when stops load later, `view` stays `'overview'`.
- **However:** The `useStops` hook has a `loaded` flag and `TripContext` waits for it. Need to check if TodayPage only renders after stops are loaded.
- **Confidence: MEDIUM** (depends on whether parent gates rendering on stops loaded state)

### F11. Cannot clear estimated_cost to 0 by emptying the field
- **Line cited:** `DetailModal.jsx:280-281`
- **Actual code (lines 280-281):** `const ec = parseFloat(draft.estimated_cost); if (!isNaN(ec) && ec !== (Number(it.estimated_cost) || 0)) changes.estimated_cost = ec;`
- **Verified:** If user clears the field, `draft.estimated_cost` is `''`, `parseFloat('')` is `NaN`, so the condition fails and the change is never saved. User cannot clear an estimated cost back to 0/null.
- **Confidence: HIGH**

### F12. Edit mode backdrop click does nothing
- **Line cited:** `DetailModal.jsx:316`
- **Actual code (line 316):** `<div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Edit item">`
- **Verified:** No `onClick` handler on the overlay in edit mode. Compare with summary mode (line 107): `<div className="detail-overlay" onClick={onClose} ...>`. In edit mode, tapping outside the sheet does nothing.
- **Confidence: HIGH**

### F13. Toast is invisible to screen readers
- **Line cited:** `Toast.jsx`
- **Actual code:** `<div className="toast-container"><div className="toast">{message}</div></div>`
- **Verified:** No `role`, no `aria-live` attribute. Plain divs.
- **Confidence: HIGH**

### F14. Expense `created_by` always empty string
- **Line cited:** `ExpenseCard.jsx:20`
- **Actual code (line 20):** `await addExpense({ ..., created_by: '' });`
- **Verified:** Confirmed. When creating expense from DetailModal's confirm flow (via ExpenseCard), `created_by` is hardcoded to `''`. The ExpenseCard component doesn't receive the user's email. Note: `AddExpenseModal` (line 32) does pass `created_by: userEmail`, so expenses created from that flow have the correct value. Only the DetailModal -> ExpenseCard path is broken.
- **Confidence: HIGH**

### F15. Deleting an expense does not prompt about reverting confirmed status
- **Line cited:** `ExpenseCard.jsx:33-43`
- **Actual code:** `handleDelete` calls `deleteExpense(expense.id)` and `onClose()`. No status revert.
- **Verified:** Confirmed. After deleting an expense, the item stays in `conf` status with no linked expense. This is a design issue -- whether it's a "bug" depends on intent. Some confirmed items might not need an expense (e.g., free activities).
- **Confidence: MEDIUM** (valid observation but debatable whether it's always wrong)

### F16. Native alert() for save errors breaks design language
- **Verified:** `DetailModal.jsx:306` uses `alert('Failed to save changes.')`. `AddExpenseModal.jsx:36` uses `alert('Error: ' + err.message)`. Confirmed.
- **Confidence: HIGH** (but this is polish, correctly rated P3)

### F17. Double vibrate on status change
- **Verified:** `DetailModal.jsx:128` calls `navigator.vibrate(15)` and `useItems.js:113` calls `navigator.vibrate(15)`. The DetailModal vibrates, then calls `setStatus` which vibrates again inside `useItems.setStatus`.
- **However:** DetailModal line 128 fires for all status clicks. But line 129 returns early for `conf` (opens ExpenseCard instead of calling setStatus). So for the conf flow, only one vibrate fires. For non-conf status changes, both fire: DetailModal vibrates, then `setStatus` vibrates.
- **Confidence: HIGH** (for non-conf status changes, double vibrate is confirmed)

### F18. Recent activity rows not tappable
- **Line cited:** `OverviewView.jsx:70`
- **Actual code (line 70):** `<div key={r.id} className="itin-recent-row">` -- no onClick, no cursor style.
- **Verified:** Confirmed. The `onItemTap` prop is available in the component but not wired to recent activity rows.
- **Confidence: HIGH**

---

## 3 MOST Defensible Findings

1. **F1 (Confirm flow silently fails on dismiss)** -- The code path is unambiguous. `setShowExpenseCard(true); return;` bypasses `setStatus`. The ExpenseCard dismiss handler doesn't set status. The user sees the status selector snap back with no explanation. This is the app's primary conversion flow.

2. **F9 (Status sort ignores direction)** -- One-line bug, trivially verifiable. Lines 62-64 apply `* dir` for name/price/date sorts. Line 67 does not. Missing `* dir` means ascending and descending produce identical results for status sort.

3. **F8 (stop.sleep instead of stop.name)** -- Obvious typo. `stop?.name &&` guards the render, but `{stop.sleep}` is rendered. The `sleep` field does not exist on stops. Will display nothing or "undefined".

## 3 LEAST Defensible Findings

1. **F7 (Phantom expenses invisible)** -- The CLAUDE.md explicitly states "1 expense per item max" as a design decision. The scenario of multiple expenses per item requires either a race condition or direct DB manipulation, both unlikely for a 2-user personal app. The code is as cited but the problem is theoretical.

2. **F10 (Today auto-navigate fails on first load)** -- I did not verify whether the parent component gates rendering on `stops` being loaded. If `TripContext` provides `stops` synchronously (from cache or by blocking render), `getTodayDayIndex(stops)` would work correctly on first render. My claim assumed async loading but I lack evidence for the actual loading behavior.

3. **F3 (Back button trap)** -- The bug (duplicate pushState from re-renders) is real, but the severity claim ("fundamental mobile PWA interaction pattern that is broken") may be overstated. The number of phantom history entries depends on re-render frequency. For a modal that opens, gets interacted with, and closes, the re-render count may be low. The cleanup properly removes listeners. The practical impact depends on usage patterns I haven't observed.

## New Issues Found on Second Pass

1. **ExpenseCard does not receive `setStatus` from BudgetPage.** In `BudgetPage.jsx:104-111`, the `ExpenseCard` rendered for `selectedExpense` does not pass `setStatus`. Compare with `DetailModal.jsx:224` which does pass it. This means if a user creates a new expense from BudgetPage's ExpenseCard (unlikely path but possible), the `setStatus` call on line 21 of ExpenseCard would fail silently (`setStatus` would be undefined, the `&&` guard would skip it). Not a real issue since BudgetPage only opens ExpenseCard for existing expenses, never new ones.

2. **Edit mode overlay is not scrollable on small screens.** The EditMode component (line 316) renders a `detail-sheet` inside a `detail-overlay` but the overlay has no `onClick={onClose}` (as noted in F12). More importantly, the edit form has many fields (Basic, Stops, Type-specific, Schedule, Pricing, Links, Notes, Attachments) that could exceed viewport height. Whether the sheet scrolls depends on CSS -- I haven't verified the CSS, so this is uncertain.

3. **`deleteExpense` calls in DetailModal line 130 are not awaited.** The `for` loop iterates synchronously, calling `deleteExpense(exp.id)` without `await`. Since `deleteExpense` is async, all deletions fire concurrently (which could be intentional for speed), but the empty `catch` means even if the function throws synchronously, the error is caught. However, since the function is async, it returns a Promise -- the `try/catch` won't catch rejected promises from an unawaited async call. The `catch {}` is completely useless.
