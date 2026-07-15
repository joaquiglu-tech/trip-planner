# Code Quality Review

**Reviewer**: Code Quality
**Date**: 2026-05-17
**Score**: 4.5/10
**Verdict**: WARNING

## Findings

### [HIGH] Duplicated constants between DetailModal and AddItemModal
SUBCAT_OPTIONS, TIER_OPTIONS, TRANSPORT_MODES defined identically in both files. Fix: extract to shared constants file.

### [HIGH] Status selector duplicated 3 times with divergent behavior
Summary mode (line 131): confirmation dialog on downgrade. EditMode (line 361): silently deletes expenses. AddItemModal (line 189): simple toggle. Fix: extract StatusSelector component with onBeforeChange callback.

### [HIGH] DetailModal.jsx at 594 lines with 4 components
Split into folder: DetailModal/, EditMode.jsx, PricingBlock.jsx, PhotoCarousel.jsx.

### [HIGH] Cryptic export name $f for currency formatter
Rename to formatCurrency, move to utils.

### [HIGH] 18+ props on DetailModal
Group related props into objects or consume from context.

### [MEDIUM] alert() calls instead of toast notifications
5 instances across DetailModal and AddItemModal. Replace with useToast.

### [MEDIUM] Duplicated Xotelo/TripAdvisor URL handling
Extract useXoteloLookup hook.

### [MEDIUM] u() single-letter function name
Rename to updateDraft for consistency with AddItemModal's updateForm.

### [MEDIUM] useEffect missing dependencies (line 76)
Add getPlaceData to dependency array.

### [MEDIUM] IIFE for favicon URL (line 87)
Extract to helper function.

### [MEDIUM] desc_text vs description field name mismatch
Rename to description everywhere.

### [LOW] savedTimerRef not cleaned on unmount
### [LOW] Inconsistent CSS class naming (add-input vs edit-input)
### [LOW] Storage upload has no file type validation
