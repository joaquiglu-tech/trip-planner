# Silent Failure Review

**Reviewer**: Silent Failure Hunter
**Date**: 2026-05-17
**Score**: 4/10

## Findings

### F1 [P0] — AddItemModal file upload failures silently swallowed
Lines 142-149: each failed upload caught with console.warn only. Modal closes unconditionally. User has no idea files are missing. Fix: collect failures, show them, don't close on partial failure.

### F2 [P0] — AddItemModal expense creation failure orphans the item
Lines 128-138: cascade is create item → create expense → upload files. If step 2 fails, item already in DB. User retries, creates duplicate. Fix: rollback item on expense failure, or show "item saved but expense failed."

### F3 [P1] — addItem hardcodes status: 'sel', ignoring user selection
useItems.js line 159. Fix: `status: itemData.status || 'sel'`.

### F4 [P1] — deleteItem cascade failure leaves orphaned data silently
useItems.js lines 178-201. If place_cache delete throws after expenses deleted, item reappears in UI with expenses gone. Fix: show toast on rollback, delete item first.

### F5 [P2] — Storage cleanup failure swallowed, files orphaned forever
useItems.js lines 187-192. Fix: log to cleanup_failures table.

### F6 [P1] — EditMode status change continues after expense deletion failure
DetailModal.jsx lines 363-373. No `failed` flag like SummaryMode has. Status always changes regardless. Fix: port the failed flag from SummaryMode.

### F7 [P1] — EditMode: no confirmation before expense deletion
SummaryMode line 138 shows confirm dialog. EditMode skips it entirely. Fix: add same confirm dialog.

### F8 [P1] — setStatus conflicting stay deselection not rolled back on failure
useItems.js lines 126-137. Optimistic deselect, catch only logs. Fix: restore on catch, show toast.

### F9 [P2] — getPlaceData failure hides photos with no retry
DetailModal.jsx line 75. Fix: error state + retry button.

### F10 [P2] — enrichItem fire-and-forget, no retry
useItems.js lines 169-174. Fix: track enrichment_status, offer retry.

### F11 [P1] — fetchXoteloPrices unhandled promise, stuck UI
AddItemModal.jsx line 73: called from sync context with no .catch(). xoteloStatus stuck at 'searching'. Fix: wrap in try/catch, set error status.

### F12 [P2] — listFiles returns empty array on error
storage.js lines 19-26. Can't distinguish "no files" from "request failed". Fix: throw error.
