import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../services/supabase";
import { enrichItem } from "../../services/enrichItem";

// Format a dollar amount. USD-only; rounded to at most 2 decimals so float
// sums never surface as e.g. $1,234.567 (M12). Negatives read "-$5", not "$-5" (L29).
export const $f = (n) => {
  const v = Number(n) || 0;
  return (
    (v < 0 ? "-$" : "$") +
    Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
  );
};

export function itemCost(it) {
  return Number(it.estimated_cost) || 0;
}

export function priceLabel(it, livePrice, expenseAmount) {
  if (expenseAmount > 0) return { text: $f(expenseAmount), type: "confirmed" };
  if (livePrice > 0 && it.type === "stay")
    return { text: `${$f(livePrice)}/n`, type: "live" };
  if (it.estimated_cost > 0)
    return { text: $f(Number(it.estimated_cost)), type: "estimate" };
  if (it.type === "activity" && !it.estimated_cost)
    return { text: "Free", type: "estimate" };
  return { text: "", type: "none" };
}

// Sum all expense amounts linked to an item (NaN-safe). Single source for
// "how much has been paid on this item" (M14 + M13).
export function sumItemExpenses(expenses, itemId) {
  return (expenses || []).reduce(
    (sum, e) => (e.item_id === itemId ? sum + (Number(e.amount) || 0) : sum),
    0,
  );
}

// Single source of truth for budget totals, shared by OverviewView and
// BudgetSummary (C4). Confirmed total sums positive expense amounts only;
// zero/negative (refund) expenses are excluded from the headline.
export function computeBudgetTotals(items, expenses) {
  const byType = {};
  let selTotal = 0,
    confTotal = 0,
    selCount = 0,
    confCount = 0;

  (items || []).forEach((it) => {
    if (it.status !== "sel" && it.status !== "conf") return;
    const typeKey = it.type === "food" ? "food" : it.type;
    if (!byType[typeKey]) byType[typeKey] = { sel: 0, conf: 0 };
    selCount++;
    if (it.status === "conf") {
      confCount++;
      const exp = sumItemExpenses(expenses, it.id);
      const val = exp > 0 ? exp : itemCost(it);
      selTotal += val;
      byType[typeKey].sel += val;
    } else {
      const est = itemCost(it);
      selTotal += est;
      byType[typeKey].sel += est;
    }
  });

  (expenses || []).forEach((e) => {
    const amt = Number(e.amount) || 0;
    if (amt <= 0) return;
    const item = (items || []).find((it) => it.id === e.item_id);
    const typeKey = item
      ? item.type === "food"
        ? "food"
        : item.type
      : "other";
    if (!byType[typeKey]) byType[typeKey] = { sel: 0, conf: 0 };
    confTotal += amt;
    byType[typeKey].conf += amt;
  });

  return { byType, selTotal, confTotal, selCount, confCount };
}

// Append an item, or merge it onto an existing entry with the same id, so an
// optimistic insert and its realtime echo can't produce a duplicate row (C3).
export function appendOrReplaceById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx < 0) return [...list, item];
  const next = [...list];
  next[idx] = { ...list[idx], ...item };
  return next;
}

// estimated_cost is owned by useLivePrices (Xotelo) for stays with a key —
// forms must treat it as read-only for those items (C2).
export function isXoteloManaged(item) {
  return item?.type === "stay" && !!item?.xotelo_key;
}

// Decide whether a realtime change from another client warrants a "X updated"
// toast. Suppresses automated writebacks (e.g. live prices) that don't bump
// updated_at, so background price refreshes don't spam collaborators (M41).
export function shouldNotifyUpdate(existing, incoming, currentUserEmail) {
  if (!incoming.updated_by || incoming.updated_by === currentUserEmail)
    return false;
  if (existing && existing.updated_at === incoming.updated_at) return false;
  return true;
}

// Build a coordinate pair, preserving a legitimate 0 (equator / prime
// meridian) that truthiness checks like `lat && lng` would wrongly drop (M05).
export function toCoord(lat, lng) {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln)
    ? { lat: la, lng: ln }
    : null;
}

// Re-insert an item into a list at its sort_order position (dedup by id), so a
// failed-delete rollback restores the original ordering, not the end (M09).
export function insertBySortOrder(list, item) {
  const next = list.filter((x) => x.id !== item.id);
  next.push(item);
  next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return next;
}

// Other selected/confirmed stays sharing a stop with the target — the ones the
// "one stay per stop" rule must deselect (M04). Pure so setStatus can order the
// writes safely.
export function conflictingStays(items, targetId, stopIds) {
  const stops = stopIds || [];
  return (items || []).filter(
    (it) =>
      it.type === "stay" &&
      it.id !== targetId &&
      (it.status === "sel" || it.status === "conf") &&
      (it.stop_ids || []).some((s) => stops.includes(s)),
  );
}

// Best-effort cleanup of an item's child rows/files. Must NOT chain .catch on
// a Supabase query builder — the builder is a thenable with no .catch, so that
// would throw synchronously (C1). Awaits each call and swallows errors instead.
export async function cleanupItemChildren(client, id) {
  const { error: expErr } = await client
    .from("expenses")
    .delete()
    .eq("item_id", id);
  if (expErr) console.warn("Expense cleanup failed:", expErr);
  const { error: cacheErr } = await client
    .from("place_cache")
    .delete()
    .eq("item_id", id);
  if (cacheErr) console.warn("Place cache cleanup failed:", cacheErr);
  try {
    const { data: storageFiles } = await client.storage
      .from("reservations")
      .list(id);
    if (storageFiles?.length > 0) {
      await client.storage
        .from("reservations")
        .remove(storageFiles.map((f) => `${id}/${f.name}`));
    }
  } catch (storageErr) {
    console.warn("Storage cleanup failed:", storageErr);
  }
}

function mergeItem(row, stopName, existingCity) {
  const coord = toCoord(row.lat, row.lng);
  const originCoord = toCoord(row.origin_lat, row.origin_lng);
  const destCoord = toCoord(row.dest_lat, row.dest_lng);
  const routeLabel =
    row.origin_name && row.dest_name
      ? `${row.origin_name} \u2192 ${row.dest_name}`
      : row.route || "";
  return {
    ...row,
    coord,
    originCoord,
    destCoord,
    routeLabel,
    city: stopName || existingCity || "",
    whatToExpect: row.what_to_expect
      ? row.what_to_expect
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    proTips: row.pro_tips
      ? row.pro_tips
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    highlights: row.highlights
      ? row.highlights
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    quoteSource: row.quote_source || "",
    options: row.booking_options?.length > 0 ? row.booking_options : null,
    reserveNote: row.reserve_note || "",
    start_time: row.start_time || row.depart_time || "",
    end_time: row.end_time || row.arrive_time || "",
  };
}

export function useItems(currentUserEmail, showToast) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  // Keep the latest-value ref in sync after commit (read only inside callbacks
  // like updateItem/addItem/deleteItem, never during render).
  useEffect(() => {
    itemsRef.current = items;
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loadKey, setLoadKey] = useState(0);
  const stopsMapRef = useRef({});
  const stopsDataRef = useRef([]);

  // Load items + stops for city derivation
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [itemsRes, stopsRes] = await Promise.all([
        supabase.from("items").select("*").order("sort_order"),
        supabase
          .from("stops")
          .select("id, name, start_date, end_date")
          .order("sort_order"),
      ]);
      if (cancelled) return;
      if (itemsRes.error) {
        console.warn("Failed to load items:", itemsRes.error);
        setError("Failed to load items");
        setLoaded(true);
        return;
      }
      const stopsMap = {};
      (stopsRes.data || []).forEach((s) => {
        stopsMap[s.id] = s;
      });
      stopsMapRef.current = stopsMap;
      stopsDataRef.current = stopsRes.data || [];
      const merged = (itemsRes.data || []).map((row) => {
        const firstStopId = row.stop_ids?.[0];
        const stop = firstStopId ? stopsMap[firstStopId] : null;
        return mergeItem(row, stop?.name || "", "");
      });
      setItems(merged);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("items-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            if (!payload.old?.id) return; // M02: no id (replica identity) → skip
            setItems((prev) => prev.filter((it) => it.id !== payload.old.id));
          } else {
            const firstStopId = payload.new.stop_ids?.[0];
            const stopName = firstStopId
              ? stopsMapRef.current[firstStopId]?.name || ""
              : "";
            setItems((prev) => {
              const idx = prev.findIndex((it) => it.id === payload.new.id);
              const existingCity = idx >= 0 ? prev[idx].city : "";
              const merged = mergeItem(payload.new, stopName, existingCity);
              return appendOrReplaceById(prev, merged);
            });
            const existing = itemsRef.current.find(
              (it) => it.id === payload.new.id,
            );
            if (
              showToast &&
              shouldNotifyUpdate(existing, payload.new, currentUserEmail)
            ) {
              const who = payload.new.updated_by.split("@")[0];
              const action =
                payload.new.status === "conf"
                  ? "booked"
                  : payload.new.status === "sel"
                    ? "added"
                    : "updated";
              showToast(`${who} ${action} ${payload.new.name}`);
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserEmail, showToast]);

  const updateItem = useCallback(
    async (id, changes, { stampUser = true } = {}) => {
      let prev;
      setItems((p) =>
        p.map((it) => {
          if (it.id === id) {
            prev = it;
            return { ...it, ...changes };
          }
          return it;
        }),
      );
      // Automated writebacks (live prices) pass stampUser:false so they don't
      // bump updated_at/updated_by — keeps audit honest and toasts quiet (M41).
      const payload = stampUser
        ? {
            ...changes,
            updated_at: new Date().toISOString(),
            updated_by: currentUserEmail,
          }
        : { ...changes };
      const { error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", id);
      if (error) {
        if (prev) setItems((p) => p.map((it) => (it.id === id ? prev : it)));
        throw error;
      }
    },
    [currentUserEmail],
  );

  const setStatus = useCallback(
    async (id, status) => {
      if (navigator.vibrate) navigator.vibrate(15);
      const item = itemsRef.current.find((it) => it.id === id);
      const itemStops = item?.stop_ids || [];

      // M04: set the target FIRST — that's the user's intent, and updateItem
      // rolls itself back on failure, so a failed change never leaves the stop
      // with the other stay already deselected and nothing selected.
      await updateItem(id, { status });

      // Then enforce "one stay per stop" as a best-effort follow-up. If this
      // fails we leave >1 selected (visible/recoverable) rather than 0.
      const isStaySelect =
        item?.type === "stay" &&
        itemStops.length > 0 &&
        (status === "sel" || status === "conf");
      if (!isStaySelect) return;

      const others = conflictingStays(itemsRef.current, id, itemStops);
      if (others.length === 0) return;

      const prevStatuses = others.map((o) => ({ id: o.id, status: o.status }));
      setItems((prev) =>
        prev.map((it) =>
          others.some((o) => o.id === it.id) ? { ...it, status: "" } : it,
        ),
      );
      try {
        await Promise.all(
          others.map((o) =>
            supabase
              .from("items")
              .update({
                status: "",
                updated_at: new Date().toISOString(),
                updated_by: currentUserEmail,
              })
              .eq("id", o.id),
          ),
        );
        if (showToast) {
          const names = others.map((o) => o.name).join(", ");
          showToast(`Deselected ${names} (only one stay per stop)`);
        }
      } catch (err) {
        console.warn("Failed to deselect conflicting stays:", err);
        setItems((prev) =>
          prev.map((it) => {
            const restore = prevStatuses.find((p) => p.id === it.id);
            return restore ? { ...it, status: restore.status } : it;
          }),
        );
        if (showToast)
          showToast("Selected, but couldn't deselect the other stay");
      }
    },
    [currentUserEmail, updateItem, showToast],
  );

  const addItem = useCallback(
    async (itemData) => {
      const maxSort = itemsRef.current.reduce(
        (max, it) => Math.max(max, it.sort_order || 0),
        0,
      );
      const newItem = {
        id: crypto.randomUUID(),
        name: itemData.name || "",
        type: itemData.type || "food",
        description: itemData.description || "",
        link: itemData.link || "",
        estimated_cost: itemData.estimated_cost || 0,
        dish: itemData.dish || "",
        subcat: itemData.subcat || "",
        tier: itemData.tier || "",
        route: itemData.route || "",
        transport_mode: itemData.transport_mode || "",
        is_rental: itemData.is_rental || false,
        xotelo_key: itemData.xotelo_key || null,
        origin_name: itemData.origin_name || "",
        origin_lat: itemData.origin_lat || null,
        origin_lng: itemData.origin_lng || null,
        dest_name: itemData.dest_name || "",
        dest_lat: itemData.dest_lat || null,
        dest_lng: itemData.dest_lng || null,
        hrs: itemData.hrs || null,
        notes: itemData.notes || "",
        start_time: itemData.start_time || null,
        end_time: itemData.end_time || null,
        stop_ids: itemData.stop_ids || [],
        sort_order: maxSort + 1,
        status: itemData.status || "sel",
        created_by: currentUserEmail,
        updated_by: currentUserEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("items")
        .insert(newItem)
        .select()
        .single();
      if (error) throw error;
      const firstStopId = data.stop_ids?.[0];
      const stopName = firstStopId
        ? stopsMapRef.current[firstStopId]?.name || ""
        : "";
      const merged = mergeItem(data, stopName, "");
      setItems((prev) => appendOrReplaceById(prev, merged));
      enrichItem(data)
        .then((changes) => {
          if (Object.keys(changes).length > 0) {
            updateItem(data.id, changes).catch((err) =>
              console.warn("enrichItem updateItem failed for", data.name, err),
            );
          }
        })
        .catch((err) => console.warn("enrichItem failed for", data.name, err));
      return data;
    },
    [currentUserEmail, updateItem],
  );

  const deleteItem = useCallback(async (id) => {
    let prev;
    setItems((p) => {
      prev = p.find((it) => it.id === id);
      return p.filter((it) => it.id !== id);
    });
    try {
      // Delete item first — source of truth. Orphaned children are less harmful than orphaned parents.
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) {
        console.warn("Failed to delete item:", error);
        // M09: restore at the original sort position, not the end.
        if (prev) setItems((p) => insertBySortOrder(p, prev));
        return;
      }
      // Cleanup children — best effort (awaits + swallows; never .catch a builder — C1)
      await cleanupItemChildren(supabase, id);
    } catch (err) {
      console.warn("deleteItem error:", err);
      if (prev) setItems((p) => insertBySortOrder(p, prev));
    }
  }, []);

  // Memoized derived data for live prices hook
  const staysWithKeys = useMemo(
    () => items.filter((it) => it.type === "stay" && it.xotelo_key),
    [items],
  );
  const stopsData = stopsDataRef.current;

  const retry = useCallback(() => {
    setError(null);
    setLoadKey((k) => k + 1);
  }, []);

  return {
    items,
    loaded,
    error,
    retry,
    updateItem,
    setStatus,
    addItem,
    deleteItem,
    staysWithKeys,
    stopsData,
  };
}
