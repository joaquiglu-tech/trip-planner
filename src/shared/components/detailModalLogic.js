import { $f, isXoteloManaged } from "../hooks/useItems";

// Assign a numeric field (estimated_cost / hrs) to the changes object:
//  - empty string / null draft value → explicit unset (null) if currently set (M22)
//  - negative → clamped to 0 (M23)
//  - only written when it actually differs from the current value
function assignNumericField(changes, key, rawDraft, current) {
  if (rawDraft === "" || rawDraft == null) {
    if (current != null && current !== "" && (Number(current) || 0) !== 0) {
      changes[key] = null;
    }
    return;
  }
  const n = Math.max(0, Number(rawDraft));
  if (Number.isFinite(n) && n !== (Number(current) || 0)) changes[key] = n;
}

// Pure diff of an EditMode draft against the current item → the changes payload
// for updateItem. Centralizes the save rules (also used for the dirty check).
export function buildItemChanges(draft, it) {
  const changes = {};
  const name = draft.name.trim();
  if (name !== (it.name || "")) changes.name = name;
  if (draft.type !== (it.type || "food")) changes.type = draft.type;
  if (draft.description !== (it.description || ""))
    changes.description = draft.description;
  if (draft.dish !== (it.dish || "")) changes.dish = draft.dish;
  if (draft.link !== (it.link || "")) changes.link = draft.link;
  if (draft.notes !== (it.notes || "")) changes.notes = draft.notes;
  if (draft.src !== (it.src || "")) changes.src = draft.src;
  if (draft.reserve_note !== (it.reserve_note || ""))
    changes.reserve_note = draft.reserve_note;

  // C2: estimated_cost is read-only for Xotelo-linked stays (only useLivePrices
  // writes it). For everything else, apply the unset/clamp rules (M22/M23).
  if (!isXoteloManaged(draft)) {
    assignNumericField(
      changes,
      "estimated_cost",
      draft.estimated_cost,
      it.estimated_cost,
    );
  }

  if (draft.start_time !== (it.start_time || ""))
    changes.start_time = draft.start_time || null;
  if (draft.end_time !== (it.end_time || ""))
    changes.end_time = draft.end_time || null;
  if (JSON.stringify(draft.stop_ids) !== JSON.stringify(it.stop_ids || []))
    changes.stop_ids = draft.stop_ids;
  if (draft.subcat !== (it.subcat || "")) changes.subcat = draft.subcat;
  if (draft.tier !== (it.tier || "")) changes.tier = draft.tier;
  if (draft.xotelo_key !== (it.xotelo_key || ""))
    changes.xotelo_key = draft.xotelo_key;
  if (draft.transport_mode !== (it.transport_mode || ""))
    changes.transport_mode = draft.transport_mode;
  if (draft.is_rental !== !!it.is_rental) changes.is_rental = draft.is_rental;

  assignNumericField(changes, "hrs", draft.hrs, it.hrs);

  // Origin/dest — ?? not || so a real 0 coordinate is preserved (M05).
  const newOriginName = draft.origin?.name || "";
  const newDestName = draft.dest?.name || "";
  if (newOriginName !== (it.origin_name || "")) {
    changes.origin_name = newOriginName;
    changes.origin_lat = draft.origin?.lat ?? null;
    changes.origin_lng = draft.origin?.lng ?? null;
  }
  if (newDestName !== (it.dest_name || "")) {
    changes.dest_name = newDestName;
    changes.dest_lat = draft.dest?.lat ?? null;
    changes.dest_lng = draft.dest?.lng ?? null;
  }
  const derivedRoute = [newOriginName, newDestName].filter(Boolean).join(" → ");
  if (derivedRoute && derivedRoute !== (it.route || ""))
    changes.route = derivedRoute;

  return changes;
}

// Handle the "downgrade from confirmed deletes the linked expenses" flow.
// Returns { proceed, error? }. Gates on itemExpenses.length (M19) and surfaces
// a partial-failure so status isn't changed behind the user's back (M18).
export async function clearExpensesForDowngrade({
  current,
  next,
  itemExpenses,
  expenseAmount,
  confirm,
  deleteExpense,
}) {
  if (!(current === "conf" && next !== "conf")) return { proceed: true };
  if (!(itemExpenses?.length > 0)) return { proceed: true };
  const ok = await confirm(
    `This item has ${$f(expenseAmount)} in expenses. Changing status will delete the expenses. Continue?`,
    { destructive: true, confirmLabel: "Continue" },
  );
  if (!ok) return { proceed: false };
  const results = await Promise.allSettled(
    itemExpenses.map((e) => deleteExpense(e.id)),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    return {
      proceed: false,
      error: `Could not delete ${failed} expense(s). Status not changed — please try again.`,
    };
  }
  return { proceed: true };
}
