# Anisita Pending Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 pending items (3 quick fixes, 4 features, 1 investigation) for the Anisita trip planner PWA.

**Architecture:** All 8 tasks are independent — no shared state or file conflicts between them. Each task is self-contained and can be executed by a separate subagent in parallel.

**Tech Stack:** React 19, Vite 8, Supabase, JavaScript (no TypeScript), CSS (no framework)

**CRITICAL — Every subagent must:**
1. Read the target file(s) first and verify the issue still exists before making changes
2. If the issue is already fixed, report "Already fixed" and skip
3. Run `npm run build` after changes to verify no build errors
4. Commit changes on the `dev` branch

---

### Task 1: Status selector in edit mode

**Files:**
- Modify: `src/shared/components/DetailModal.jsx`

**Context:** DetailModal has two modes: summary (line 112+) and EditMode (line 249+). Summary mode has a status-selector (lines 129-152) that saves immediately via `setStatus`. EditMode currently receives NO status-related props and has no status selector.

- [ ] **Step 1: Verify the issue exists**

Read `src/shared/components/DetailModal.jsx`. Check if EditMode (the function starting around line 249) has a `status-selector` div or receives `setStatus` as a prop. If it already does, report "Already fixed" and stop.

- [ ] **Step 2: Pass status props to EditMode**

In the DetailModal parent function, find the `<EditMode` JSX (around line 106). Add these props:

```jsx
// Change this line (around line 106):
return <EditMode it={it} stops={stops} livePrice={livePrice} livePriceRates={livePriceRates}
  expenseAmount={expenseAmount} onExpenseClick={() => { setEditing(false); setShowExpenseCard(true); }}
  updateItem={updateItem} onClose={() => setEditing(false)} showSaved={showSaved} saved={saved}
  itemFiles={itemFiles} uploading={uploading} handleUpload={handleUpload} handleRemoveFile={handleRemoveFile} />;

// To this:
return <EditMode it={it} stops={stops} livePrice={livePrice} livePriceRates={livePriceRates}
  expenseAmount={expenseAmount} onExpenseClick={() => { setEditing(false); setShowExpenseCard(true); }}
  updateItem={updateItem} onClose={() => setEditing(false)} showSaved={showSaved} saved={saved}
  itemFiles={itemFiles} uploading={uploading} handleUpload={handleUpload} handleRemoveFile={handleRemoveFile}
  setStatus={setStatus} status={st} itemExpenses={itemExpenses} deleteExpense={deleteExpense} />;
```

- [ ] **Step 3: Destructure new props in EditMode**

Find the EditMode function signature (around line 250):

```jsx
// Change:
function EditMode({ it, stops, livePrice, livePriceRates, expenseAmount, onExpenseClick, updateItem, onClose, showSaved, saved, itemFiles, uploading, handleUpload, handleRemoveFile }) {

// To:
function EditMode({ it, stops, livePrice, livePriceRates, expenseAmount, onExpenseClick, updateItem, onClose, showSaved, saved, itemFiles, uploading, handleUpload, handleRemoveFile, setStatus, status, itemExpenses, deleteExpense }) {
```

- [ ] **Step 4: Add status selector JSX into EditMode**

In EditMode's return JSX, find this section (around line 354):

```jsx
        <div className="detail-content">
          {saved && <div className="detail-saved">{saved}</div>}

          {/* Basic */}
          <div className="edit-section-title">Basic Info</div>
```

Insert the status selector between `{saved && ...}` and the "Basic Info" section title:

```jsx
        <div className="detail-content">
          {saved && <div className="detail-saved">{saved}</div>}

          {/* Status — saves immediately, not batched */}
          {setStatus && (
            <div className="status-selector" style={{ margin: '12px 0' }}>
              {[{ value: '', label: 'Not added', cls: '' }, { value: 'sel', label: 'Selected', cls: 'sel' }, { value: 'conf', label: 'Confirmed', cls: 'conf' }].map(opt => (
                <button key={opt.value} className={`status-option ${opt.cls} ${(status || '') === opt.value ? 'active' : ''}`}
                  onClick={async () => {
                    if (opt.value === (status || '')) return;
                    if (navigator.vibrate) navigator.vibrate(15);
                    if ((status || '') === 'conf' && opt.value !== 'conf' && expenseAmount > 0) {
                      if (itemExpenses?.length > 0) {
                        for (const exp of itemExpenses) {
                          try { await deleteExpense(exp.id); } catch (err) { console.warn('Failed to delete expense:', err); }
                        }
                      }
                    }
                    setStatus(it.id, opt.value);
                  }}>
                  {opt.value === 'conf' ? '\u2713' : opt.value === 'sel' ? '\u25CF' : '\u25CB'} {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Basic */}
          <div className="edit-section-title">Basic Info</div>
```

- [ ] **Step 5: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/shared/components/DetailModal.jsx
git commit -m "feat: add status selector to DetailModal edit mode"
```

---

### Task 2: Confirm without expense

**Files:**
- Modify: `src/shared/components/DetailModal.jsx`

**Context:** In the summary mode status selector (around line 135), clicking "Confirmed" calls `setStatus` AND opens ExpenseCard. The `setShowExpenseCard(true)` is coupled — user can't confirm without being forced into expense entry.

- [ ] **Step 1: Verify the issue exists**

Read `src/shared/components/DetailModal.jsx`. Find the line where clicking 'conf' opens ExpenseCard (around line 135):
```jsx
if (opt.value === 'conf' && st !== 'conf') { setStatus(it.id, 'conf'); setShowExpenseCard(true); return; }
```
If this line no longer exists or already allows dismissal without expense, report "Already fixed" and stop.

- [ ] **Step 2: Decouple status from expense entry**

The current code already calls `setStatus` first then opens ExpenseCard. The issue is the `return` statement — it prevents falling through. The real problem is that ExpenseCard is opened unconditionally. The fix is to keep this behavior (prompt is useful) but ensure the user can dismiss ExpenseCard without it reverting the status.

Check the ExpenseCard component to verify it doesn't revert status on close. The `setShowExpenseCard(false)` on close should be sufficient — the status was already saved via `setStatus`.

If the ExpenseCard's `onClose` does NOT revert the status (just calls `setShowExpenseCard(false)`), then the behavior is actually already correct — user CAN dismiss without entering an expense. In that case, report "Already working correctly — ExpenseCard is dismissible without reverting status" and stop.

If ExpenseCard's onClose DOES revert status, fix it by removing the revert logic.

- [ ] **Step 3: Build and commit (if changes were made)**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/shared/components/DetailModal.jsx
git commit -m "fix: allow confirming items without requiring expense entry"
```

---

### Task 3: Profile back button

**Files:**
- Modify: `src/features/auth/ProfilePage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/index.css`

**Context:** ProfilePage (88 lines) has no navigation back. BottomTabs is hidden when profile tab is active (App.jsx line 102). User is stuck unless they use browser back.

- [ ] **Step 1: Verify the issue exists**

Read `src/features/auth/ProfilePage.jsx`. Check if there's already a back button or `onBack` prop. If yes, report "Already fixed" and stop.

- [ ] **Step 2: Add onBack prop and back button to ProfilePage**

In `src/features/auth/ProfilePage.jsx`, change the function signature and add the back button:

```jsx
// Change:
export default function ProfilePage({ session }) {

// To:
export default function ProfilePage({ session, onBack }) {
```

Add the back button as the first element inside the outer div:

```jsx
  return (
    <div id="page-profile" className="page active">
      {onBack && (
        <button className="profile-back-btn" onClick={onBack}>
          <span aria-hidden="true">&larr;</span> Back
        </button>
      )}
      <div className="card">
```

- [ ] **Step 3: Pass onBack from AppShell**

In `src/App.jsx`, find the ProfilePage render (around line 78):

```jsx
// Change:
{isProfile && <ProfilePage session={session} />}

// To:
{isProfile && <ProfilePage session={session} onBack={() => navigateTab('itinerary')} />}
```

- [ ] **Step 4: Add CSS for back button**

In `src/index.css`, add after the profile-related styles (search for `profile-avatar` to find the right area):

```css
.profile-back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--accent); font-size: var(--text-sm); font-weight: 600; padding: 0 0 12px; cursor: pointer }
.profile-back-btn:active { opacity: 0.7 }
```

- [ ] **Step 5: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/features/auth/ProfilePage.jsx src/App.jsx src/index.css
git commit -m "feat: add back button to profile page"
```

---

### Task 4: Sticky sort + filter buttons (Booking.com pattern)

**Files:**
- Modify: `src/features/plan/FilterBar.jsx`
- Modify: `src/index.css`

**Context:** Current FilterBar (83 lines) has 4 rows: search+sort, type pills, status pills, city dropdown. Takes ~160px on mobile. Replace with compact buttons that open bottom-sheet modals.

- [ ] **Step 1: Verify current state**

Read `src/features/plan/FilterBar.jsx`. Confirm it still has the 4-row inline layout. If already using modals, report "Already fixed" and stop.

- [ ] **Step 2: Rewrite FilterBar with compact layout + modals**

Replace the entire content of `src/features/plan/FilterBar.jsx` with:

```jsx
import { useState, useMemo } from 'react';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'stay', label: 'Stays' },
  { value: 'activity', label: 'Activities' },
  { value: 'transport', label: 'Transport' },
];

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'sel', label: 'Selected' },
  { value: 'conf', label: 'Booked' },
  { value: 'none', label: 'Not added' },
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name-asc', label: 'Name: A \u2192 Z' },
  { value: 'name-desc', label: 'Name: Z \u2192 A' },
  { value: 'price-asc', label: 'Price: Low \u2192 High' },
  { value: 'price-desc', label: 'Price: High \u2192 Low' },
  { value: 'date-asc', label: 'Date: Soonest' },
  { value: 'date-desc', label: 'Date: Latest' },
  { value: 'status', label: 'Status' },
];

export default function FilterBar({ filters, setFilters, items, sortBy, setSortBy }) {
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const cities = useMemo(() => {
    const set = new Set((items || []).map(i => i.city).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const activeFilterCount = [
    filters.type !== 'all' ? 1 : 0,
    filters.status !== 'all' ? 1 : 0,
    filters.city !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort';

  return (
    <>
      <div className="plan-filters-compact">
        <input
          type="search" className="plan-search" placeholder="Search items..."
          value={filters.search} onChange={(e) => update('search', e.target.value)}
        />
        <div className="plan-filter-btns">
          <button className={`plan-filter-btn ${sortBy !== 'default' ? 'plan-filter-btn-active' : ''}`} onClick={() => setShowSort(true)}>
            Sort{sortBy !== 'default' ? `: ${sortLabel}` : ''}
          </button>
          <button className={`plan-filter-btn ${activeFilterCount > 0 ? 'plan-filter-btn-active' : ''}`} onClick={() => setShowFilter(true)}>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {/* Sort bottom sheet */}
      {showSort && (
        <div className="bsheet-overlay" onClick={() => setShowSort(false)}>
          <div className="bsheet" onClick={e => e.stopPropagation()}>
            <div className="bsheet-header">
              <span className="bsheet-title">Sort by</span>
              <button className="bsheet-close" onClick={() => setShowSort(false)}>\u2715</button>
            </div>
            <div className="bsheet-body">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} className={`bsheet-option ${sortBy === o.value ? 'bsheet-option-active' : ''}`}
                  onClick={() => { setSortBy(o.value); setShowSort(false); }}>
                  {o.label}
                  {sortBy === o.value && <span className="bsheet-check">\u2713</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bottom sheet */}
      {showFilter && (
        <div className="bsheet-overlay" onClick={() => setShowFilter(false)}>
          <div className="bsheet" onClick={e => e.stopPropagation()}>
            <div className="bsheet-header">
              <span className="bsheet-title">Filters</span>
              <button className="bsheet-close" onClick={() => setShowFilter(false)}>\u2715</button>
            </div>
            <div className="bsheet-body">
              <div className="bsheet-section">
                <div className="bsheet-section-label">Type</div>
                <div className="plan-filter-pills">
                  {TYPES.map((t) => (
                    <button key={t.value} className={`fp ${filters.type === t.value ? 'fp-active' : ''}`}
                      onClick={() => update('type', t.value)}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div className="bsheet-section">
                <div className="bsheet-section-label">Status</div>
                <div className="plan-filter-pills">
                  {STATUSES.map((s) => (
                    <button key={s.value} className={`fp ${filters.status === s.value ? 'fp-active' : ''}`}
                      onClick={() => update('status', s.value)}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="bsheet-section">
                <div className="bsheet-section-label">City</div>
                <select className="plan-filter-select" value={filters.city} onChange={(e) => update('city', e.target.value)}>
                  {cities.map((c) => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button className="bsheet-reset" onClick={() => { setFilters(f => ({ ...f, type: 'all', status: 'all', city: 'all' })); setShowFilter(false); }}>
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Add CSS for compact filter bar and bottom sheets**

In `src/index.css`, find the existing `.plan-filters` styles and add the new ones after them:

```css
/* Compact filter bar */
.plan-filters-compact { display: flex; flex-direction: column; gap: 8px }
.plan-filter-btns { display: flex; gap: 8px }
.plan-filter-btn { flex: 1; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); font-size: var(--text-sm); font-weight: 600; color: var(--text); cursor: pointer; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.plan-filter-btn-active { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,.08) }

/* Bottom sheet */
.bsheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center }
.bsheet { background: var(--bg); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 500px; max-height: 70vh; display: flex; flex-direction: column; animation: bsheet-up .2s ease-out }
@keyframes bsheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
.bsheet-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border) }
.bsheet-title { font-weight: 700; font-size: var(--text-base) }
.bsheet-close { background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer; padding: 4px }
.bsheet-body { padding: 8px 16px 24px; overflow-y: auto }
.bsheet-option { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 12px 4px; background: none; border: none; border-bottom: 1px solid var(--border-light); font-size: var(--text-sm); color: var(--text); cursor: pointer; text-align: left }
.bsheet-option:last-child { border-bottom: none }
.bsheet-option-active { color: var(--accent); font-weight: 600 }
.bsheet-check { color: var(--accent); font-weight: 700 }
.bsheet-section { margin-bottom: 16px }
.bsheet-section-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em }
.bsheet-reset { width: 100%; padding: 10px; background: none; border: 1px solid var(--border); border-radius: var(--radius); font-size: var(--text-sm); color: var(--text-muted); cursor: pointer; margin-top: 8px }
```

- [ ] **Step 4: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/features/plan/FilterBar.jsx src/index.css
git commit -m "feat: replace inline filters with compact sort+filter bottom sheets"
```

---

### Task 5: Time conflict alerts

**Files:**
- Modify: `src/features/itinerary/utils.js`
- Modify: `src/features/itinerary/StopSection.jsx`
- Modify: `src/features/itinerary/OverviewView.jsx`
- Modify: `src/index.css`

**Context:** `utils.js` has shared helpers (113 lines). StopSection renders each stop's itinerary. OverviewView shows trip summary with stop cards.

- [ ] **Step 1: Verify no existing conflict detection**

Read `src/features/itinerary/utils.js`. Grep for "conflict" in the itinerary directory. If conflict detection already exists, report "Already implemented" and stop.

- [ ] **Step 2: Add detectConflicts function to utils.js**

Append to `src/features/itinerary/utils.js`:

```js
export function detectConflicts(items, stops) {
  const stopConflicts = [];
  const itemConflicts = [];

  // Stop-level: overlapping date ranges
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const aStart = toDateStr(stops[i].start_date);
      const aEnd = toDateStr(stops[i].end_date);
      const bStart = toDateStr(stops[j].start_date);
      const bEnd = toDateStr(stops[j].end_date);
      if (aStart && aEnd && bStart && bEnd && aStart <= bEnd && bStart <= aEnd) {
        stopConflicts.push({ stop1: stops[i], stop2: stops[j] });
      }
    }
  }

  // Item-level: overlapping start_time/end_time within same stop
  const itemsByStop = {};
  items.forEach(it => {
    if (!it.start_time || !it.end_time) return;
    if (it.status !== 'sel' && it.status !== 'conf') return;
    (it.stop_ids || []).forEach(sid => {
      if (!itemsByStop[sid]) itemsByStop[sid] = [];
      itemsByStop[sid].push(it);
    });
  });

  Object.entries(itemsByStop).forEach(([stopId, stopItems]) => {
    for (let i = 0; i < stopItems.length; i++) {
      for (let j = i + 1; j < stopItems.length; j++) {
        const a = stopItems[i], b = stopItems[j];
        if (a.start_time < b.end_time && b.start_time < a.end_time) {
          itemConflicts.push({ item1: a, item2: b, stopId });
        }
      }
    }
  });

  return { stopConflicts, itemConflicts };
}
```

- [ ] **Step 3: Add conflict banner to StopSection**

In `src/features/itinerary/StopSection.jsx`, add the import and conflict detection:

```jsx
// Add to imports at top:
import { toDateStr, formatStopDate, calcNights, itemInStop, getStay, detectConflicts } from './utils';
```

Add a useMemo for conflicts after the existing useMemo blocks (after `planItems`):

```jsx
  const conflicts = useMemo(() => {
    const { itemConflicts } = detectConflicts(items, [stop]);
    return itemConflicts.filter(c => c.stopId === stop.id);
  }, [items, stop]);
```

Insert the conflict banner in the JSX, right after `</div>` that closes `itin-general` (after line 131):

```jsx
      {conflicts.length > 0 && (
        <div className="conflict-banner">
          {conflicts.map((c, i) => (
            <div key={i} className="conflict-item">
              Time overlap: {c.item1.name} and {c.item2.name}
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Add stop conflict banner to OverviewView**

In `src/features/itinerary/OverviewView.jsx`, add import and detection:

```jsx
// Add to imports:
import { formatStopDate, calcNights, formatRelativeTime, getStay, getStopStats, detectConflicts } from './utils';
```

Add conflict detection inside the component (after the `recentItems` useMemo):

```jsx
  const { stopConflicts } = useMemo(() => detectConflicts(items, stops), [items, stops]);
```

Insert the conflict banner after the `home-stats` div and before `itin-map-schedule`:

```jsx
      {stopConflicts.length > 0 && (
        <div className="conflict-banner">
          {stopConflicts.map((c, i) => (
            <div key={i} className="conflict-item">
              Date overlap: {c.stop1.name} and {c.stop2.name}
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 5: Add CSS for conflict banner**

In `src/index.css`, add:

```css
/* Conflict alerts */
.conflict-banner { background: rgba(234,179,8,.12); border: 1px solid rgba(234,179,8,.3); border-radius: var(--radius); padding: 8px 12px; margin-bottom: 12px }
.conflict-item { font-size: var(--text-sm); color: #b45309; line-height: 1.5 }
:root.dark .conflict-item { color: #fbbf24 }
```

- [ ] **Step 6: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/features/itinerary/utils.js src/features/itinerary/StopSection.jsx src/features/itinerary/OverviewView.jsx src/index.css
git commit -m "feat: add time conflict alerts for overlapping stops and items"
```

---

### Task 6: Date preselection

**Files:**
- Modify: `src/shared/modals/AddItemModal.jsx`
- Modify: `src/features/itinerary/StopSection.jsx`

**Context:** AddItemModal has `EMPTY_FORM` with empty `start_time`/`end_time`/`stop_ids`. StopSection opens AddItemModal from an "Add item" button (line 162-163) and passes `stop_ids: [stop.id]` via the `onAdd` wrapper.

- [ ] **Step 1: Verify the issue exists**

Read `src/shared/modals/AddItemModal.jsx`. Check if it has a `defaultStopId` prop or any date preselection logic. If yes, report "Already fixed" and stop.

- [ ] **Step 2: Add defaultStopId prop to AddItemModal**

In `src/shared/modals/AddItemModal.jsx`, change the function signature:

```jsx
// Change:
export default function AddItemModal({ onClose, onAdd, addExpense, setFile, stops, userEmail }) {

// To:
export default function AddItemModal({ onClose, onAdd, addExpense, setFile, stops, userEmail, defaultStopId }) {
```

Change the initial state to preselect stop and dates:

```jsx
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY_FORM };
    if (defaultStopId) {
      const stop = (stops || []).find(s => s.id === defaultStopId);
      if (stop) {
        base.stop_ids = [defaultStopId];
        const dateStr = String(stop.start_date).substring(0, 10);
        if (dateStr && dateStr !== 'undefined') {
          base.start_time = `${dateStr}T10:00`;
          base.end_time = `${dateStr}T11:00`;
        }
      }
    }
    return base;
  });
```

- [ ] **Step 3: Pass defaultStopId from StopSection**

In `src/features/itinerary/StopSection.jsx`, find the AddItemModal render (around line 163):

```jsx
// Change:
{showAddItem && (<AddItemModal onClose={() => setShowAddItem(false)} onAdd={(data) => addItem({ ...data, stop_ids: [stop.id] })} stops={stops} userEmail="" />)}

// To:
{showAddItem && (<AddItemModal onClose={() => setShowAddItem(false)} onAdd={(data) => addItem({ ...data, stop_ids: data.stop_ids?.length ? data.stop_ids : [stop.id] })} stops={stops} userEmail="" defaultStopId={stop.id} />)}
```

- [ ] **Step 4: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/shared/modals/AddItemModal.jsx src/features/itinerary/StopSection.jsx
git commit -m "feat: preselect stop dates when adding items from stop context"
```

---

### Task 7: Custom pull-to-refresh

**Files:**
- Create: `src/shared/hooks/usePullToRefresh.js`
- Modify: `src/App.jsx`
- Modify: `src/index.css`

**Context:** App-shell uses `overflow:hidden` on `.app-shell` and `overflow-y:auto` on `.page`. Native pull-to-refresh doesn't work in nested scrollers. Need touch-event-based PTR on the page-container.

- [ ] **Step 1: Verify no existing PTR hook**

Grep for "pullToRefresh" or "pull-to-refresh" in the `src/` directory. If a hook already exists, report "Already implemented" and stop.

- [ ] **Step 2: Create usePullToRefresh hook**

Create `src/shared/hooks/usePullToRefresh.js`:

```js
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Touch-event-based pull-to-refresh for nested scrollers.
 * @param {React.RefObject} scrollRef - ref to the scrollable element
 * @param {Function} onRefresh - async function to call on refresh
 * @returns {{ pullProgress: number, refreshing: boolean }}
 */
export function usePullToRefresh(scrollRef, onRefresh) {
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 60;

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } catch (e) { console.warn('Refresh failed:', e); }
    setRefreshing(false);
    setPullProgress(0);
  }, [onRefresh, refreshing]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Find the actual scrolling child (.page.active)
    function getScroller() {
      return el.querySelector('.page.active') || el;
    }

    function onTouchStart(e) {
      const scroller = getScroller();
      if (scroller.scrollTop > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e) {
      if (!pulling.current || refreshing) return;
      const scroller = getScroller();
      if (scroller.scrollTop > 0) { pulling.current = false; setPullProgress(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) { pulling.current = false; setPullProgress(0); return; }
      if (dy > 10) {
        e.preventDefault();
      }
      const progress = Math.min(dy / THRESHOLD, 1.5);
      setPullProgress(progress);
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullProgress >= 1) {
        handleRefresh();
      } else {
        setPullProgress(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollRef, refreshing, pullProgress, handleRefresh]);

  return { pullProgress, refreshing };
}
```

- [ ] **Step 3: Integrate in AppShell**

In `src/App.jsx`, add the import and hook usage:

```jsx
// Add to imports:
import { useRef } from 'react';  // add useRef to existing React import
import { usePullToRefresh } from './shared/hooks/usePullToRefresh';
```

Inside AppShell function, add:

```jsx
  const pageContainerRef = useRef(null);
  const { pullProgress, refreshing } = usePullToRefresh(pageContainerRef, retryAll);
```

Modify the page-container div to add ref and pull indicator:

```jsx
      <main id="main-content">
      {(pullProgress > 0 || refreshing) && (
        <div className="ptr-indicator" style={{ transform: `translateY(${refreshing ? 40 : pullProgress * 40}px)`, opacity: refreshing ? 1 : pullProgress }}>
          <div className={`ptr-spinner ${refreshing ? 'ptr-spinning' : ''}`}>{refreshing ? '\u21BB' : '\u2193'}</div>
        </div>
      )}
      <div className="page-container" ref={pageContainerRef}>
```

Note: The `useRef` import — check if `useRef` is already imported in the existing `import { useState, useEffect, useCallback } from 'react'` line. If not, add it.

- [ ] **Step 4: Add CSS for pull indicator**

In `src/index.css`, add:

```css
/* Pull to refresh */
.ptr-indicator { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: center; z-index: 50; pointer-events: none; transition: opacity .15s }
.ptr-spinner { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--accent); background: var(--bg-card); border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,.15) }
.ptr-spinning { animation: ptr-spin 1s linear infinite }
@keyframes ptr-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
```

- [ ] **Step 5: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/shared/hooks/usePullToRefresh.js src/App.jsx src/index.css
git commit -m "feat: add custom pull-to-refresh for PWA nested scrollers"
```

---

### Task 8: Google Directions API investigation

**Files:**
- Modify: `src/features/itinerary/MapComponents.jsx`

**Context:** MapComponents.jsx uses `DirectionsService.route()` in two places: line 78-82 (inter-item routes) and line 98-101 (transport routes). The API key is `AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA`. Directions API is reportedly enabled but still failing.

- [ ] **Step 1: Add error logging to DirectionsService callbacks**

Read `src/features/itinerary/MapComponents.jsx`. Find both `DirectionsService.route()` callbacks.

For the first one (around line 82), change:

```jsx
// Change:
}, (result, status) => { if (status === 'OK') { directionsCache[routeKey] = result; render(result); } });

// To:
}, (result, status) => {
  if (status === 'OK') { directionsCache[routeKey] = result; render(result); }
  else { console.warn('[Directions] Inter-item route failed:', status, '| origin:', withCoords[0].coord, '| dest:', withCoords[withCoords.length - 1].coord); }
});
```

For the second one (around line 101), change:

```jsx
// Change:
        }, (result, status) => {
          if (status === 'OK') {
            const dr = new window.google.maps.DirectionsRenderer({ map, directions: result, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: color, strokeOpacity: 0.8, strokeWeight: 3 } });
            renderersRef.current.push(dr);
          } else {
            const line = new window.google.maps.Polyline({ path: [ti.originCoord, ti.destCoord], strokeColor: color, strokeOpacity: 0.5, strokeWeight: 2, map });
            renderersRef.current.push(line);
          }
        });

// To:
        }, (result, status) => {
          if (status === 'OK') {
            const dr = new window.google.maps.DirectionsRenderer({ map, directions: result, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: color, strokeOpacity: 0.8, strokeWeight: 3 } });
            renderersRef.current.push(dr);
          } else {
            console.warn('[Directions] Transport route failed:', status, '| mode:', ti.transport_mode, '| from:', ti.originCoord, '| to:', ti.destCoord);
            const line = new window.google.maps.Polyline({ path: [ti.originCoord, ti.destCoord], strokeColor: color, strokeOpacity: 0.5, strokeWeight: 2, map });
            renderersRef.current.push(line);
          }
        });
```

- [ ] **Step 2: Test Directions API with curl**

Run this command to test the API key directly:

```bash
curl -s "https://maps.googleapis.com/maps/api/directions/json?origin=41.3851,2.1734&destination=41.4036,2.1744&key=AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA" | head -20
```

Check the response:
- If `"status": "OK"` — API works, issue is likely in JS API usage or key restrictions (HTTP referrer)
- If `"status": "REQUEST_DENIED"` — check the `error_message` for details (wrong API enabled, key restrictions)
- If connection error — API not enabled at all

- [ ] **Step 3: Document findings**

Based on curl results, create or update a brief note at the top of the commit message explaining:
- What the actual error status is
- Whether it's a code issue or a Google Cloud Console configuration issue
- What needs to be changed (if it's a console setting, describe the exact steps)

- [ ] **Step 4: Build and commit**

```bash
cd "/Users/Joaquin1/Documents/Trip Planner/trip-planner-app"
npm run build
git add src/features/itinerary/MapComponents.jsx
git commit -m "debug: add Directions API error logging + investigate key restrictions

[Include curl findings here]"
```
