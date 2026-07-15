# TypeScript/JS State Management Review

**Reviewer**: TypeScript/JS Reviewer
**Date**: 2026-05-17
**Score**: 5/10
**Verdict**: BLOCK

## Findings

### F1 [P0] — Realtime updates during edit cause false conflict dialogs and silent data loss

`enrichItem` fire-and-forget (useItems.js:169-174) changes the `it` prop during active edit. Conflict detection compares live `it` against `baseItem` snapshot, producing false-positive dialogs that train users to click "Save anyway". Draft fields can be silently discarded when the diff against changed `it` computes no delta.

### F2 [P0] — Status selector in EditMode: immediate save + no undo + no confirm

Status saves immediately via `setStatus` while all other fields use batch draft. Cancel does not undo the status change. Downgrading from "conf" silently deletes expenses without the confirmation dialog that exists in summary mode.

### F3 [P1] — handleUpload defined in parent, not EditMode

`handleUpload` (DetailModal line 89) calls `setUploading(true)` which triggers parent re-render. While EditMode's draft survives (useState initializer only runs once), the `alert()` on failure blocks JS thread, can cause focus/scroll reset on mobile Safari. UX confusion: uploads save immediately, other edits require Save button.

### F4 [P1] — EditMode draft doesn't capture all editable fields

Draft (line 254-266) captures most fields but `estimated_cost` has no input element wired to it in EditMode, despite being in the draft and save logic.

### F5 [P1] — addItem hardcodes status: 'sel'

useItems.js line 159 ignores `itemData.status`. One-line fix: `status: itemData.status || 'sel'`.

### F6 [P1] — Stale closure in handleTripAdvisorUrl

AddItemModal.jsx line 106 calls `fetchXoteloPrices(key, form.stop_ids)` but `form.stop_ids` is from the closure at function definition time, not the current state.

### F7 [P1] — fetchXoteloPrices called inside setState updater

AddItemModal.jsx lines 72-74: async function called from synchronous `setForm` updater. Floating promise, no cancellation, no error handling. If it throws, `xoteloStatus` stuck at 'searching' forever.

### F8 [P2] — useEffect dependency array incomplete

DetailModal.jsx line 76: place-data fetch depends on `[it?.id]` but reads `getPlaceData` which may change.

### F9 [P2] — savedTimerRef not cleaned on unmount

DetailModal.jsx line 62: setTimeout not cleared on unmount, React state-after-unmount warning.

### F10 [P2] — Optimistic setStatus rollback incomplete for conflicting stays

useItems.js lines 126-137: conflicting stays deselected optimistically. If DB update fails, UI not rolled back.

### F11 [P2] — Race condition in EditMode conflict detection

handleSave (line 291) only checks 4 of 20+ fields for conflicts. Other fields silently overwritten.

### F12 [P2] — No loading state feedback during status change

setStatus (useItems.js line 120) is async but caller has no way to show loading or handle failure.
