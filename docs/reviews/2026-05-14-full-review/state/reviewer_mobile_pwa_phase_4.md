# Mobile PWA Specialist -- Phase 4 Confidence Calibration

**Date:** 2026-05-14
**Task:** Re-read every finding against source code, rate confidence, identify strongest/weakest.

---

## Per-Finding Verification

### P0-1: No offline experience whatsoever
- **Re-read:** Grepped for `navigator.onLine`, `useOnlineStatus`, `offline` across `src/` -- zero results. Confirmed `useItems.js:56` does `console.warn('Failed to load items:', itemsRes.error)` and returns with `setLoaded(true)`, showing no UI feedback. Workbox config at `vite.config.js:37-41` confirms NetworkFirst with 3s timeout but no app-level handling of the stale-served case.
- **Confidence: HIGH**
- **Nothing new.**

### P0-2: Modal back-button trap (history stack corruption)
- **Re-read:** `DetailModal.jsx:57-62` confirmed: `pushState` on mount, `popstate` listener referencing `onClose` from the dependency array. The `useEffect` depends on `[onClose]`, which means the listener IS re-registered when `onClose` changes -- this partially mitigates the stale closure concern. However, `onClose` in TodayPage.jsx:119 is `() => setSelectedItem(null)` (inline arrow, recreated every render), so the effect will tear down and re-register the listener on every render, and each re-registration pushes a NEW history entry. That is actually worse than I initially described -- the history stack grows on every re-render, not just on modal open/close cycling. ExpenseCard (line 50) has its own `detail-overlay` but does NOT push a history entry, confirmed. The unbounded history growth claim is accurate.
- **Confidence: HIGH** -- actually stronger on re-read. The `[onClose]` dependency means pushState fires on every re-render that changes the parent's inline arrow.
- **New finding:** The `onClose` dependency in the useEffect means `pushState` is called on EVERY re-render of the parent that creates a new arrow function reference. This is more severe than originally stated.

### P0-3: Detail modal handle is decorative -- no swipe-to-dismiss
- **Re-read:** `DetailModal.jsx:109` renders `<div className="detail-handle" />`. `index.css:134` styles it as a 32x4px bar. Grepped for `onTouchStart`, `onTouchMove`, `onTouchEnd`, `touchstart`, `touchmove`, `touchend` across all `src/` -- zero results. Confirmed: no touch gesture handling anywhere in the codebase.
- **Confidence: HIGH**
- **Nothing new.**

### P1-1: SVG-only manifest icons will fail iOS PWA install
- **Re-read:** `vite.config.js:25-29` confirmed: all three icon entries are `.svg`. `index.html:12` confirmed: `<link rel="apple-touch-icon" href="/icon-192.svg" />`. iOS Safari does not support SVG for apple-touch-icon or PWA manifest icons.
- **Confidence: HIGH**
- **Nothing new.**

### P1-2: Missing `viewport-fit=cover`
- **Re-read:** `index.html:5` confirmed: `<meta name="viewport" content="width=device-width,initial-scale=1.0" />` -- no `viewport-fit=cover`. `index.html:9` sets `apple-mobile-web-app-status-bar-style` to `black-translucent`. `index.css:65` `.topbar` has no `padding-top` with `env(safe-area-inset-top)`. Grepped `viewport-fit` across the entire project -- only found in my own Phase 3 review. Confirmed absent.
- **Confidence: HIGH**
- **Nothing new.**

### P1-3: Safe area only applied to bottom tabs, nowhere else
- **Re-read:** Grepped `safe-area-inset` in `src/` -- only one result: `index.css:75` on `.btabs`. FAB at `index.css:366` is `bottom: 72px` (hardcoded). `detail-edit-actions` at `index.css:206` is `sticky; bottom: 0` with no safe-area padding. `.page-container` at line 60 has `padding-bottom: 56px` (hardcoded).
- **Confidence: HIGH**
- **Nothing new.**

### P1-4: Double haptic vibration on status change
- **Re-read:** `DetailModal.jsx:128` calls `navigator.vibrate(15)` on status button click. `useItems.js:113` calls `navigator.vibrate(15)` inside `setStatus`. The DetailModal click handler calls `setStatus(it.id, opt.value)` at line 131, which triggers the hook's `setStatus`. So yes, vibrate fires twice: once at line 128 (before the guard/confirm logic), and once at line 113 (inside the hook). However -- I need to check: does the vibrate at line 128 fire before the early returns? Looking at lines 127-131: `if (opt.value === st) return;` happens at 127 before vibrate at 128. Then `if (opt.value === 'conf'...) { setShowExpenseCard(true); return; }` at 129 -- this returns WITHOUT calling setStatus, so vibrate fires once (DetailModal only) for the conf flow. For non-conf status changes (e.g., selecting), vibrate fires at 128, then setStatus fires vibrate at 113. Confirmed: double vibration for non-conf status changes.
- **Confidence: HIGH**
- **Nothing new.**

### P1-5: File delete button is 14x14px -- impossible to tap accurately
- **Re-read:** `DetailModal.jsx:204` confirmed: `style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: 14 }}`. The button text is just "x". With `padding: 0` and `fontSize: 14`, the rendered target is approximately 14x17px (character width x line-height). No `min-width` or `min-height`. Same pattern at line 434 in EditMode. The parent `.file-chip` (index.css:237) has `padding: 3px 10px` but that padding is on the container, not the button itself.
- **Confidence: HIGH**
- **Nothing new.**

### P1-6: Unlinked expense delete button has no confirmation and is too small
- **Re-read:** `BudgetPage.jsx:71` confirmed: `<button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>delete</button>`. No `confirm()`, no `min-height`, `fontSize: 11`. Direct delete on click. Contrast with ExpenseCard.jsx:35 which DOES use `confirm()` for the same action.
- **Confidence: HIGH**
- **Nothing new.**

### P2-1: No exit animation on modal dismiss
- **Re-read:** `index.css:53` defines `@keyframes sheet-up` (entry). `index.css:130` applies `animation: sheet-up .25s var(--ease)` to `.detail-sheet`. No `sheet-down` keyframes exist anywhere. No `closing` state in DetailModal.jsx. The modal unmounts instantly when `selectedItem` becomes null.
- **Confidence: HIGH**
- **Nothing new.**

### P2-2: Carousel arrow buttons hidden on touch devices, but no swipe affordance communicated
- **Re-read:** `index.css:149` confirmed: `@media (hover: none) { .carousel-arrow { display: none } }`. `DetailModal.jsx:530-532` -- line numbers are off. The dots are at lines 530-532 in my review but the actual carousel component is at lines 495-537. The dots at line 531 are `<span>` elements, not buttons -- they have no `onClick`. The carousel does work via scroll-snap, but there is no visual peek or swipe hint.
- **Confidence: MEDIUM** -- The finding is directionally correct but the severity is debatable. Scroll-snap carousels are a well-understood pattern, and photo dots are a universal "swipeable" signal. The lack of tappable dots is a real missed interaction, but calling it a problem that "users may not realize they can swipe" is likely overstated since the dots themselves communicate it.
- **Nothing new.**

### P2-3: AddItemModal missing `role="dialog"` and close button has no `aria-label`
- **Re-read:** `AddItemModal.jsx:102` renders `<div className="detail-overlay" onClick={onClose}>` -- confirmed NO `role="dialog"`, no `aria-modal`, no `aria-label`. Line 104: `<button className="detail-close" onClick={onClose}>x</button>` -- no `aria-label`. However, the DetailModal.jsx:107 DOES have `role="dialog" aria-modal="true" aria-label="Item details"` and the close button at line 110 has `aria-label="Close"`. ExpenseCard.jsx:50 also has these attributes. So AddItemModal is the inconsistent one.
- **Confidence: HIGH**
- **Nothing new.**

### P2-4: `confirm()` and `alert()` dialogs break PWA immersion
- **Re-read:** `DetailModal.jsx:85` `alert('File too large (max 5MB)')` -- confirmed. Line 88: `alert('Upload failed: ' + err.message)` -- confirmed. Line 130: `confirm(...)` for expense deletion on status change -- confirmed. Line 215: `confirm('Delete this item permanently?...')` -- confirmed. `ExpenseCard.jsx:35`: `confirm('Delete this expense?...')` -- confirmed. `AddItemModal.jsx:96`: `alert('Error saving: ' + err.message)` -- confirmed.
- **Confidence: HIGH**
- **Nothing new.**

### P2-5: Page content not scrollable to bottom on iOS when keyboard is open
- **Re-read:** `index.css:130` `.detail-sheet` uses `max-height: 95vh` -- confirmed, NOT `95dvh`. The sticky save/cancel bar at `index.css:206` is `position: sticky; bottom: 0`. On iOS Safari, `vh` does not shrink when the virtual keyboard opens, so the sheet extends behind the keyboard. The sticky bar at `bottom: 0` of the scroll container would be behind the keyboard.
- **Confidence: MEDIUM** -- The issue is real on older iOS versions (pre-16). iOS 16+ introduced `visualViewport` adjustments that partially mitigate this for `position: sticky` in some cases. The `dvh` suggestion is correct but the severity depends on the iOS version. Since this app targets travelers (who may have older phones), keeping as P2 is reasonable.
- **Nothing new.**

### P2-6: Font loaded from CDN with no fallback strategy
- **Re-read:** `index.html:10` confirmed: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css" />`. No `rel="preconnect"`, no `rel="preload"`, no `font-display` parameter. The CSS link is render-blocking by default. The font stack at `index.css:27` has `system-ui, -apple-system, sans-serif` as fallback, which is correct -- but the CSS file itself blocks first paint until loaded.
- **Confidence: MEDIUM** -- The severity claim of "2-5 seconds on 3G" is plausible but unverified. The fix suggestions are correct. However, Vite may inline or preload this in production builds depending on config. I did not verify the production build behavior.
- **Nothing new.**

### P3-1: No pull-to-refresh on any page
- **Re-read:** `index.css:83` confirmed: `overscroll-behavior: contain` on `.page`. Grepped for `pull` and `refresh` -- no custom implementation. No refresh button in any page component. The app relies on Supabase realtime for updates, but if that connection drops, there is no manual recovery mechanism.
- **Confidence: HIGH**
- **Nothing new.**

### P3-2: FAB z-index stacking can obscure content
- **Re-read:** `index.css:366` `.fab` at `bottom: 72px; right: 16px; width: 48px; height: 48px; z-index: 500`. `.page` at line 83 has `padding-bottom: 24px`. The page-container at line 60 has `padding-bottom: 56px` (for bottom tabs). So total bottom space = 56px (tabs) but the FAB sits at 72px from bottom, meaning its center is at ~96px from the bottom. The bottom of the scrollable content has 24px padding. On a short screen, the last card could be partially obscured by the FAB.
- **Confidence: LOW** -- This is speculative. I have not measured whether actual content gets obscured in practice. The 48px FAB at `bottom: 72px` (top edge at ~96px) vs the page's `padding-bottom: 24px` could theoretically overlap, but the items grid has its own margins. It depends on content length and screen height. Weak evidence.
- **Nothing new.**

### P3-3: `apple-touch-icon` uses SVG (not supported)
- **Re-read:** `index.html:12` confirmed: `<link rel="apple-touch-icon" href="/icon-192.svg" />`. This is a subset of P1-1 and fully verified there.
- **Confidence: HIGH** (but redundant with P1-1)
- **Nothing new.**

---

## 3 MOST Defensible Findings (strongest evidence)

1. **P0-1: No offline experience whatsoever** -- Zero results from grepping `navigator.onLine` or `offline` across the entire `src/`. The Supabase load failure silently warns. The Workbox caching strategy exists but the app has no awareness of it. This is a binary fact: the feature is completely absent.

2. **P0-2: Modal back-button trap** -- The `pushState` call inside a `useEffect` with `[onClose]` dependency is verifiable at `DetailModal.jsx:57-62`. Since `onClose` is an inline arrow in both TodayPage and BudgetPage, the effect re-runs on every parent re-render, pushing duplicate history entries. This is a concrete code-level bug with a clear reproduction path.

3. **P1-1 / P3-3: SVG-only manifest icons** -- `vite.config.js:25-29` and `index.html:12` show only SVG icons. Apple's documentation explicitly states SVG is not supported for `apple-touch-icon` or PWA manifest icons on iOS. This is a binary factual check against a platform constraint.

## 3 LEAST Defensible Findings (weakest evidence)

1. **P3-2: FAB z-index stacking can obscure content** -- Speculative. I never measured actual overlap on a real device. The FAB position and page padding are confirmed, but whether content is actually obscured depends on content length and screen dimensions. No screenshot or device test to support this.

2. **P2-6: Font loaded from CDN with no fallback strategy** -- The CDN link is confirmed render-blocking in the HTML, but I did not verify Vite's production build output. Vite may handle this differently. The "2-5 seconds on 3G" claim is an estimate, not a measurement. The fallback font stack exists, so the impact may be less severe than stated.

3. **P2-2: Carousel arrow buttons hidden on touch devices, but no swipe affordance** -- The dots at the bottom of the carousel ARE a swipe affordance signal, even though they are not tappable. Claiming users "may not realize they can swipe" when pagination dots are visible is a stretch. The non-tappable dots are a real UX gap, but the framing overstates the severity.

## New Issues Found on Second Pass

1. **P0-2 is worse than stated:** The `useEffect` at `DetailModal.jsx:57-62` has `[onClose]` in the dependency array. Since `onClose` is an inline arrow (`() => setSelectedItem(null)`) in both TodayPage.jsx:119 and BudgetPage.jsx:127, every parent re-render creates a new function reference, causing the effect to: (a) remove the old popstate listener, (b) push a NEW history entry, (c) add a new listener. This means the history stack grows on every re-render of the parent, not just on modal open/close. Any state change in TodayPage or BudgetPage while the modal is open (e.g., realtime update arriving, expense loading) triggers this.

2. **AddItemModal.jsx:102 has no history management at all.** Unlike DetailModal, AddItemModal does not push a history entry or listen for popstate. Pressing the hardware back button while AddItemModal is open will navigate away from the app entirely (or to a previous page), not close the modal. This is a separate back-button trap not mentioned in Phase 3.

3. **EditMode (DetailModal.jsx lines 315-454) renders its own `detail-overlay` without a `detail-close` button.** The only way to exit edit mode is via Cancel/Save at the bottom. If a user scrolls to the middle of the form and wants to dismiss, there is no close button or back-button handler (the parent's popstate listener handles it, but the edit mode replaces the entire modal rendering, so the user sees the overlay disappear rather than returning to summary mode).
