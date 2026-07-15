import { describe, it, expect } from "vitest";
import { homeCityName } from "../features/itinerary/utils";
import { buildItemPayload } from "../shared/modals/addItemLogic";

// M40 — home city is the first stop, not a hardcoded literal.
describe("homeCityName (M40)", () => {
  it("returns the first stop name", () => {
    expect(homeCityName([{ name: "Lima" }, { name: "Cusco" }])).toBe("Lima");
    expect(homeCityName([{ name: "Tokyo" }])).toBe("Tokyo");
  });
  it("handles empty/undefined", () => {
    expect(homeCityName([])).toBe("");
    expect(homeCityName(null)).toBe("");
  });
});

// M44 — build the item insert payload with only real columns (no UI-only keys),
// clamping numbers and preserving 0 coords.
describe("buildItemPayload (M44)", () => {
  const form = {
    name: "  Hotel  ",
    type: "stay",
    description: "d",
    dish: "",
    subcat: "",
    tier: "Luxury",
    transport_mode: "",
    is_rental: false,
    link: "",
    notes: "",
    start_time: "",
    end_time: "",
    stop_ids: ["s1"],
    status: "conf",
    xotelo_key: "g1-d2",
    estimated_cost: "-5",
    hrs: "",
    origin: null,
    dest: null,
    // UI-only fields that must NOT reach the payload:
    tripadvisor_url: "https://tripadvisor.com/...",
    confirmed_cost: "250",
    expense_note: "paid deposit",
  };

  it("omits UI-only keys", () => {
    const p = buildItemPayload(form);
    expect(p).not.toHaveProperty("tripadvisor_url");
    expect(p).not.toHaveProperty("confirmed_cost");
    expect(p).not.toHaveProperty("expense_note");
  });

  it("trims the name, clamps negatives, nulls empty hrs", () => {
    const p = buildItemPayload(form);
    expect(p.name).toBe("Hotel");
    expect(p.estimated_cost).toBe(0); // clamped from -5
    expect(p.hrs).toBeNull();
    expect(p.start_time).toBeNull();
  });

  it("derives origin/dest coords (0 preserved) and route", () => {
    const p = buildItemPayload({
      ...form,
      type: "transport",
      origin: { name: "A", lat: 0, lng: 0 },
      dest: { name: "B", lat: 1, lng: 2 },
    });
    expect(p.origin_lat).toBe(0);
    expect(p.origin_lng).toBe(0);
    expect(p.dest_name).toBe("B");
    expect(p.route).toBe("A → B");
  });
});
