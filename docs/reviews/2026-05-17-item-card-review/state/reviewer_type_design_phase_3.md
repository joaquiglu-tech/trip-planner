# Type Design Review: Item Object Shape

**Reviewer**: Type Design Analyzer
**Date**: 2026-05-17
**Score**: 4.5/10

## Complete Field Map (46 columns)

| # | DB Column | mergeItem Alias | Summary? | EditMode? | AddItemModal? | Notes |
|---|-----------|----------------|----------|-----------|---------------|-------|
| 1 | id | passthrough | No | No | Yes (UUID) | |
| 2 | name | passthrough | Yes | Yes | Yes | |
| 3 | type | passthrough | Yes | Yes | Yes | |
| 4 | description | passthrough | Yes | Yes | Yes (via desc_text) | **P1: naming mismatch** |
| 5 | status | passthrough | Yes | Yes (immediate) | Yes (default sel) | |
| 6 | link | passthrough | Yes | Yes | Yes | |
| 7 | estimated_cost | passthrough | Yes (read-only) | **NO INPUT** | Yes | **P1: not editable** |
| 8-13 | dish,subcat,tier,route,transport_mode,is_rental | passthrough | Conditional | Conditional | Conditional | |
| 14-19 | origin/dest name/lat/lng | passthrough | Via routeLabel/coord | Yes (PlaceSearch) | Yes | |
| 20-21 | lat,lng | coord | Map only | No | No | Set by enrichItem |
| 22-23 | start_time,end_time | fallback from depart/arrive_time | Yes | Yes | Yes | **P1: legacy fallback** |
| 24-25 | depart_time,arrive_time | consumed into start/end | N/A | No | No | Legacy, never written |
| 26 | hrs | passthrough | Yes (activity) | Yes | Yes | |
| 27 | notes | passthrough | Yes | Yes | Yes | |
| 28 | stop_ids | passthrough | No (city derivation) | Yes | Yes | |
| 29 | sort_order | passthrough | No | No | **Never set** | **P1: missing on insert** |
| 30 | xotelo_key | passthrough | Yes | Yes (stay) | Yes | |
| 31 | booking_options | options | Yes | No | No | Import-only |
| 32-36 | what_to_expect,pro_tips,highlights,quote,quote_source | aliases | Yes | No | No | Import-only |
| 37 | reserve_note | reserveNote | Yes | Yes (raw name) | No | **P1: dual naming** |
| 38 | src | passthrough | Yes | Yes | No | P2 |
| 39 | google_place_id | passthrough | No | No | No | enrichItem |
| 40-43 | created/updated at/by | passthrough | No | No | Auto | |
| 44 | imageUrl | passthrough via spread | Yes (fallback) | No | No | P2: camelCase |
| 45 | address | passthrough via spread | Yes (fallback) | No | No | |
| 46 | city | DERIVED | Yes | No | No | Fragile |

## Key Findings

### P1-1: desc_text vs description naming split
AddItemModal uses `desc_text`, useItems bridges it. Fix: rename to `description` everywhere.

### P1-2: reserve_note vs reserveNote inconsistency
mergeItem creates alias `reserveNote`, but EditMode reads raw `reserve_note` via spread. Works by accident.

### P1-3: depart_time/arrive_time silent fallback
Legacy columns from import. App never writes to them. Two sources of truth.

### P1-4: sort_order never set on insert
User-created items get null sort_order, sorting unpredictably.

### P1-5: estimated_cost not editable in EditMode
Draft captures it, save logic diffs it, but zero input elements for it.

### P2-1: 6 import-only fields unreachable from UI
booking_options, what_to_expect, pro_tips, highlights, quote, quote_source visible but not editable.

### P2-2: src not settable on creation

### P2-3: imageUrl camelCase — verify actual DB column name

### P2-4: city derived from stops — fragile if stop deleted
