# Anisita State Store Map

## STORE: TripContext (TripDataContext + TripActionsContext)
Dual context pattern. TripDataContext holds data, TripActionsContext holds stable callbacks.

### Data Context (re-renders on any data change):
- items, loaded, files, livePrices, toast, stops, stopsLoaded, places, expenses, email

### Actions Context (stable):
- updateItem, setStatus, addItem, deleteItem
- setFile, removeFile, clearFiles
- updateStop, addStop, deleteStop
- getPlaceData
- addExpense, updateExpense, deleteExpense
- showToast

### DANGEROUS: useTrip() merges BOTH contexts
- Any component using useTrip() re-renders on ALL data changes
- Components should use useTripData() or useTripActions() separately
- Currently ALL pages use useTrip() — defeating the dual-context split

---

## STORE: useItems
State: items (array), loaded (bool)
Refs: stopsMapRef, stopsDataRef

### Actions:
- updateItem(id, changes) -> sets {items[id]: ...changes} OPTIMISTIC, then DB update
  - Throws on error (UI diverges from DB if not caught)
- setStatus(id, status) -> sets {items[id].status}
  - SIDE EFFECT: If stay + status=sel/conf, deselects OTHER stays at same stop (sets their status='')
  - Calls updateItem internally
  - Calls navigator.vibrate(15)
- addItem(itemData) -> appends to items, then enrichItem() async
  - SIDE EFFECT: enrichItem runs after insert, updates item with Google Places data
- deleteItem(id) -> removes from items OPTIMISTIC
  - SIDE EFFECT: deletes expenses, place_cache, storage files for that item
  - Does NOT throw on delete failure — relies on realtime to re-add

### Realtime:
- INSERT: appends if not duplicate
- UPDATE: merges into existing, shows toast if updated_by != current user
- DELETE: filters out

### DANGEROUS RESETS:
- setStatus for stays: silently deselects other stays at same stop
- deleteItem: cascade deletes expenses (no confirmation at this level)
- mergeItem: city derived from stop name — if stop lookup returns empty, uses fallback chain

---

## STORE: useStops
State: stops (array), loaded (bool)
Refs: enrichCancelledRef

### Actions:
- updateStop(id, changes) -> sets {stops[id]: ...changes} OPTIMISTIC
  - SIDE EFFECT: If name changed, re-fetches google_place_id + coords
- addStop(stopData) -> appends, sorts by start_date
  - Uses stops.length for maxSort — STALE CLOSURE if stops changes between render and call
- deleteStop(id) -> removes OPTIMISTIC
  - Does NOT cascade delete items at that stop
  - Does NOT throw on failure

### Realtime:
- INSERT: appends if not duplicate, sorts by sort_order
- UPDATE: merges
- DELETE: filters out

### DANGEROUS:
- addStop captures `stops` in closure — sort_order calculation uses stale data if called rapidly
- deleteStop doesn't clean up item.stop_ids referencing deleted stop

---

## STORE: useExpenses
State: expenses (array), loaded (bool)

### Actions:
- addExpense(expense) -> inserts to DB, appends to state
- updateExpense(id, changes) -> updates DB, merges into state
- deleteExpense(id) -> deletes from DB, filters from state

### Realtime:
- INSERT: appends if not duplicate
- UPDATE: merges
- DELETE: filters out

### DANGEROUS:
- No optimistic updates — waits for DB response before updating state
- All actions throw on error (callers must catch)

---

## STORE: useLivePrices
State: livePrices (object keyed by item.id)
Refs: fetchedRef (Set of fetched keys)

### Behavior:
- Fetches Xotelo prices for stays with xotelo_key
- SIDE EFFECT: writes estimated_cost back to items table (updated_by='xotelo-sync')
- fetchedRef prevents duplicate fetches per session
- Resets fetchedRef when staysKey or stopsDateKey changes

### DANGEROUS:
- Writes to items table without going through useItems — bypasses optimistic update
- getStayDates fallback: if no stop found, uses first/last stop dates (wrong hotel dates)

---

## STORE: useItemFiles
State: files (object keyed by item.id)

### Actions:
- setFile(id, fileData) -> appends file or replaces list
- removeFile(id, filePath) -> filters out by path
- clearFiles(id) -> deletes key entirely

### Behavior:
- Only loads files for confirmed items (status='conf')
- useEffect dependency: stringified list of confirmed item IDs

### DANGEROUS:
- useEffect dependency is items.filter(...).map(...).join(',') — computed inline, new string every render if items reference changes

---

## STORE: usePlaceData
State: places (object keyed by item.id)

### Actions:
- getPlaceData(itemId, name, city) -> lazy fetch, memory cache -> DB cache -> Google API

### DANGEROUS:
- useCallback depends on `places` — new callback reference every time places changes
- This means TripActionsContext.getPlaceData is NOT stable, causing unnecessary re-renders

---

## STORE: useAuth
State: session (undefined | null | Session)

### DANGEROUS:
- undefined = loading, null = not authenticated — consumers must check both

---

## STORE: useToast
State: toast (string | null)
Refs: timerRef

### Actions:
- showToast(msg) -> sets toast, clears after duration (3s default)

---

## CROSS-STORE SIDE EFFECTS SUMMARY

| Action | Primary Effect | Side Effects |
|--------|---------------|--------------|
| setStatus(id, 'conf') | item.status = 'conf' | Deselects other stays at same stop |
| setStatus(id, '') from conf | item.status = '' | Caller (DetailModal) deletes expenses |
| deleteItem(id) | Removes item | Deletes expenses, place_cache, storage files |
| useLivePrices fetch | Sets livePrices[id] | Writes estimated_cost to items table (bypasses useItems) |
| deleteStop(id) | Removes stop | Does NOT clean up items referencing that stop |
| addStop(stopData) | Adds stop | Uses potentially stale `stops` for sort_order |
| getPlaceData | Fetches place data | Writes to place_cache table |
