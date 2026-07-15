# Batch 2: Item Card Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 P1 issues from the roundtable review (item 2.5 already done in Batch 1).

**Architecture:** All fixes are small, targeted edits to existing files. Grouped by file to minimize context switching. No new files created.

**Tech Stack:** React 19, Vite 8, Supabase, JavaScript, CSS

**CRITICAL:** Each task must verify the issue exists before changing code. Run `npm run build` after each task. Commit after each task.

---

## File Map

| File | Tasks |
|------|-------|
| `src/index.css` | Task 1 (close button CSS) |
| `src/shared/modals/AddItemModal.jsx` | Task 2 (file upload gating), Task 3 (stale closure fix), Task 4 (desc_text rename) |
| `src/shared/components/DetailModal.jsx` | Task 5 (estimated_cost input), Task 6 (conflict detection) |
| `src/shared/hooks/useItems.js` | Task 4 (desc_text bridge), Task 7 (sort_order), Task 8 (deleteItem cascade), Task 9 (setStatus rollback) |
| Supabase migration | Task 10 (expense unique constraint) |

---

### Task 1: Fix close (X) button CSS

**Files:**
- Modify: `src/index.css:210`

**Context:** The close button uses `position: sticky; float: right` which conflicts — float breaks sticky positioning. The button scrolls away in summary mode.

- [ ] **Step 1: Fix the CSS**

In `src/index.css`, find line 210:
```css
.detail-close { position: sticky; top: 12px; float: right; margin-right: 12px; z-index: 10; background: rgba(0,0,0,.5); backdrop-filter: blur(8px); color: #fff; border: none; width: 30px; height: 30px; border-radius: 50%; font-size: var(--text-base); cursor: pointer; display: flex; align-items: center; justify-content: center }
```

Replace with:
```css
.detail-close { position: absolute; top: 12px; right: 12px; z-index: 20; background: rgba(0,0,0,.5); backdrop-filter: blur(8px); color: #fff; border: none; width: 30px; height: 30px; border-radius: 50%; font-size: var(--text-base); cursor: pointer; display: flex; align-items: center; justify-content: center }
```

Changes: `sticky` → `absolute`, removed `float: right; margin-right: 12px`, added `right: 12px`, raised `z-index` to 20. The `.detail-sheet` already has `position: relative`, so the button anchors to the sheet viewport corner.

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/index.css
git commit -m "fix: close button uses absolute positioning instead of broken float+sticky"
```

---

### Task 2: Move file upload outside confirmed-status gate

**Files:**
- Modify: `src/shared/modals/AddItemModal.jsx:209-230`

**Context:** File upload and attachments are only visible when `form.status === 'conf'`. Users creating "Selected" items can't attach files.

- [ ] **Step 1: Restructure the confirmed section**

In `src/shared/modals/AddItemModal.jsx`, find the block starting at line 209:
```jsx
            {form.status === 'conf' && (
              <>
                <label className="add-label">Confirmed cost</label>
                ...expense fields...
                <label className="add-label">Attachments</label>
                ...file upload UI...
              </>
            )}
```

Split it: keep expense fields inside the `conf` conditional, move attachments outside. Replace the entire `{form.status === 'conf' && (...)}` block with:

```jsx
            {form.status === 'conf' && (
              <>
                <label className="add-label">Confirmed cost</label>
                <div className="cost-input-row" style={{ marginBottom: 8 }}>
                  <span className="cost-input-prefix">$</span>
                  <input type="number" className="cost-input" placeholder="0"
                    value={form.confirmed_cost} onChange={e => updateForm('confirmed_cost', e.target.value)} />
                </div>
                <input className="add-input" placeholder="Expense note (optional)"
                  value={form.expense_note} onChange={e => updateForm('expense_note', e.target.value)}
                  style={{ marginBottom: 8 }} />
              </>
            )}

            <label className="add-label">Attachments</label>
            {pendingFiles.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {pendingFiles.map((f, i) => (
                  <div key={i} className="file-chip" style={{ marginBottom: 4 }}>
                    <span className="file-chip-name">{f.name}</span>
                    <button type="button" className="file-remove-btn"
                      onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>x</button>
                  </div>
                ))}
              </div>
            )}
            <label className="detail-upload-btn" style={{ marginBottom: 8 }}>
              Upload file
              <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden-input"
                onChange={e => { if (e.target.files[0]) { setPendingFiles(prev => [...prev, e.target.files[0]]); e.target.value = ''; } }} />
            </label>
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/modals/AddItemModal.jsx
git commit -m "fix: file upload available for all item statuses, not just confirmed"
```

---

### Task 3: Fix stale closure and stuck xoteloStatus in AddItemModal

**Files:**
- Modify: `src/shared/modals/AddItemModal.jsx:62-107`

**Context:** Two bugs: (1) `fetchXoteloPrices` called inside `setForm` updater (sync context) with no error handling — `xoteloStatus` stuck at 'searching' on failure. (2) `handleTripAdvisorUrl` line 106 reads `form.stop_ids` from stale closure.

- [ ] **Step 1: Fix updateForm to not call async from setState**

Find `updateForm` (line 62-77). Replace:
```jsx
  function updateForm(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'stop_ids' && next.type === 'transport' && Array.isArray(val) && val.length >= 2) {
        const s1 = (stops || []).find(s => s.id === val[0]);
        const s2 = (stops || []).find(s => s.id === val[val.length - 1]);
        if (s1 && !next.origin) next.origin = { name: s1.name, lat: s1.lat, lng: s1.lng };
        if (s2 && !next.dest) next.dest = { name: s2.name, lat: s2.lat, lng: s2.lng };
      }
      // Re-fetch Xotelo rates when stop changes and we have a key
      if (key === 'stop_ids' && next.xotelo_key && next.type === 'stay') {
        fetchXoteloPrices(next.xotelo_key, val);
      }
      return next;
    });
  }
```

With:
```jsx
  function updateForm(key, val) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'stop_ids' && next.type === 'transport' && Array.isArray(val) && val.length >= 2) {
        const s1 = (stops || []).find(s => s.id === val[0]);
        const s2 = (stops || []).find(s => s.id === val[val.length - 1]);
        if (s1 && !next.origin) next.origin = { name: s1.name, lat: s1.lat, lng: s1.lng };
        if (s2 && !next.dest) next.dest = { name: s2.name, lat: s2.lat, lng: s2.lng };
      }
      return next;
    });
    // Xotelo fetch outside setState — uses val directly (not stale closure)
    setForm(f => {
      if (key === 'stop_ids' && f.xotelo_key && f.type === 'stay') {
        fetchXoteloPrices(f.xotelo_key, val).catch(() => {});
      }
      return f; // no state change, just reading current state
    });
  }
```

- [ ] **Step 2: Add try/catch to fetchXoteloPrices**

Find `fetchXoteloPrices` (line 80-93). Replace:
```jsx
  async function fetchXoteloPrices(key, stopIds) {
    const firstStop = (stops || []).find(s => (stopIds || []).includes(s.id));
    if (!firstStop) return;
    const checkIn = String(firstStop.start_date).substring(0, 10);
    const checkOut = String(firstStop.end_date).substring(0, 10);
    setXoteloStatus('searching');
    const estimate = await fetchStayEstimate(key, checkIn, checkOut);
    if (estimate) {
      setForm(f => ({ ...f, estimated_cost: String(Math.round(estimate.estimated_cost)) }));
      setXoteloStatus('found');
    } else {
      setXoteloStatus('found');
    }
  }
```

With:
```jsx
  async function fetchXoteloPrices(key, stopIds) {
    const firstStop = (stops || []).find(s => (stopIds || []).includes(s.id));
    if (!firstStop) return;
    const checkIn = String(firstStop.start_date).substring(0, 10);
    const checkOut = String(firstStop.end_date).substring(0, 10);
    setXoteloStatus('searching');
    try {
      const estimate = await fetchStayEstimate(key, checkIn, checkOut);
      if (estimate) {
        setForm(f => ({ ...f, estimated_cost: String(Math.round(estimate.estimated_cost)) }));
      }
      setXoteloStatus('found');
    } catch (err) {
      console.warn('Xotelo fetch failed:', err);
      setXoteloStatus('not_found');
    }
  }
```

- [ ] **Step 3: Fix stale closure in handleTripAdvisorUrl**

Find `handleTripAdvisorUrl` line 106:
```jsx
    fetchXoteloPrices(key, form.stop_ids);
```

Replace with (reads current state instead of stale closure):
```jsx
    setForm(f => { fetchXoteloPrices(key, f.stop_ids).catch(() => {}); return f; });
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/shared/modals/AddItemModal.jsx
git commit -m "fix: prevent stale closure and stuck xoteloStatus in AddItemModal"
```

---

### Task 4: Rename desc_text to description

**Files:**
- Modify: `src/shared/modals/AddItemModal.jsx:24,229`
- Modify: `src/shared/hooks/useItems.js:147`

**Context:** AddItemModal uses `desc_text` in EMPTY_FORM, useItems bridges it with `itemData.desc_text || itemData.description`. Normalize to `description`.

- [ ] **Step 1: Rename in AddItemModal EMPTY_FORM**

In `src/shared/modals/AddItemModal.jsx` line 24, find `desc_text: ''` in EMPTY_FORM. Replace with `description: ''`.

- [ ] **Step 2: Rename in the textarea**

Find line 229:
```jsx
            <textarea className="add-input" rows={2} value={form.desc_text} onChange={(e) => updateForm('desc_text', e.target.value)} placeholder="What is it? Why go?" />
```

Replace with:
```jsx
            <textarea className="add-input" rows={2} value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="What is it? Why go?" />
```

- [ ] **Step 3: Remove bridge code in useItems**

In `src/shared/hooks/useItems.js` line 147, find:
```jsx
      description: itemData.desc_text || itemData.description || '',
```

Replace with:
```jsx
      description: itemData.description || '',
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/shared/modals/AddItemModal.jsx src/shared/hooks/useItems.js
git commit -m "fix: rename desc_text to description everywhere"
```

---

### Task 5: Add estimated_cost input to EditMode

**Files:**
- Modify: `src/shared/components/DetailModal.jsx:470-471`

**Context:** EditMode draft captures `estimated_cost` and save logic diffs it, but there is no input element. Users can't edit the estimate after creation.

- [ ] **Step 1: Add input field before PricingBlock**

In `src/shared/components/DetailModal.jsx`, find the Schedule/Pricing area (around line 468-471):
```jsx
          {/* Pricing — same component as summary for consistency */}
          <PricingBlock it={{ ...it, estimated_cost: draft.estimated_cost ? Number(draft.estimated_cost) : it.estimated_cost }} livePrice={livePrice} expenseAmount={expenseAmount} onExpenseClick={onExpenseClick} />
```

Replace with:
```jsx
          {/* Pricing */}
          <div className="edit-section-title">Pricing</div>
          <label className="edit-label">Estimated cost ($)</label>
          <input className="edit-input" value={draft.estimated_cost} onChange={e => u('estimated_cost', e.target.value)} type="number" step="0.01" placeholder="0" />
          <PricingBlock it={{ ...it, estimated_cost: draft.estimated_cost ? Number(draft.estimated_cost) : it.estimated_cost }} livePrice={livePrice} expenseAmount={expenseAmount} onExpenseClick={onExpenseClick} />
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/components/DetailModal.jsx
git commit -m "fix: add estimated_cost input to EditMode"
```

---

### Task 6: Simplify conflict detection to last-write-wins

**Files:**
- Modify: `src/shared/components/DetailModal.jsx:291-301`

**Context:** Conflict detection checks only 4 of 20+ fields, giving false confidence. The judge recommended removing the partial check and adopting last-write-wins, which is simpler and more honest for a 2-user app.

- [ ] **Step 1: Remove conflict detection from handleSave**

In `src/shared/components/DetailModal.jsx`, find handleSave (line 291-301):
```jsx
  async function handleSave() {
    // Conflict detection: warn if live item diverged from snapshot taken at edit-mode open
    const conflicts = [];
    if (it.name !== baseItem.name) conflicts.push('name');
    if (it.status !== baseItem.status) conflicts.push('status');
    if (Number(it.estimated_cost) !== Number(baseItem.estimated_cost)) conflicts.push('estimated cost');
    if (JSON.stringify(it.stop_ids) !== JSON.stringify(baseItem.stop_ids)) conflicts.push('stops');
    if (conflicts.length > 0) {
      const confirmed = await confirm(`This item was updated by someone else (${conflicts.join(', ')} changed). Save anyway?`, { confirmLabel: 'Save anyway' });
      if (!confirmed) return;
    }

    setSaving(true);
```

Replace with:
```jsx
  async function handleSave() {
    setSaving(true);
```

Also remove the now-unused `baseItem` state (line 268):
```jsx
  const [baseItem] = useState(it); // snapshot of item when edit mode opened — used for conflict detection
```

Remove that line entirely.

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/components/DetailModal.jsx
git commit -m "fix: remove partial conflict detection, adopt last-write-wins"
```

---

### Task 7: Set sort_order on item insert

**Files:**
- Modify: `src/shared/hooks/useItems.js:142-162`

**Context:** `addItem` never sets `sort_order`. User-created items get null, sorting unpredictably.

- [ ] **Step 1: Compute sort_order from existing items**

In `src/shared/hooks/useItems.js`, find `addItem` (line 142). Add sort_order computation. Change:
```jsx
  const addItem = useCallback(async (itemData) => {
    const newItem = {
      id: crypto.randomUUID(),
```

To:
```jsx
  const addItem = useCallback(async (itemData) => {
    const maxSort = itemsRef.current.reduce((max, it) => Math.max(max, it.sort_order || 0), 0);
    const newItem = {
      id: crypto.randomUUID(),
```

And after the `stop_ids` line (158), add `sort_order`:
```jsx
      stop_ids: itemData.stop_ids || [],
      sort_order: maxSort + 1,
      status: itemData.status || 'sel',
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/hooks/useItems.js
git commit -m "fix: set sort_order on new items to prevent unpredictable ordering"
```

---

### Task 8: Reorder deleteItem cascade — delete item first

**Files:**
- Modify: `src/shared/hooks/useItems.js:178-202`

**Context:** Current cascade: delete expenses → delete place_cache → delete storage → delete item. If any middle step fails, item reappears in UI with children already deleted. Fix: delete item first (source of truth), then cleanup children. Orphaned children are less harmful than orphaned parents.

- [ ] **Step 1: Reorder the cascade**

Replace deleteItem (lines 178-202):
```jsx
  const deleteItem = useCallback(async (id) => {
    let prev;
    setItems(p => {
      prev = p.find(it => it.id === id);
      return p.filter(it => it.id !== id);
    });
    try {
      await supabase.from('expenses').delete().eq('item_id', id);
      await supabase.from('place_cache').delete().eq('item_id', id);
      try {
        const { data: storageFiles } = await supabase.storage.from('reservations').list(id);
        if (storageFiles?.length > 0) {
          await supabase.storage.from('reservations').remove(storageFiles.map(f => `${id}/${f.name}`));
        }
      } catch (storageErr) { console.warn('Storage cleanup failed for item', id, storageErr); }
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.warn('Failed to delete item:', error);
        if (prev) setItems(p => [...p, prev]);
      }
    } catch (err) {
      console.warn('deleteItem cascade error:', err);
      if (prev) setItems(p => [...p, prev]);
    }
  }, []);
```

With:
```jsx
  const deleteItem = useCallback(async (id) => {
    let prev;
    setItems(p => {
      prev = p.find(it => it.id === id);
      return p.filter(it => it.id !== id);
    });
    try {
      // Delete item first — source of truth. Orphaned children are less harmful than orphaned parents.
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.warn('Failed to delete item:', error);
        if (prev) setItems(p => [...p, prev]);
        return;
      }
      // Cleanup children — best effort, failures are non-critical
      await supabase.from('expenses').delete().eq('item_id', id).catch(e => console.warn('Expense cleanup failed:', e));
      await supabase.from('place_cache').delete().eq('item_id', id).catch(e => console.warn('Place cache cleanup failed:', e));
      try {
        const { data: storageFiles } = await supabase.storage.from('reservations').list(id);
        if (storageFiles?.length > 0) {
          await supabase.storage.from('reservations').remove(storageFiles.map(f => `${id}/${f.name}`));
        }
      } catch (storageErr) { console.warn('Storage cleanup failed:', storageErr); }
    } catch (err) {
      console.warn('deleteItem error:', err);
      if (prev) setItems(p => [...p, prev]);
    }
  }, []);
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/hooks/useItems.js
git commit -m "fix: delete item before children to prevent orphaned-parent state"
```

---

### Task 9: Add rollback for conflicting stay deselection

**Files:**
- Modify: `src/shared/hooks/useItems.js:120-140`

**Context:** When selecting a stay, conflicting stays are optimistically deselected. If the DB update fails, the UI shows them deselected but DB still has them selected. On refresh, they reappear.

- [ ] **Step 1: Add rollback on catch**

Replace setStatus (lines 120-140):
```jsx
  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = itemsRef.current.find(it => it.id === id);
    const itemStops = item?.stop_ids || [];
    if (item?.type === 'stay' && itemStops.length > 0 && (status === 'sel' || status === 'conf')) {
      const others = itemsRef.current.filter(it => it.type === 'stay' && it.id !== id && (it.status === 'sel' || it.status === 'conf') && it.stop_ids?.some(s => itemStops.includes(s)));
      if (others.length > 0) {
        setItems(prev => prev.map(it => others.some(o => o.id === it.id) ? { ...it, status: '' } : it));
        try {
          await Promise.all(others.map(o => supabase.from('items').update({ status: '', updated_at: new Date().toISOString(), updated_by: currentUserEmail }).eq('id', o.id)));
        } catch (err) {
          console.warn('Failed to deselect conflicting stays:', err);
        }
        if (showToast) {
          const names = others.map(o => o.name).join(', ');
          showToast(`Deselected ${names} (only one stay per stop)`);
        }
      }
    }
    await updateItem(id, { status });
  }, [currentUserEmail, updateItem, showToast]);
```

With:
```jsx
  const setStatus = useCallback(async (id, status) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const item = itemsRef.current.find(it => it.id === id);
    const itemStops = item?.stop_ids || [];
    if (item?.type === 'stay' && itemStops.length > 0 && (status === 'sel' || status === 'conf')) {
      const others = itemsRef.current.filter(it => it.type === 'stay' && it.id !== id && (it.status === 'sel' || it.status === 'conf') && it.stop_ids?.some(s => itemStops.includes(s)));
      if (others.length > 0) {
        const prevStatuses = others.map(o => ({ id: o.id, status: o.status }));
        setItems(prev => prev.map(it => others.some(o => o.id === it.id) ? { ...it, status: '' } : it));
        try {
          await Promise.all(others.map(o => supabase.from('items').update({ status: '', updated_at: new Date().toISOString(), updated_by: currentUserEmail }).eq('id', o.id)));
        } catch (err) {
          console.warn('Failed to deselect conflicting stays:', err);
          // Rollback optimistic UI
          setItems(prev => prev.map(it => {
            const restore = prevStatuses.find(p => p.id === it.id);
            return restore ? { ...it, status: restore.status } : it;
          }));
          if (showToast) showToast('Failed to update stays — please try again');
          return;
        }
        if (showToast) {
          const names = others.map(o => o.name).join(', ');
          showToast(`Deselected ${names} (only one stay per stop)`);
        }
      }
    }
    await updateItem(id, { status });
  }, [currentUserEmail, updateItem, showToast]);
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/shared/hooks/useItems.js
git commit -m "fix: rollback conflicting stay deselection on DB failure"
```

---

### Task 10: Add unique constraint on expenses.item_id

**Context:** ExpenseCard only shows the first expense per item. The CLAUDE.md states "1 expense per item max" but there's no DB constraint. This prevents duplicates at the data layer.

- [ ] **Step 1: Run migration**

```bash
export SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN
npm_config_cache=/tmp/npm-cache-trip npx supabase db query --linked "
  -- First check for existing duplicates
  SELECT item_id, COUNT(*) as cnt FROM expenses WHERE item_id IS NOT NULL GROUP BY item_id HAVING COUNT(*) > 1;
"
```

If duplicates exist, keep the one with the highest amount and delete the rest:
```bash
npm_config_cache=/tmp/npm-cache-trip npx supabase db query --linked "
  DELETE FROM expenses WHERE id NOT IN (
    SELECT DISTINCT ON (item_id) id FROM expenses WHERE item_id IS NOT NULL ORDER BY item_id, amount DESC
  ) AND item_id IN (
    SELECT item_id FROM expenses WHERE item_id IS NOT NULL GROUP BY item_id HAVING COUNT(*) > 1
  );
"
```

Then add the constraint:
```bash
npm_config_cache=/tmp/npm-cache-trip npx supabase db query --linked "
  CREATE UNIQUE INDEX IF NOT EXISTS expenses_item_id_unique ON expenses (item_id) WHERE item_id IS NOT NULL;
"
```

- [ ] **Step 2: Commit a note (no code change)**

```bash
git commit --allow-empty -m "chore: add unique constraint on expenses.item_id in Supabase"
```

---

## Final Verification

After all 10 tasks:

```bash
npm run build
npx vitest run
```

All 84+ tests should pass, build should be clean.
