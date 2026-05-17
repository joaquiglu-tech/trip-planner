# Architecture Review: DetailModal / EditMode / ExpenseCard / AddItemModal

**Reviewer**: Architect
**Date**: 2026-05-17
**Scope**: Component boundaries, modal lifecycle, data flow
**Score**: 5/10

---

## Overall Assessment

DetailModal.jsx is a 594-line monolith containing four components (DetailModal, EditMode, PricingBlock, PhotoCarousel) that should be separate files. The data flow relies on prop-drilling ~20 props from the parent page through DetailModal into EditMode, and several of those same responsibilities are duplicated in AddItemModal. There are concrete CSS bugs, data-loss paths, and duplication problems that will compound as features are added.

---

## Findings

### F1 — Close (X) button not sticky in summary mode [P0]

**Root cause**: In summary mode (line 117), `.detail-close` uses `position: sticky; float: right`. Float removes the element from normal flow, disrupting the sticky containing block. When scrolling past the hero image, the close button scrolls away. In edit mode (line 353), the close button is inside `.detail-action-top` (sticky, top: 0), so it works by accident of nesting.

**Fix**: Remove `float: right` from `.detail-close`. Use `position: absolute; top: 12px; right: 12px; z-index: 20` with `.detail-sheet` having `position: relative`. Or restructure to have a non-scrolling header.

### F2 — Close (X) fights with `.detail-action-top` z-index in summary mode [P1]

**Root cause**: Both `.detail-close` (z-index: 10) and `.detail-action-top` (sticky, z-index: 10) share the same z-index. The status bar paints over the close button when both are stuck at top.

**Fix**: Raise `.detail-close` to z-index: 20, or fold the close button into the action-top bar.

### F3 — Missing fields in summary view [P1]

**Root cause**: Summary mode conditionally renders populated fields. Audit needed to verify every user-editable field has a corresponding summary display. The `address` field comes only from Google Places, not user-editable.

### F4 — Link field unclickable [P1]

**Root cause**: Line 214 renders link as `<a>` correctly. Likely CSS issue: `.detail-book-link` may have pointer-events blocked, or parent click handler interference. Also: links without protocol prefix (e.g., `www.example.com`) become relative URLs.

**Fix**: Check CSS, normalize links on save (prepend `https://` if missing).

### F5 — File upload in edit mode loses unsaved draft changes [P1]

**Root cause**: `handleUpload` (line 89-97) is defined in parent DetailModal, not EditMode. It calls `setUploading` which re-renders parent, but draft is local state in EditMode (useState initializer only runs once), so draft survives. The real issue is likely UX confusion: file uploads save immediately while other changes require Save button. Or: `alert()` on failure blocks JS thread and can cause focus/scroll reset on mobile.

**Fix**: Queue file uploads as pending (like AddItemModal's `pendingFiles`) and commit on Save. Or show warning that file uploads save immediately.

### F6 — AddItemModal: file upload gated behind confirmed status [P1]

**Root cause**: Lines 197-225 only show file upload when `form.status === 'conf'`. No upload option for "Selected" items.

**Fix**: Move file upload section outside the `form.status === 'conf'` conditional.

### F7 — addItem() ignores status from caller [P0]

**Root cause**: `useItems.js` line 159 hardcodes `status: 'sel'`, ignoring `itemData.status`. When AddItemModal sets `form.status = 'conf'`, the item is saved as 'sel' but expense is created — data inconsistency.

**Fix**: Change line 159 to `status: itemData.status || 'sel'`.

### F8 — Duplicated constants between DetailModal and AddItemModal [P2]

**Root cause**: TYPE_OPTIONS, SUBCAT_OPTIONS, TIER_OPTIONS, TRANSPORT_MODES defined identically in both files. Status selector JSX duplicated 3 times.

**Fix**: Extract to shared constants file and StatusSelector component.

### F9 — EditMode status change silently deletes expenses without confirmation [P0]

**Root cause**: Summary mode (line 137-146) shows confirm dialog before deleting expenses on status downgrade. EditMode (lines 366-370) silently deletes all expenses without confirmation.

**Fix**: Add same confirmation guard in EditMode. Extract status-change logic into shared function.

### F10 — DetailModal is a monolith (594 lines, 4 components) [P1]

**Fix**: Split into DetailModal (orchestrator), ItemSummary, ItemEditForm, PricingBlock, PhotoCarousel.

### F11 — Prop drilling: 18+ props through DetailModal [P2]

**Fix**: Access item-specific data via hooks inside DetailModal using item ID.

### F12 — ExpenseCard only shows first expense [P1]

**Root cause**: Line 238 passes `(itemExpenses || [])[0]`. Multiple expenses invisible.

**Fix**: Add unique constraint on expenses.item_id, or handle list.

### F13 — History API modal pattern creates navigation bugs [P2]

**Root cause**: DetailModal and AddItemModal push history state, but ExpenseCard doesn't. Back button from ExpenseCard closes DetailModal, leaving ExpenseCard orphaned.

### F14 — enrichItem overwrites user description with Google address [P2]

**Root cause**: `enrichItem.js` line 18 sets description to street address when empty.

**Fix**: Store address separately, don't overwrite description.

### F15 — Race condition: realtime update during edit can corrupt save [P2]

**Root cause**: Conflict detection only checks name, status, estimated_cost, stop_ids. Other fields (description, notes, link) can be silently overwritten.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| P0 | 3 | F1, F7, F9 |
| P1 | 6 | F2, F3, F4, F5, F6, F12 |
| P2 | 6 | F8, F10, F11, F13, F14, F15 |

## Recommended Fix Order

1. F7 — addItem ignores status (one-line fix)
2. F9 — Silent expense deletion in EditMode (add confirm guard)
3. F1/F2 — Close button CSS
4. F6 — File upload gated behind confirmed status
5. F4 — Link unclickable
6. F5 — File upload UX in edit mode
7. F12 — Expense unique constraint
8. F10/F8 — Split monolith, extract constants
9. F13-F15 — Lower priority cleanup
