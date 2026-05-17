# UI/Visual Design Review -- Anisita Trip Planner PWA

**Reviewer:** UI/Visual Designer
**Date:** 2026-05-14
**Scope:** Visual consistency, design system maturity, dark mode, polish
**Overall Score:** 6.5 / 10

---

## Score Justification

The app has a clear design direction -- Linear/Vercel-inspired minimal -- and executes on it reasonably well. The CSS custom properties are well-organized, dark mode coverage is better than most side projects, and the component vocabulary (cards, badges, pills, modals) is consistent. However, the design system is undermined by pervasive inline styles that bypass tokens, a typography scale that grew organically without discipline, and several areas where the "last 10%" of visual polish is missing. The foundation is solid; the execution is uneven.

---

## Top Findings

### P0 -- Critical Visual Issues

**F1. Inline hardcoded colors break dark mode**
~32 instances of hardcoded hex colors in JSX inline styles (`#f87171`, `#1967d2`, `#ef4444`, `#888`, `#D97706`, `#fef3c7`, `#92400e`, `#f0fdf4`) that do not respond to dark mode theme changes. These render as light-mode colors on dark backgrounds, creating contrast failures and visual jarring.

- `DetailModal.jsx:148` -- Rating badge uses `background: '#fef3c7', color: '#92400e'` (amber on dark = unreadable)
- `DetailModal.jsx:149` -- Price level badge uses `background: '#f0fdf4', color: '#16a34a'` (green-on-green in dark)
- `DetailModal.jsx:204,433-434` -- File chip "Open" link `color: '#1967d2'` and delete button `color: '#f87171'` -- no dark mode variant
- `BudgetPage.jsx:65` -- `color: '#D97706'` for unlinked warning -- no dark adaptation
- `BudgetPage.jsx:71` -- delete button `color: '#f87171'` -- same
- `BudgetSummary.jsx:69` -- `color: '#888'` inside dark summary card -- already low contrast, gets worse
- `ExpenseCard.jsx:58` -- error message `color: '#ef4444'` -- no dark mode token

**Visual impact:** On dark mode, these elements appear as foreign objects -- wrong background tones, insufficient contrast, broken visual consistency. This is the single biggest visual quality gap.

**Proposed fix:** Extract these into CSS custom properties (e.g., `--color-warning`, `--color-error`, `--color-link`, `--badge-rating-bg`, `--badge-rating-text`) with dark mode overrides in the `[data-theme="dark"]` block. Then use `var(--color-warning)` in either CSS classes or inline styles.

---

### P1 -- High Severity

**F2. Typography scale is ad-hoc -- 13+ distinct sizes with no system**
CSS uses: 9px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, 40px. Inline JSX adds fontSize overrides at 10, 11, 12, 13, 14, 15, 18. The spacing between steps is inconsistent -- 10/11/12/13 is a 1px crawl that creates no meaningful hierarchy.

- `index.css` throughout -- 13 distinct sizes
- Inline styles add yet more overrides (e.g., `ExpenseCard.jsx:56` overrides `.detail-name` from 20px to 18px; `AddExpenseModal.jsx:50` does the same)

**Visual impact:** The type scale works in practice because the weight/color combinations compensate, but it is fragile. Adding new UI risks creating more size drift. The 10/11/12/13px cluster is perceptually indistinguishable to most users.

**Proposed fix:** Consolidate to a 6-step scale using CSS custom properties: `--text-xs: 10px`, `--text-sm: 12px`, `--text-base: 14px`, `--text-lg: 16px`, `--text-xl: 20px`, `--text-2xl: 24px`. Eliminate 9px, 11px, 13px, 15px by rounding to nearest step.

---

**F3. 117 inline style declarations fragment the design system**
Across 17 JSX files, 117 `style={{}}` occurrences. Many are structural (flex, gap, marginTop) but many also set colors, font sizes, and spacing that should be in CSS classes. This makes the system harder to audit, harder to theme, and creates a parallel styling layer.

Key offenders by count:
- `DetailModal.jsx` -- 36 inline styles
- `AddExpenseModal.jsx` -- 13
- `StopSection.jsx` -- 11
- `ExpenseCard.jsx` -- 10

**Visual impact:** Medium. Most inline styles happen to use `var()` references, which is good. But a significant minority use raw values (see F1). The pattern also makes responsive adjustments impossible for inline-styled properties.

**Proposed fix:** Extract recurring inline patterns into utility classes. Priority targets: `{ fontSize: 18 }` on modal titles (create `.detail-name-sm`), `{ fontSize: 12, color: 'var(--text-muted)' }` (already matches `.detail-est-price` or similar), margin/padding overrides.

---

**F4. No exit animations on modals or sheets**
`sheet-up` and `fade-in` animations exist for modal entry, but there are no corresponding exit animations. Modals vanish instantly when closed. This is noticeable because the *entry* animation sets an expectation of motion that the *exit* violates.

- `index.css:53` -- `@keyframes sheet-up` (entry only)
- `index.css:52` -- `@keyframes fade-in` (entry only)

**Visual impact:** The abrupt disappearance feels jarring, especially on the DetailModal which uses a backdrop blur. The user's eye has no time to track where content went.

**Proposed fix:** Add `sheet-down` and `fade-out` keyframes. Use a state-driven approach (e.g., `closing` state + `onAnimationEnd` callback) to play exit animation before unmounting.

---

### P2 -- Medium Severity

**F5. No max-width constraint on wide screens**
The `.page` class has no `max-width`. On a 1440px+ display, content stretches edge-to-edge (minus padding). The items grid goes to 3 columns at 1200px but has no cap. Budget summary, cards, and text lines can become uncomfortably wide.

- `index.css:83-86` -- `.page` has padding but no max-width
- `index.css:107` -- `.items-grid` goes to 3 columns but cards stretch infinitely

**Visual impact:** On desktop, line lengths exceed comfortable reading width (~80ch). The app looks "stretched" rather than intentionally designed for large screens.

**Proposed fix:** Add `max-width: 1200px; margin-inline: auto;` to `.page`, or wrap content in a container with that constraint.

---

**F6. Empty state inconsistency -- two different patterns**
There are two empty state styles used interchangeably:
1. `.empty-state` -- centered with icon, title, and text (used in `SelectPage.jsx:109`)
2. `.itin-empty` -- simpler text-only (used in `BudgetPage.jsx:52,99`, `StopSection.jsx:141`)

**Visual impact:** Low-medium. Users see different empty states depending on the tab, which breaks the perception of a unified app.

**Proposed fix:** Standardize on `.empty-state` for all cases. If a lighter variant is needed, create `.empty-state--compact`.

---

**F7. Focus ring on inputs but not on interactive elements**
`edit-input:focus`, `plan-search:focus`, etc. have a well-designed focus style (`border-color: var(--accent); box-shadow: 0 0 0 2px rgba(124,58,237,.1)`). But buttons (`.detail-btn`, `.fp`, `.stop-chip`, `.btab`, `.fab`) have no visible focus indicator at all.

- `index.css:214,216` -- inputs have focus styles
- `index.css:230-234` -- buttons have no `:focus` or `:focus-visible`

**Visual impact:** Keyboard users get no visual feedback when tabbing through buttons. This is both an a11y and a visual polish issue.

**Proposed fix:** Add `:focus-visible` styles to all interactive elements. A simple global rule works: `button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.

---

**F8. PricingBlock in DetailModal uses a div-as-button pattern**
The "Add confirmed cost" / expense amount display is a `<div onClick={...}>` with `cursor: pointer` but no button semantics. Visually it looks tappable but provides no hover/active feedback.

- `DetailModal.jsx:480-489` -- clickable div with inline styles

**Visual impact:** The element looks like a card, not a button. Users may not realize it is interactive. No hover state, no active state, no focus state.

**Proposed fix:** Replace with `<button>` element. Add hover state via CSS class (e.g., reuse `.budget-item:hover` pattern).

---

### P3 -- Low Severity

**F9. Shadow system uses border-based approach but inconsistently**
`--shadow-sm` and `--shadow-md` use `0 0 0 1px var(--border)` (outline via box-shadow) which is a deliberate Linear-style choice. But `.fab` uses `--shadow-md` which adds this outline ring to a circular element -- the 1px outline at border-radius 50% creates a slightly visible ring artifact.

- `index.css:366` -- `.fab` uses `box-shadow: var(--shadow-md)`

**Visual impact:** Minor. The ring is subtle but technically imprecise.

**Proposed fix:** Use a dedicated shadow for the FAB: `box-shadow: 0 4px 12px rgba(0,0,0,0.15);` (no outline ring).

---

**F10. `prefers-reduced-motion` support is good but animation durations are inconsistent**
The reduced motion media query at line 55 is correctly implemented. However, `--duration: 0.12s` is used for transitions, while keyframe animations use hardcoded values (`0.15s`, `0.25s`, `0.2s`, `1.5s`, `1.6s`). These should reference tokens for consistency.

- `index.css:34` -- `--duration: 0.12s` defined but only used for transitions
- `index.css:52-54` -- keyframes use hardcoded durations

**Visual impact:** Negligible. The reduced-motion query catches all animations regardless. But the inconsistency indicates the animation system isn't fully tokenized.

---

**F11. Carousel dots use a `<span>` instead of a `<button>`**
`PhotoCarousel` renders dots as `<span className="carousel-dot">` with no interactivity. While the arrows handle navigation, tapping a dot to jump to a slide is an expected pattern, especially on mobile where arrows are hidden (`@media (hover: none)`).

- `DetailModal.jsx:531` -- carousel dots are non-interactive spans
- `index.css:149` -- arrows hidden on touch devices

**Visual impact:** On mobile, the dots suggest interactivity but do nothing. The user has to swipe, which is fine, but the dots create a false affordance.

**Proposed fix:** Either make dots tappable buttons, or remove them on touch devices.

---

## What the App Does Well Visually

1. **Intentional design language.** The Linear/Vercel-minimal aesthetic is not an accident. The neutral palette with purple accent, the border-based shadows, the restrained use of color -- all point to a deliberate design decision executed with taste.

2. **Dark mode is genuinely good.** The `[data-theme="dark"]` overrides are thoughtful -- `#0A0A0A` background, properly dimmed secondary text, green/accent colors retained. The `--surface-hover` adjusts for dark. The alert/error blocks have explicit dark overrides. This is above average for a side project.

3. **Consistent component vocabulary.** Cards, badges, pills, modals, section titles, and empty states share a recognizable DNA. The `.detail-sheet` bottom-sheet pattern is reused for DetailModal, ExpenseCard, AddItemModal, AddStopModal, AddExpenseModal -- good consistency.

4. **Responsive breakpoints are sensible.** 640/768/960/1200px breakpoints with grid column transitions (1->2->3) and padding adjustments. The `100dvh` usage for app shell is correct for mobile browsers.

5. **Animation is purposeful.** Skeleton shimmer, sheet slide-up, toast entrance, progress bar transitions -- each has a clear purpose. `prefers-reduced-motion` is respected. No gratuitous motion.

6. **Touch targets meet minimum sizes.** Buttons specify `min-height: 44px` or `min-height: 40px` consistently. Bottom tabs at 44px. Filter pills at 36px. This is correct for mobile.

7. **Tabular numerics throughout.** `font-variant-numeric: tabular-nums` is applied consistently on price displays, budget amounts, and progress values. Small detail, executed well.

8. **Color semantics are clear.** Purple = accent/selected, green = confirmed/booked, red = delete/error/warning, amber = unlinked/caution. The mapping is consistent and learnable.

---

## Recommendation

**APPROVE_WITH_FIXES**

The design foundation is solid and the aesthetic is coherent. The P0 finding (inline hardcoded colors breaking dark mode) should be fixed before any public launch -- it is the only finding that creates a genuinely broken visual experience. The P1 findings (typography scale, inline styles, exit animations) represent design debt that will compound as the app grows but are not blockers for the current scope. The app looks good today; these fixes ensure it stays good.
