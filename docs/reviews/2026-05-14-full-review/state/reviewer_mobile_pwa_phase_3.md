# Mobile PWA Review -- Anisita Trip Planner

**Reviewer:** Mobile PWA Specialist
**Date:** 2026-05-14
**Scope:** Touch interactions, mobile layout, PWA compliance, mobile performance
**Overall Score: 5.5 / 10**
**Recommendation: REQUEST_CHANGES**

---

## Score Justification

The app has a solid visual design and gets the basics right (bottom sheet modal, scroll-snap carousel, 100dvh shell, bottom tabs with safe-area padding). But when I simulate using this on a cramped bus in rural Tuscany with spotty 3G, the experience falls apart: there is zero offline awareness, the modal back-button trap will strand users, critical touch targets are undersized, the detail handle is decorative (no swipe-to-dismiss), and the PWA manifest uses SVG-only icons which will fail iOS install. These are not edge cases for a trip planner -- they are the primary use case.

---

## Top Findings

### P0 -- Critical

#### P0-1: No offline experience whatsoever
- **Description:** The app has no offline detection, no offline UI, and no fallback content. When the service worker cache expires or the user is in a tunnel/rural area, Supabase calls fail silently (`console.warn` only) and the user sees a broken loading screen or stale data with no indication of why.
- **Mobile impact:** A trip planner is used most heavily while traveling. Rural Italy/Spain highways, trains through tunnels, airports with captive portals -- the #1 scenario for this app is degraded connectivity. Users will think the app is broken.
- **File:line:** No file -- this is entirely absent from the codebase. `useItems.js:56` silently warns on load failure. No `navigator.onLine` check anywhere.
- **Proposed fix:** (1) Add an `useOnlineStatus` hook that monitors `navigator.onLine` + `online`/`offline` events. (2) Show a persistent banner when offline. (3) For cached data, show it with a "Last updated X minutes ago" badge. (4) Queue mutations (status changes, expense adds) in IndexedDB and replay when back online. (5) The Workbox config already caches Supabase API with NetworkFirst/3s timeout -- make sure the UI handles the cache-served stale case gracefully.

#### P0-2: Modal back-button trap (history stack corruption)
- **Description:** `DetailModal.jsx:58` pushes a history entry on mount. But `onClose` is an inline arrow re-created every render (confirmed in TodayPage.jsx:119, BudgetPage.jsx:128), so the `popstate` listener references a stale closure. Additionally, if the user opens a modal, then opens ExpenseCard (which does NOT push its own history entry), pressing back closes the wrong layer. If the user navigates between items quickly, the history stack grows unboundedly -- pressing back multiple times cycles through phantom modal states instead of leaving the page.
- **Mobile impact:** On mobile, the hardware/gesture back button is the primary navigation affordance. This is currently a user trap. Users will repeatedly press back and see nothing happen or see modals flicker.
- **File:line:** `DetailModal.jsx:57-62`, `TodayPage.jsx:119`, `BudgetPage.jsx:128`
- **Proposed fix:** (1) Use a single history entry managed by the app shell, not per-modal. (2) Clean up the popstate listener properly (stabilize `onClose` with `useCallback` or use a ref). (3) ExpenseCard needs its own history management if it's a distinct layer. (4) Consider using a proper router (even a minimal hash router) instead of manual `pushState`.

#### P0-3: Detail modal handle is decorative -- no swipe-to-dismiss
- **Description:** `.detail-handle` renders a visual drag handle at the top of the bottom sheet, but there are zero touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) anywhere in the codebase. The handle is purely cosmetic. Users will instinctively grab it and swipe down -- nothing happens.
- **Mobile impact:** Swipe-to-dismiss is the expected interaction pattern for bottom sheets on both iOS and Android. A non-functional handle is worse than no handle at all because it teaches the user a lie.
- **File:line:** `DetailModal.jsx:109`, `index.css:134`
- **Proposed fix:** Either (a) implement swipe-to-dismiss with touch event tracking (translate the sheet on drag, dismiss if velocity/distance threshold met), or (b) remove the handle entirely and rely on the close button + backdrop tap + back button.

### P1 -- High

#### P1-1: SVG-only manifest icons will fail iOS PWA install
- **Description:** The manifest declares only SVG icons (`icon-192.svg`, `icon-512.svg`). iOS Safari does not support SVG icons for the PWA splash screen or home screen icon. The `apple-touch-icon` also points to an SVG (`/icon-192.svg`).
- **Mobile impact:** On iPhone (the majority device for travelers), the app will install but show a blank/generic icon on the home screen and a white splash screen. This is the first impression of the PWA.
- **File:line:** `vite.config.js:26-29`, `index.html:12`
- **Proposed fix:** Generate PNG icons at 192x192 and 512x512 (and 180x180 for apple-touch-icon). Keep the SVGs as extras. Add `apple-touch-startup-image` entries for splash screens.

#### P1-2: Missing `viewport-fit=cover` -- content hidden behind notch/Dynamic Island
- **Description:** The viewport meta tag is `width=device-width,initial-scale=1.0` but does not include `viewport-fit=cover`. The `apple-mobile-web-app-status-bar-style` is set to `black-translucent`, which implies the app wants to extend under the status bar, but without `viewport-fit=cover` the safe area insets (`env(safe-area-inset-*)`) may not be exposed correctly on notched iPhones.
- **Mobile impact:** On iPhone 14+/15+/16+ with Dynamic Island, the top of the app may be clipped or the topbar may sit too high. The topbar has no `padding-top` accounting for `safe-area-inset-top`.
- **File:line:** `index.html:5`, `index.css:65`
- **Proposed fix:** (1) Add `viewport-fit=cover` to the viewport meta tag. (2) Add `padding-top: env(safe-area-inset-top)` to `.topbar` or `.app-shell`.

#### P1-3: Safe area only applied to bottom tabs, nowhere else
- **Description:** `env(safe-area-inset-bottom)` is used only on `.btabs` (line 75). The FAB is at `bottom: 72px` (hardcoded), which does not account for safe areas. The detail modal's sticky edit actions (`detail-edit-actions`, line 206) are `sticky; bottom: 0` with no safe area padding. The page container has `padding-bottom: 56px` (hardcoded for tabs height) -- if safe area adds padding to tabs, content is cut off behind them.
- **Mobile impact:** On iPhone with home indicator, the FAB may overlap or be partially hidden. The "Save"/"Cancel" buttons in edit mode will be partially behind the home indicator.
- **File:line:** `index.css:60,75,206,366`
- **Proposed fix:** Use `env(safe-area-inset-bottom)` on `.page-container` padding-bottom, `.fab` bottom offset, and `.detail-edit-actions` padding-bottom.

#### P1-4: Double haptic vibration on status change
- **Description:** Both `DetailModal.jsx:128` and `useItems.js:113` call `navigator.vibrate(15)` when status changes. The DetailModal triggers it on button click, then `setStatus` triggers it again immediately.
- **Mobile impact:** Double-buzz feels like a hardware glitch. It undermines the otherwise intentional feel of the app.
- **File:line:** `DetailModal.jsx:128`, `useItems.js:113`
- **Proposed fix:** Remove the vibrate call from one location. The hook (`useItems.js`) is the better place since it's the source of truth for status changes.

#### P1-5: File delete button is 14x14px -- impossible to tap accurately
- **Description:** The file delete button in `DetailModal.jsx:204` is styled with `fontSize: 14, padding: 0` (inline styles). This creates a touch target well below the 44x44px minimum recommended by Apple and 48x48dp by Google.
- **Mobile impact:** On a bumpy bus, tapping a 14px target reliably is nearly impossible. Users will accidentally tap the "Open" link next to it instead, opening the file in a new tab and losing their modal context.
- **File:line:** `DetailModal.jsx:204`, same at line 434
- **Proposed fix:** Add `min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center` to the delete button. Alternatively, use a proper `.file-chip-delete` class.

#### P1-6: Unlinked expense delete button has no confirmation and is too small
- **Description:** `BudgetPage.jsx:71` renders a `<button>` with inline styles (`fontSize: 11`) as plain text "delete" with no min-height. It also has no confirmation dialog -- one tap permanently deletes.
- **Mobile impact:** Easy to fat-finger on mobile. No undo. User loses financial data permanently.
- **File:line:** `BudgetPage.jsx:71`
- **Proposed fix:** (1) Add `min-height: 44px` and proper padding. (2) Add a confirmation step (consistent with the confirm() used elsewhere). (3) Consider swipe-to-delete pattern instead.

### P2 -- Medium

#### P2-1: No exit animation on modal dismiss
- **Description:** The modal has `sheet-up` entry animation but no exit animation. It vanishes instantly on close.
- **Mobile impact:** Feels jarring on mobile where users expect physics-based transitions. Every native app has slide-down dismiss.
- **File:line:** `index.css:53,130`
- **Proposed fix:** Add a `sheet-down` animation and trigger it before unmounting (use a `closing` state with `onAnimationEnd`).

#### P2-2: Carousel arrow buttons hidden on touch devices, but no swipe affordance communicated
- **Description:** `@media (hover: none) { .carousel-arrow { display: none } }` hides navigation arrows on touch devices. The scroll-snap carousel works via swipe, but there's no visual hint that swiping is available. The dots are purely decorative (not tappable).
- **Mobile impact:** Users may not realize they can swipe to see more photos, especially if the first photo fills the viewport. The dots suggest pagination but offer no interaction.
- **File:line:** `index.css:149`, `DetailModal.jsx:530-532`
- **Proposed fix:** (1) Make dots tappable (scroll to corresponding slide on tap). (2) Consider showing a subtle peek of the next image at the edge, or a brief animation on first render.

#### P2-3: AddItemModal missing `role="dialog"` and close button has no `aria-label`
- **Description:** `AddItemModal.jsx:102` renders a `detail-overlay` without `role="dialog"` or `aria-modal`. The close button (line 104) has no `aria-label`.
- **Mobile impact:** Screen reader users (VoiceOver on iOS, TalkBack on Android) cannot identify this as a dialog or understand the close button's purpose.
- **File:line:** `AddItemModal.jsx:102,104`
- **Proposed fix:** Add `role="dialog" aria-modal="true" aria-label="Add new item"` to the overlay. Add `aria-label="Close"` to the close button.

#### P2-4: `confirm()` and `alert()` dialogs break PWA immersion
- **Description:** Native `confirm()` is used in `DetailModal.jsx:130,215`, `ExpenseCard.jsx:35`. Native `alert()` is used in `DetailModal.jsx:85,88`. These pop out of the PWA shell with browser-chrome styling and cannot be styled or themed.
- **Mobile impact:** In standalone PWA mode, these dialogs look foreign and break the app's visual consistency. On some Android WebViews they can be partially hidden.
- **File:line:** `DetailModal.jsx:85,88,130,215`, `ExpenseCard.jsx:35`, `AddItemModal.jsx:96`
- **Proposed fix:** Replace with custom modal dialogs using the existing `.modal` CSS classes.

#### P2-5: Page content not scrollable to bottom on iOS when keyboard is open
- **Description:** The edit mode form (`EditMode` in DetailModal.jsx) has many input fields. The sheet has `max-height: 95vh` and the save/cancel bar is `position: sticky; bottom: 0`. On iOS Safari, when the virtual keyboard opens, `vh` does not account for the keyboard, so the sticky bar and lower form fields become unreachable.
- **Mobile impact:** Users editing items cannot see or reach the Save button when the keyboard is open on iPhone. They have to dismiss the keyboard first, scroll down, then tap Save.
- **File:line:** `index.css:130`, `DetailModal.jsx:448`
- **Proposed fix:** Use `max-height: 95dvh` (dynamic viewport height) instead of `95vh`. Also consider using `visualViewport` API to adjust the sticky positioning.

#### P2-6: Font loaded from CDN with no fallback strategy
- **Description:** Geist Sans is loaded from `cdn.jsdelivr.net` via a blocking `<link rel="stylesheet">`. If the CDN is slow or offline, first paint is delayed.
- **Mobile impact:** On 3G, font loading can add 2-5 seconds to first meaningful paint. The font stack includes `system-ui` as fallback, but the CSS load itself blocks rendering.
- **File:line:** `index.html:10`
- **Proposed fix:** (1) Add `font-display: swap` (may need to self-host or use the font-display parameter). (2) Preconnect to the CDN: `<link rel="preconnect" href="https://cdn.jsdelivr.net">`. (3) Consider `<link rel="preload" as="style">` pattern.

### P3 -- Low

#### P3-1: No pull-to-refresh on any page
- **Description:** The app uses `overscroll-behavior: contain` which prevents the default pull-to-refresh behavior, but provides no custom pull-to-refresh implementation. There is no manual refresh button either.
- **Mobile impact:** If data gets stale (realtime connection drops, which is common on mobile), the user has no way to force a refresh except closing and reopening the app.
- **File:line:** `index.css:83`
- **Proposed fix:** Either (a) implement a custom pull-to-refresh, or (b) add a manual refresh button, or (c) show a "connection restored, data refreshed" banner when connectivity resumes.

#### P3-2: FAB z-index stacking can obscure content
- **Description:** The FAB is at `z-index: 500`, fixed at `bottom: 72px; right: 16px`. On small screens, it can overlap the last item in a list, and there's no padding/margin on the page content to account for it.
- **Mobile impact:** On a 375px-wide screen, the FAB may cover the price or status of the bottom-most item card, and the page padding-bottom (24px) is not enough to scroll past it.
- **File:line:** `index.css:60,366`
- **Proposed fix:** Add extra `padding-bottom` to the `.page` class to account for the FAB height, or use a `scroll-padding-bottom`.

#### P3-3: `apple-touch-icon` uses SVG (not supported)
- **Description:** `<link rel="apple-touch-icon" href="/icon-192.svg" />` -- iOS Safari ignores SVG for apple-touch-icon. This is redundant with P1-1 but worth noting separately because the apple-touch-icon path is in a different file.
- **File:line:** `index.html:12`
- **Proposed fix:** Use a PNG file, ideally 180x180.

---

## What the App Does Well

1. **100dvh app shell with overflow containment.** The `.app-shell` uses `height: 100dvh` as a progressive enhancement over `100vh`, and `.page` uses `overscroll-behavior: contain`. This prevents the rubber-banding issue on iOS where the whole page bounces. Well done.

2. **Bottom tabs with safe-area-inset-bottom.** The `.btabs` correctly uses `padding-bottom: max(4px, env(safe-area-inset-bottom))` -- this is the correct pattern for iPhone home indicators on bottom navigation.

3. **Touch target sizes on primary actions.** The bottom tabs, detail buttons, selector pills, and login submit all have `min-height: 44px`, meeting Apple's HIG. The FAB is 48x48. Most primary interactive elements pass the touch target test.

4. **Bottom sheet modal pattern.** Using `align-items: flex-end` on the overlay to position the sheet at the bottom of the viewport, with `border-radius` only on top corners on mobile, is the correct mobile-native pattern. The 480px max-width constraint is appropriate.

5. **Scroll-snap carousel.** The photo carousel uses `scroll-snap-type: x mandatory` with native momentum scrolling (`-webkit-overflow-scrolling: touch`). The scroll event listener uses `{ passive: true }`. This is textbook correct.

6. **`prefers-reduced-motion` support.** The media query at `index.css:55` zeroes out all animation/transition durations. This is respectful of accessibility settings.

7. **Workbox runtime caching strategy.** The service worker configuration is thoughtful: NetworkFirst for API data (with 3s timeout), CacheFirst for static assets like maps/fonts, NetworkOnly for auth. The 3-second timeout for Supabase means cached data will be served quickly on slow connections.

8. **`-webkit-tap-highlight-color: transparent`.** Removes the default tap highlight that makes web apps feel non-native on iOS.

9. **Horizontal scroll strips with hidden scrollbars.** The day selector, filter pills, and budget filters all use `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` while maintaining native scroll behavior. This is clean mobile UX.

10. **Cooperative gesture handling on maps.** `gestureHandling="cooperative"` prevents the map from hijacking scroll on the itinerary page -- this is critical for a page that embeds a map within scrollable content.

---

## Summary

The foundation is sound -- the visual design is clean, primary touch targets are sized correctly, and the Workbox caching strategy is well-configured. But the app has no offline awareness whatsoever (P0), the back button is a trap (P0), the drag handle is a lie (P0), and iOS PWA install will produce a broken icon (P1). These issues are not theoretical -- they are the exact scenarios a trip planner encounters daily during a European trip. Fix the P0s before shipping and address P1s in the next sprint.
