// Build the item-insert payload from the Add form. Only real item columns are
// included — UI-only fields (tripadvisor_url, confirmed_cost, expense_note, the
// raw origin/dest objects) are dropped rather than spread in (M44). Numbers are
// clamped to >= 0 (M23) and coords use ?? so a real 0 is preserved (M05).
export function buildItemPayload(form) {
  const originName = form.origin?.name || "";
  const destName = form.dest?.name || "";
  return {
    name: form.name.trim(),
    type: form.type,
    description: form.description,
    dish: form.dish,
    subcat: form.subcat,
    tier: form.tier,
    transport_mode: form.transport_mode,
    is_rental: form.is_rental,
    link: form.link,
    notes: form.notes,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    stop_ids: form.stop_ids,
    status: form.status,
    xotelo_key: form.xotelo_key || null,
    estimated_cost: Math.max(0, parseFloat(form.estimated_cost) || 0),
    hrs: form.hrs ? Math.max(0, parseFloat(form.hrs) || 0) : null,
    origin_name: originName,
    origin_lat: form.origin?.lat ?? null,
    origin_lng: form.origin?.lng ?? null,
    dest_name: destName,
    dest_lat: form.dest?.lat ?? null,
    dest_lng: form.dest?.lng ?? null,
    route: [originName, destName].filter(Boolean).join(" → "),
  };
}
