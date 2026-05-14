# Enhanced AddItemModal + AddExpenseModal

## Summary
Collapse the current multi-step flow (create item → open detail → confirm → add expense → upload files) into a single AddItemModal action. Also allow creating new items from AddExpenseModal when no matching item exists.

## AddItemModal Changes

### New Fields

**Status selector** — 3 pill buttons below stop chips.
- Values: `''` (Not added), `'sel'` (Selected), `'conf'` (Confirmed)
- Default: `'sel'` (preserves current behavior)
- Uses same `.status-selector` CSS class as DetailModal for consistency

**Confirmed price input** — visible only when status is `conf`.
- `€` prefix input (number type), same pattern as ExpenseCard
- Optional note field below price
- Label: "Confirmed cost"

**File upload** — visible only when status is `conf`.
- Same `accept="image/*,.pdf,.doc,.docx"` restriction as DetailModal
- Multiple files supported via repeated picker (not multi-select)
- Shows file name chips after selection (pre-upload, stored in local state)
- Label: "Attachments"

### Section Order
1. Name *
2. Type
3. Stops
4. **Status** (new)
5. **Confirmed cost** (new, conditional on conf)
6. **File upload** (new, conditional on conf)
7. Description
8. Type-specific fields (food/stay/transport/activity)
9. Schedule (start/end)
10. Link
11. Notes
12. Save button

### Form State Additions
```js
// Added to EMPTY_FORM:
status: 'sel',
confirmed_cost: '',
expense_note: '',
pendingFiles: [],  // File objects, not yet uploaded
```

### Save Flow
```
handleSave():
  1. Validate name
  2. Call addItem({ ...form, status: form.status })
     → returns new item with id
  3. If status === 'conf' AND confirmed_cost > 0:
     Call addExpense({
       amount: confirmed_cost,
       category: form.type,
       note: expense_note || form.name,
       item_id: newItem.id,
       stop_id: form.stop_ids[0] || '',
       created_by: userEmail,
     })
  4. If pendingFiles.length > 0:
     For each file: uploadFile(newItem.id, file)
     Update file state via setFile(newItem.id, result)
  5. Close modal
  6. On any error: alert message, don't close (item may exist)
```

## AddExpenseModal Changes

### "Create new item" button
- Positioned at the top of the item list in `step === 'select'`
- Label: "+ Create new item"
- Styled as a subtle CTA (accent color text, no heavy background)
- Click: sets `showAddItem = true`, renders AddItemModal on top

### Flow
```
User opens AddExpenseModal:
  → Sees item list + search + "Create new item" button
  → If they click "Create new item":
    → AddItemModal opens on top
    → User fills out item with status=conf + price
    → AddItemModal saves item + expense + files
    → AddItemModal closes
    → AddExpenseModal also closes (expense already created)
  → If they pick an existing item:
    → Current flow (amount step) unchanged
```

### State Addition
```js
const [showAddItem, setShowAddItem] = useState(false);
```

### Closing Logic
When AddItemModal closes after saving a confirmed item with expense:
- `onClose` callback from AddItemModal fires
- AddExpenseModal detects the new expense was created (or we pass a flag)
- Simplest: AddExpenseModal's `onClose` is called from the AddItemModal's post-save

Implementation: pass `onClose` (AddExpenseModal's close) as AddItemModal's `onClose`. When AddItemModal saves and closes, it cascades to close AddExpenseModal too.

Actually simpler: AddExpenseModal renders AddItemModal with `onClose={() => { setShowAddItem(false); onClose(); }}` — closing AddItemModal also closes AddExpenseModal.

## Props Changes

### AddItemModal
Current: `{ onClose, onAdd, stops, userEmail }`
New: `{ onClose, onAdd, addExpense, setFile, stops, userEmail }`

- `addExpense` — needed to create expense record on confirmed save
- `setFile` — needed to register uploaded files in state

### AddExpenseModal
Current: `{ items, stops, onAdd, onClose, userEmail }`
New: `{ items, stops, onAdd, onClose, userEmail, addItem, addExpense, setFile }`

- `addItem` — passed through to nested AddItemModal
- `addExpense` — passed through to nested AddItemModal
- `setFile` — passed through to nested AddItemModal

## Files to Change
1. `src/shared/modals/AddItemModal.jsx` — add status, price, file fields + save flow
2. `src/shared/modals/AddExpenseModal.jsx` — add "Create new item" button + nested modal
3. `src/App.jsx` — pass additional props to both modals (addExpense, setFile)

## Testing
- Create item as Selected (default) — current behavior preserved
- Create item as Confirmed with price — item + expense created
- Create item as Confirmed with price + files — item + expense + files
- Create item as Not Added — just item, no expense
- AddExpenseModal → Create new item → confirm with price → both modals close
- AddExpenseModal → Create new item → cancel → back to expense modal
