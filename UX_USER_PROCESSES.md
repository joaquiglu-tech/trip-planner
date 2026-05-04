# Anisita — Complete User Process Map
**Author:** Elena Varga (UX/UI Designer)
**Date:** May 2026
**App URL:** https://trip-planner-app-sable.vercel.app
**Status:** Living document — update as features change

---

## 1. AUTHENTICATION

### 1.1 Sign In
```
Entry: App load (no session)
Screen: Login.jsx — centered card with logo
Steps:
  1. Enter email
  2. Enter password
  3. Tap "Sign In"
  4. → Success: loads app at /#/itinerary
  4. → Error: shows error message inline
Exit: App shell with 3 tabs
```
**Fields shown:** Email, Password
**Missing:** No "forgot password" flow. No social login. No email verification feedback.
**Improvement:** Add password reset link. Consider "remember me" for mobile.

### 1.2 Sign Up
```
Entry: Login screen → "Don't have an account? Sign up"
Steps:
  1. Toggle to sign up mode
  2. Enter email
  3. Enter password (min 6 chars)
  4. Tap "Sign Up"
  5. → Success: loads app (Supabase auto-confirms)
  5. → Error: shows error message
```
**Missing:** No password strength indicator. No confirmation of what password requirements are.

### 1.3 Sign Out
```
Entry: TopBar avatar → Profile tab
Steps:
  1. Tap avatar in top right
  2. Scroll to "Sign Out" button
  3. Tap "Sign Out"
  4. → Returns to Login screen
```
**Issues:** No confirmation dialog. 2 taps + scroll to reach. Could be a single action from a dropdown.

---

## 2. NAVIGATION

### 2.1 Tab Navigation
```
Tabs (bottom bar): Itinerary | Plan | Expenses
URLs: /#/itinerary | /#/plan | /#/expenses
Profile: accessed via avatar in TopBar (not a tab)
```
**Current behavior:** Tapping a tab switches view. URL updates. Refresh preserves tab.
**Issues:** Profile is hidden behind avatar — no tab, easy to miss. Back button behavior is hash-based (works).

### 2.2 Itinerary Sub-navigation
```
Level 1: Stops/Dates toggle
Level 2: Stop pills or Date pills (horizontal scroll)
Level 3: Overview | specific stop | specific date
```
**Issues:**
- No visual scroll indicator on pills (user may not know there are more)
- Overview pill looks identical to stop pills
- Proportional pill width is confusing (varies per stop)

---

## 3. STOPS (CRUD)

### 3.1 View Stops — Overview
```
Entry: Itinerary tab → Overview (default)
Shows:
  - Trip name (derived: first non-Lima stop to last non-Lima stop)
  - Days countdown
  - Stats: Booked | To book | Estimated | Confirmed
  - Alerts: urgent unbooked items
  - Recent activity feed
  - Route map (all stops)
  - Destination cards (one per stop with status flags)
```
**Data sources:** stops table, items table (for stats/status), expenses (for confirmed total)
**Issues:**
- Trip name shows "Lima to Lima" if Lima is first and last — currently filtered but fragile
- Stats section could be the shared BudgetSummary for consistency
- Destination cards show stop name, dates, stay name, transport/activity/food counts

### 3.2 View Stop — Detail
```
Entry: Tap stop pill OR tap destination card in overview
Shows:
  - Compact header: dates (clickable to edit) + stay name (linked to Maps) + check-in/out + phone
  - Map (left on desktop) with numbered markers + home marker
  - Schedule (right on desktop) with time-ordered items
  - Travel tips (collapsible)
  - Plan section (collapsible) with type filter + all items for this stop
```
**Data sources:** stops table (dates, tips), items table (filtered by stop_ids), place_cache (stay address/phone)
**Issues:**
- No edit icon on dates — user must discover click-to-edit
- Empty schedule shows "No items scheduled." with no action button
- Plan section starts collapsed — should be open in planning phase
- No way to add an item directly from within a stop context
- No delete stop button anywhere in the UI

### 3.3 Create Stop
```
Entry: FAB (+) → "Add stop"
Screen: AddStopModal
Steps:
  1. Type city/town name → debounced Google Places search
  2. Select from dropdown results (gets place_id + lat/lng)
  3. Enter start date
  4. Enter end date
  5. Tap "Add Stop"
  6. → Stop created with google_place_id + coords
  7. → Appears in pills, overview map, destinations
```
**Fields:** Location search (Google Places), Start date, End date
**Auto-enrichment:** google_place_id, lat, lng from search result
**Missing:** No validation that end_date > start_date. No tips field in creation. No sort_order control.

### 3.4 Edit Stop
```
Entry: Itinerary → select stop → tap dates row
Steps:
  1. Tap dates in the compact header
  2. → Fields become editable: Name, Start date, End date
  3. Make changes
  4. Tap "Save"
  5. → Stop updated, pills recalculate, dates mode regenerates
```
**Fields editable:** Name, Start date, End date
**Missing fields:** Tips (not editable from UI). Google Place ID (not changeable). Sort order.
**Issues:**
- No visual affordance that dates are clickable
- Appends T00:00:00Z to dates when saving (stop dates are DATE type)
- Can't edit stop name to a new location (no re-search of Google Places)
- If name changes, google_place_id and coords should update (partially implemented in useStops but may not work from inline edit)

### 3.5 Delete Stop
```
Entry: NONE — not available in UI
Backend: deleteStop exists in useStops.js but no button triggers it
```
**Status:** MISSING. User cannot delete a stop they created by mistake.

---

## 4. ITEMS (CRUD)

### 4.1 View Items — Plan Tab
```
Entry: Plan tab (bottom nav)
Shows:
  - BudgetSummary (Selected est. | Confirmed — expandable with type breakdown)
  - Filter pills: type (All/Transport/Stays/Activities/Food) + status + city dropdown + urgent + search
  - Grouped item list (by type or by city depending on filter)
  - Each card: name, subtitle (time/dish/duration), price, status indicator
```
**Data sources:** items table (all), expenses (for confirmed amounts), livePrices (for stays)
**Issues:**
- "Add something new" button opens AddItemModal WITHOUT stops prop in some paths — items may be created without a stop
- City filter uses `it.city` which is derived from stop name — if stop name changes, old items still show old city
- No sort options (items are in sort_order from DB)

### 4.2 View Item — Detail Modal
```
Entry: Tap any item card (from Plan, Itinerary, or Expenses tab)
Screen: DetailModal — bottom sheet on mobile, centered on desktop
Shows (VIEW mode):
  - Photo carousel (from Google Places)
  - Action bar: Add to trip / Added (remove) / Confirm & pay / Booked
  - Edit button
  - Badges: type, city, rating, price level, urgent, subcat, tier
  - Name, address, phone, opening hours (from Google Places)
  - Price display: live price (stays) / estimate / paid amount
  - Type-specific content:
    - Transport: route, depart/arrive times, booking options
    - Stay: check-in/out, highlights, live Xotelo rates or hardcoded options
    - Activity: description, what to expect (collapsible)
    - Food: dish, description, quote, what to expect + pro tips (collapsible)
  - Reserve note (booking urgency warning)
  - Source (recommendation attribution)
  - Booking link (with favicon)
  - Attachments (uploaded files — multiple)
  - Upload button
  - Additional payment (collapsible, for confirmed items)
  - Notes (read-only in view mode)
  - Delete button (only for user-created items)
```
**Data sources:** items table, place_cache (photos/rating/address/phone), livePrices (Xotelo), expenses
**Issues:**
- VIEW mode shows notes read-only but no way to edit notes without entering full edit mode
- Photos only load when modal opens (lazy fetch from Google Places) — shows loading shimmer
- `it.city` in badges comes from stop name derivation — may be empty for some items
- Upload auto-sets status to "conf" which may not be intended
- The "Book / Reserve" link is always generic — no per-item booking URL tracking
- No way to change which stop(s) an item belongs to from the detail modal

### 4.3 Edit Item — Detail Modal Edit Mode
```
Entry: Detail Modal → "Edit" button
Screen: Same modal, fields become inputs
Editable fields:
  - Basic: Name, Type, Description, Dish (food only), Link, Source, Urgent toggle
  - Schedule: Start time, End time, Check-in/Check-out (stay only)
  - Pricing: Estimated cost (USD)
  - Notes: free text
```
**Missing from edit:**
- Stop assignment (can't change which stop the item belongs to)
- Subcat, tier (read-only in view, not in edit form)
- what_to_expect, pro_tips, highlights, quote (rich content — not editable)
- image_url (not editable)
- xotelo_key (not editable)
- reserve_note (not editable)
- hrs/duration for activities (not in edit form)

### 4.4 Create Item
```
Entry A: FAB (+) → "Add item"
Entry B: Plan tab → "+ Add something new" button
Screen: AddItemModal
Steps:
  Option 1 — URL fetch:
    1. Paste URL → "Fetch Details"
    2. System scrapes title/description → pre-fills form
    3. User adjusts: name, type, stop, description, dish, cost, link
    4. "Save Item"
  Option 2 — Manual:
    1. "Add Manually"
    2. Fill form: name, type, stop, description, dish (food), cost, link
    3. "Save Item"
Post-save:
  → Item created with status "sel"
  → enrichItem runs async: Google Places search for photos/rating/coords
  → For stays: attempts Xotelo key search (currently placeholder — returns null)
```
**Fields:** Name*, Type, Stop (dropdown), Description, Dish (food only), Est. cost, Link
**Missing:**
- No Google Places search for the item name (only URL scraping or manual)
- No way to assign multiple stops (transport items need 2+ stops)
- Stop dropdown may not pass stops prop from Plan tab "Add something new" button
- No start_time / end_time in creation form — must edit after to set schedule
- No validation feedback (just alert on error)
- No loading indicator during enrichItem async

### 4.5 Select Item (Add to Trip)
```
Entry: Detail Modal → "Add to our trip" button
Steps:
  1. Tap "Add to our trip"
  2. → Status changes to "sel"
  3. → Card shows violet border/background
  4. → Item appears in schedule (if has start_time)
  5. → Included in budget estimates
```
**Side effects:** For stays — mutual exclusion deselects other stays in the same stop.

### 4.6 Confirm & Pay Item
```
Entry: Detail Modal (status = sel) → "Confirm & pay" button
Steps:
  1. Tap "Confirm & pay"
  2. → Inline payment form appears: amount input
  3. Enter dollar amount
  4. Tap "Confirm"
  5. → Expense created (linked to item + stop)
  6. → Item status changes to "conf"
  7. → Card shows green border/background
  8. → Appears in Expenses confirmed section
```
**Fields:** Payment amount (USD)
**Issues:**
- No note field in the confirm flow (expense note defaults to item name)
- No way to skip payment and just mark as confirmed without a dollar amount
- Cancel button returns to "sel" view, not to "unselected"

### 4.7 Remove Item (Deselect)
```
Entry: Detail Modal (status = sel) → "Remove" button in status banner
Steps:
  1. Tap "Remove"
  2. → Status changes to "" (empty)
  3. → Card loses violet styling
  4. → Removed from schedule and budget
```
**Issues:** No confirmation. Instant. Could lose notes/scheduling if re-added later.

### 4.8 Delete Item
```
Entry: Detail Modal → "Remove" button at bottom (only for user-created items)
Condition: Only visible when `it.created_by` is set (items created by user)
Steps:
  1. Tap "Remove" (red text at bottom)
  2. Browser confirm() dialog
  3. → Item deleted from database
  4. → Disappears from all views
```
**Issues:**
- Confirm uses browser native dialog (not in-app modal)
- No undo
- Only available for user-created items — pre-loaded items can't be deleted
- The "Remove" text is confusing — same word used for deselecting AND deleting

### 4.9 Change Status (Confirmed → Selected)
```
Entry: Detail Modal (status = conf) → "Change" button in status banner
Steps:
  1. Tap "Change"
  2. → Status reverts to "sel"
  3. → Expense is NOT deleted (stays in expenses table)
```
**Issues:** The expense remains even though the item is no longer confirmed. Should it be removed? At minimum, user should be warned.

---

## 5. EXPENSES (CRUD)

### 5.1 View Expenses — Expenses Tab
```
Entry: Expenses tab (bottom nav)
Shows:
  - BudgetSummary (same shared component as Plan tab)
  - Confirmed section: expenses linked to items (name, type, stop, date, amount)
  - Unlinked expenses section (daily expenses without item)
  - Planned section: selected items with estimated costs
```
**Issues:**
- Confirmed expenses show item name but not the item's stop dates
- Planned items show `it.city` which may be empty (derived field)
- No way to edit an expense amount after creation

### 5.2 View Expense Detail
```
Entry: Tap confirmed expense card
Screen: Expense detail overlay (not DetailModal — separate inline sheet)
Shows:
  - Amount (green)
  - Date paid
  - Type (from linked item)
  - Stop name
  - Note
  - Paid by (email prefix)
  - "View [item name]" button → opens DetailModal for the linked item
  - "Delete expense" button
```
**Issues:** No edit functionality — can only view or delete.

### 5.3 Create Expense (from FAB)
```
Entry: FAB (+) → "Add expense"
Screen: AddExpenseModal — 2-step flow
Steps:
  1. Search/select an item from the list
  2. Tap item → Step 2
  3. Enter amount
  4. Optional: add note
  5. Tap "Add Expense"
  6. → Expense created linked to item + stop
```
**Fields:** Item selector (with search), Amount*, Note
**Issues:**
- Only shows items with status sel or conf — can't add expense for unselected item
- Category auto-set from item type — user can't override
- The search in step 1 searches `name + city + type` but city may be empty

### 5.4 Create Expense (from Confirm & Pay)
```
Entry: Detail Modal → "Confirm & pay" → enter amount → "Confirm"
(See 4.6 above)
```

### 5.5 Create Additional Payment
```
Entry: Detail Modal (status = conf) → "Add payment" collapsible
Steps:
  1. Expand "Add payment"
  2. Enter amount
  3. Tap "Add payment"
  4. → Additional expense created linked to same item
```
**Issues:** No note field. Multiple expenses per item accumulate.

### 5.6 Delete Expense
```
Entry A: Expense detail overlay → "Delete expense"
Entry B: Unlinked expense row → "remove" text button
Steps:
  1. Tap delete/remove
  2. → Expense deleted (no confirmation)
```
**Issues:** No confirmation dialog. Instant delete. No undo. If deleting a linked expense, the item remains "conf" status but with no expense — inconsistent state.

---

## 6. FILES / ATTACHMENTS

### 6.1 Upload File
```
Entry: Detail Modal (sel or conf status) → "Upload file" / "Upload another file"
Steps:
  1. Tap upload button
  2. System file picker opens (all file types)
  3. Select file (max 5MB)
  4. → File uploads to Supabase Storage
  5. → If item was "sel", auto-changes to "conf"
  6. → File appears in Attachments section
```
**Issues:**
- Upload auto-confirms the item — user may not intend to confirm just by uploading a reservation PDF
- No progress indicator during upload (just "Uploading..." text)
- Max 5MB limit shown only after selection (alert on failure)

### 6.2 View/Open File
```
Entry: Detail Modal → Attachments → "Open" link
→ Opens file URL in new tab
```

### 6.3 Remove File
```
Entry: Detail Modal → Attachments → × button
Steps:
  1. Tap ×
  2. → File deleted from Supabase Storage
  3. → Removed from UI
```
**Issues:** No confirmation. Instant delete.

---

## 7. PROFILE & SETTINGS

### 7.1 View/Edit Profile
```
Entry: TopBar avatar → Profile page
Shows:
  - Avatar (first letter of name)
  - Email (read-only)
  - Display Name (editable)
  - Dark Mode toggle
  - Sign Out button
  - About section
```

### 7.2 Change Display Name
```
Steps:
  1. Type name in input
  2. Tap "Save Name"
  3. → Updates Supabase user metadata
  4. → Shows "Saved" for 2 seconds
```

### 7.3 Toggle Dark Mode
```
Steps:
  1. Tap toggle switch
  2. → Immediately applies dark theme via data-theme attribute
  3. → Persists in localStorage
```

---

## 8. REAL-TIME SYNC

### 8.1 Item Change by Other User
```
Trigger: Ania changes an item status/notes/cost
Steps:
  1. Supabase realtime fires on items table change
  2. useItems handler updates local state
  3. Toast notification: "ania booked [item name]"
  4. All views re-render with new data
```
**Issues:** Toast lasts 3 seconds — easy to miss if not looking at screen.

### 8.2 Stop Change by Other User
```
Trigger: Ania updates a stop's dates
Steps:
  1. Supabase realtime fires on stops table change
  2. useStops reloads all stops
  3. All views re-render (pills, overview, maps)
```

---

## 9. MISSING PROCESSES (NOT IMPLEMENTED)

| Process | Impact | Difficulty |
|---|---|---|
| Delete stop | Can't remove stops created by mistake | Easy |
| Edit expense | Can't fix wrong payment amount | Easy |
| Reassign item to different stop | Can't move an item between stops | Medium |
| Password reset | Locked out users have no recovery | Easy |
| Onboarding | New user sees empty app with no guidance | Medium |
| Bulk actions | Can't select/confirm/delete multiple items | Medium |
| Duplicate item | Can't copy an item to another stop | Easy |
| Reorder schedule | Can't drag items to change time order | Hard |
| Share trip | Can't invite new collaborators | Hard |
| Export itinerary | Can't print or save offline PDF | Medium |

---

## 10. ELENA'S IMPROVEMENT RECOMMENDATIONS

### HIGH PRIORITY (reduces clicks, fixes broken flows)

**I1. Contextual "Add item" from stop** — When viewing a stop with an empty schedule, show "Add activity for Rome +" button that pre-fills the stop. Saves 3 clicks vs going through the FAB.

**I2. Fix the confirm-then-revert inconsistency** — When user changes status from conf → sel, the expense remains orphaned. Either: delete the expense with a warning, or prevent reverting without explicitly deleting the expense first.

**I3. Separate "Remove from trip" vs "Delete item" language** — Currently both use the word "Remove" in different positions. Rename to "Remove from trip" (deselect) and "Delete permanently" (destroy). Different colors, different positions.

**I4. Make stop edit discoverable** — Add a pencil icon or "Edit" text next to the dates. Users should not have to accidentally discover inline editing.

**I5. Allow adding items without full edit mode for schedule** — The AddItemModal has no start_time/end_time fields. User creates item, then must open it, tap Edit, set times, save. That's 5 extra taps. Add optional time fields to creation form.

### MEDIUM PRIORITY (UX polish)

**I6. Empty states with actions** — Every empty list should have a message AND a button: "No items scheduled for Rome. Add your first activity →" (opens AddItemModal with stop pre-filled).

**I7. Plan section starts open** — During planning (before trip), the plan section should default to expanded. Collapse during the trip when schedule is the primary content.

**I8. Uniform pill width** — Remove proportional sizing. All pills same width. Duration communicated by the date range text, not card width.

**I9. Upload should not auto-confirm** — Uploading a file should not change the item's status. A reservation PDF upload is not the same as confirming payment.

**I10. Add delete stop UI** — Show delete option in the stop edit mode (below save/cancel buttons). Confirm dialog: "Delete Rome? This will unlink X items."

### LOW PRIORITY (nice to have)

**I11. Overview pill should be visually distinct** — Use a different style (perhaps a back arrow or a separate row) instead of mixing with stop pills.

**I12. Fix date saving** — Stop appending `T00:00:00Z` to DATE values. Just pass the date string.

**I13. Notes should be editable inline** — Tap notes text → becomes textarea → save on blur. No need to enter full edit mode just to update notes.

**I14. Add "duplicate item" action** — In the detail modal, add "Copy to another stop" which creates a clone assigned to a different stop.

**I15. Show schedule position in plan cards** — Plan cards show type + time but not which day of a multi-day stop the item is on.
