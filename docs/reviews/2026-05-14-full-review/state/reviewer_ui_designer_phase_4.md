# UI/Visual Designer -- Phase 4 Confidence Calibration

**Reviewer:** UI/Visual Designer
**Date:** 2026-05-14

---

## Finding-by-Finding Re-verification

### F1. Inline hardcoded colors break dark mode (P0)
**Confidence: HIGH**

Re-read confirmed every cited line:
- `DetailModal.jsx:148` -- `style={{ background: '#fef3c7', color: '#92400e' }}` on rating badge. Confirmed.
- `DetailModal.jsx:149` -- `style={{ background: '#f0fdf4', color: '#16a34a' }}` on price level badge. Confirmed.
- `DetailModal.jsx:204,433-434` -- File chip "Open" link `color: '#1967d2'` and delete button `color: '#f87171'`. Confirmed at lines 204 and 433-434 (summary mode and edit mode both have identical patterns).
- `BudgetPage.jsx:65` -- `color: '#D97706'` for "Not linked to an item". Confirmed.
- `BudgetPage.jsx:71` -- delete button `color: '#f87171'`. Confirmed.
- `BudgetSummary.jsx:69` -- `color: '#888'` for "X booked / Y selected" text. Confirmed.
- `ExpenseCard.jsx:58` -- `color: '#ef4444'` for error message. Confirmed.

Additional instances found in CSS that were not inline but also use hardcoded colors in dark-sensitive contexts:
- `index.css:95` -- `.summary-label { color: #888 }` (inside dark summary card)
- `index.css:100` -- `.bd-row { color: #888 }` (inside dark summary card)
- `index.css:334` -- `.summary-bd-header { color: #666 }` (inside dark summary card)
- `index.css:344` -- `.budget-label { color: #888 }` (inside dark summary card)

These CSS ones are less problematic because the summary card has `--summary-bg: #111` in light mode and `#161616` in dark mode -- `#888` on both backgrounds provides adequate contrast (roughly 5:1 on `#111`, 4.3:1 on `#161616`). Still, they bypass the token system.

**New on re-read:** The PricingBlock at `DetailModal.jsx:480` uses all `var()` references for its inline styles (`var(--bg-card-hd)`, `var(--radius)`, `var(--border)`, `var(--text-muted)`, `var(--green)`, `var(--accent)`). This is actually correct dark mode usage. My original finding correctly focused on the *other* inline styles that use raw hex.

---

### F2. Typography scale is ad-hoc (P1)
**Confidence: MEDIUM**

Re-read confirmed the CSS uses these distinct pixel sizes: 9px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, 40px. That is 13 sizes, as stated.

Inline JSX adds fontSize overrides: `ExpenseCard.jsx:56` uses `fontSize: 18` on `.detail-name` (normally 20px). `AddExpenseModal.jsx:50,90` does the same. These are confirmed.

However, my claim that "the 10/11/12/13px cluster is perceptually indistinguishable" is overstated. On high-DPI screens (which this PWA targets), 10px vs 13px is perceptible. The issue is real -- there are too many sizes -- but the severity claim was slightly inflated. The scale works in practice because each size is paired with distinct weight/color/case treatments.

---

### F3. 117 inline style declarations (P1)
**Confidence: HIGH**

Re-verified by running grep: exactly 117 `style={{}}` occurrences across exactly 17 JSX files. Breakdown matches:
- `DetailModal.jsx` -- 36. Confirmed.
- `AddExpenseModal.jsx` -- 13. Confirmed.
- `StopSection.jsx` -- 11. Confirmed.
- `ExpenseCard.jsx` -- 10. Confirmed.

My note that "most inline styles happen to use `var()` references" is also confirmed -- many do use token references (e.g., `color: 'var(--text-muted)'`, `background: 'var(--bg-card-hd)'`). The problem is the minority that use raw hex values (covered by F1) and the structural fragmentation.

---

### F4. No exit animations on modals (P1)
**Confidence: HIGH**

Re-read `index.css:52-53`: only `fade-in` and `sheet-up` keyframes exist. No `fade-out`, `sheet-down`, or any exit animation. The modal components (`DetailModal.jsx`, `ExpenseCard.jsx`, `AddExpenseModal.jsx`, `AddItemModal.jsx`, `AddStopModal.jsx`) all unmount immediately on close -- no `closing` state, no `onAnimationEnd` handler.

This is structurally verifiable and unambiguous.

---

### F5. No max-width constraint on wide screens (P2)
**Confidence: HIGH**

Re-read `index.css:83-86`: `.page` has `padding: 16px` (and responsive padding increases) but no `max-width`. The only `max-width` on page-level content is on `.detail-sheet` (480-700px) and `.modal` (380px), not on page containers.

`.items-grid` at line 107 goes to 3 columns at 1200px with no cap. The grid cells stretch to fill available width.

This is verifiable by reading the CSS. No ambiguity.

---

### F6. Empty state inconsistency (P2)
**Confidence: HIGH**

Two patterns confirmed:
1. `.empty-state` with `.empty-state-title` + `.empty-state-text` -- used at `SelectPage.jsx:109`.
2. `.itin-empty` with `.itin-empty-text` -- used at `BudgetPage.jsx:52,99`, `StopSection.jsx:141`, `AddExpenseModal.jsx:60`.

These are visually different: `.empty-state` is centered with 60px padding and a separate title element; `.itin-empty` is simpler with 24px padding, centered text, no title separation. Both exist in the CSS at lines 285-288 and 552-553 respectively.

---

### F7. Focus ring on inputs but not on interactive elements (P2)
**Confidence: HIGH**

Re-read confirms: 11 `:focus` rules exist, all on input/textarea/select elements. Zero `:focus` or `:focus-visible` rules exist for `button`, `.detail-btn`, `.fp`, `.stop-chip`, `.btab`, `.fab`, or any other interactive element. Grep returned no matches for `focus-visible` at all.

---

### F8. PricingBlock div-as-button pattern (P2)
**Confidence: HIGH**

`DetailModal.jsx:480` -- `<div onClick={onExpenseClick} style={{ cursor: 'pointer', ... }}>`. This is a `<div>` with `onClick` and `cursor: pointer`. No `role="button"`, no `tabIndex`, no keyboard handler, no hover/active CSS state.

---

### F9. Shadow system inconsistency on FAB (P3)
**Confidence: LOW**

Re-read `index.css:366`: `.fab` uses `box-shadow: var(--shadow-md)`. And `--shadow-md` is `0 0 0 1px var(--border), 0 2px 4px rgba(0,0,0,0.04)`. The 1px outline ring on a `border-radius: 50%` element -- I claimed this "creates a slightly visible ring artifact." This is subjective and likely imperceptible in practice. The `0 0 0 1px` spread-based outline renders correctly on circular elements in modern browsers. My claim of a "ring artifact" is speculative.

---

### F10. Animation duration inconsistency (P3)
**Confidence: MEDIUM**

`--duration: 0.12s` is defined at line 34 and used for `transition` properties throughout. Keyframe animations use hardcoded durations: `shimmer 1.6s`, `fade-in .15s`, `sheet-up .25s`, `toast-in .2s`. These are different values but also serve different purposes -- transition hover states vs. entrance animations have legitimately different timing needs. The finding is technically accurate but the "should reference tokens" recommendation is debatable. Many design systems intentionally keep keyframe durations separate from transition durations.

---

### F11. Carousel dots are non-interactive spans (P3)
**Confidence: HIGH**

`DetailModal.jsx:531` -- `<span key={i} className={`carousel-dot ${i === activeIdx ? 'active' : ''}`} />`. These are plain `<span>` elements with no `onClick`, no `role`, no interactivity. On mobile, the carousel arrows are hidden (CSS line 149: `@media (hover: none) { .carousel-arrow { display: none } }`), so the only navigation is swiping. The dots visually suggest tappability but do nothing.

---

## 3 MOST Defensible Findings (strongest evidence)

1. **F1 -- Inline hardcoded colors break dark mode.** Every cited line is verified with exact hex values. The dark mode impact is mechanically certain: `#fef3c7` background on a `#161616` dark card is objectively wrong. No interpretation needed.

2. **F3 -- 117 inline style declarations.** Exact count verified by grep. File-by-file breakdown matches. This is a countable, objective metric.

3. **F7 -- No focus styles on interactive elements.** Verified by exhaustive grep of the CSS file. Zero `:focus` or `:focus-visible` rules for buttons. This is a binary fact with accessibility implications (WCAG 2.4.7 failure).

## 3 LEAST Defensible Findings (weakest evidence)

1. **F9 -- Shadow ring artifact on FAB.** The claim of a "visible ring artifact" on circular elements using `0 0 0 1px` box-shadow is speculative. Modern browsers render this correctly. I have no screenshot evidence of an actual artifact. This finding was likely wrong.

2. **F10 -- Animation duration inconsistency.** While technically accurate that keyframe durations don't reference `--duration`, the recommendation to tokenize them is debatable. Entrance animations (250ms) and hover transitions (120ms) serve different purposes and many design systems intentionally keep them separate. The finding is true but the severity/recommendation was weak.

3. **F2 -- Typography scale severity.** The 13 distinct sizes are real and countable, but my claim that the 10/11/12/13px range is "perceptually indistinguishable" overstates the problem on Retina displays. The scale works in practice because size is always paired with weight, color, and case treatments. The debt is real but the urgency was inflated.

## New Issues Found on Second Pass

1. **CSS hardcoded colors inside the summary card context.** `.summary-label`, `.bd-row`, `.budget-label`, `.summary-bd-header`, `.budget-meta` all use hardcoded `#888`, `#666`, or `#999` instead of `var(--text-muted)`. These live inside `.budget-summary` which has `background: var(--summary-bg)` (dark in both modes), so contrast is acceptable, but they bypass the token system and would break if the summary card background ever changed.

2. **`AddExpenseModal.jsx:75` has a likely bug:** `{stop?.name && <span> . {stop.sleep}</span>}` -- this references `stop.sleep` which does not appear to be a valid field. This is a functional bug, not a visual one, but I noticed it on re-read.

3. **Inconsistent overlay click-to-close behavior.** `AddExpenseModal.jsx:42` has `onClick={onClose}` on the overlay div but no `role="dialog"` or `aria-modal="true"`, unlike `DetailModal.jsx:107` and `ExpenseCard.jsx:50` which do include those attributes. Minor a11y inconsistency.
