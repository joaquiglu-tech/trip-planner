import { describe, it, expect, vi } from "vitest";
import {
  buildItemChanges,
  clearExpensesForDowngrade,
} from "../shared/components/detailModalLogic";

// Minimal draft matching DetailModal's EditMode shape.
function draftOf(overrides = {}) {
  return {
    name: "Hotel",
    type: "food",
    description: "",
    dish: "",
    link: "",
    notes: "",
    src: "",
    reserve_note: "",
    estimated_cost: "",
    start_time: "",
    end_time: "",
    stop_ids: [],
    subcat: "",
    tier: "",
    transport_mode: "",
    is_rental: false,
    origin: null,
    dest: null,
    hrs: "",
    xotelo_key: "",
    ...overrides,
  };
}

describe("buildItemChanges", () => {
  it("trims the name and skips a no-op whitespace change (M24)", () => {
    expect(
      buildItemChanges(draftOf({ name: "  Hotel  " }), { name: "Hotel" }),
    ).toEqual({});
    expect(
      buildItemChanges(draftOf({ name: "  New  " }), { name: "Hotel" }),
    ).toEqual({ name: "New" });
  });

  it("unsets estimated_cost when cleared to empty (M22)", () => {
    expect(
      buildItemChanges(draftOf({ estimated_cost: "" }), {
        name: "Hotel",
        estimated_cost: 100,
      }),
    ).toEqual({
      estimated_cost: null,
    });
  });

  it("clamps a negative estimated_cost to 0 (M23)", () => {
    expect(
      buildItemChanges(draftOf({ estimated_cost: "-5" }), {
        name: "Hotel",
        estimated_cost: 100,
      }),
    ).toEqual({
      estimated_cost: 0,
    });
  });

  it("writes a valid changed estimated_cost", () => {
    expect(
      buildItemChanges(draftOf({ estimated_cost: "250" }), {
        name: "Hotel",
        estimated_cost: 100,
      }),
    ).toEqual({
      estimated_cost: 250,
    });
  });

  it("does NOT write estimated_cost for a Xotelo-linked stay (C2)", () => {
    const draft = draftOf({
      type: "stay",
      xotelo_key: "g1-d2",
      estimated_cost: "999",
    });
    expect(
      buildItemChanges(draft, {
        name: "Hotel",
        type: "stay",
        xotelo_key: "g1-d2",
        estimated_cost: 500,
      }),
    ).toEqual({});
  });

  it("unsets and clamps hrs the same way (M22/M23)", () => {
    expect(
      buildItemChanges(draftOf({ hrs: "" }), { name: "Hotel", hrs: 3 }),
    ).toEqual({ hrs: null });
    expect(
      buildItemChanges(draftOf({ hrs: "-2" }), { name: "Hotel", hrs: 3 }),
    ).toEqual({ hrs: 0 });
  });

  it("preserves a 0 origin coordinate (M05)", () => {
    const draft = draftOf({ origin: { name: "Null Island", lat: 0, lng: 0 } });
    const changes = buildItemChanges(draft, { name: "Hotel" });
    expect(changes.origin_name).toBe("Null Island");
    expect(changes.origin_lat).toBe(0);
    expect(changes.origin_lng).toBe(0);
  });
});

describe("clearExpensesForDowngrade", () => {
  const base = {
    expenseAmount: 100,
    confirm: vi.fn(async () => true),
    deleteExpense: vi.fn(async () => {}),
  };

  it("proceeds without prompting when not a conf→lower downgrade", async () => {
    const confirm = vi.fn();
    const res = await clearExpensesForDowngrade({
      ...base,
      current: "sel",
      next: "conf",
      itemExpenses: [{ id: "e1" }],
      confirm,
    });
    expect(res).toEqual({ proceed: true });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("proceeds when there are no expenses to clear (M19: gate on length)", async () => {
    const confirm = vi.fn();
    const res = await clearExpensesForDowngrade({
      ...base,
      current: "conf",
      next: "sel",
      itemExpenses: [],
      confirm,
    });
    expect(res).toEqual({ proceed: true });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("aborts when the user declines the confirm", async () => {
    const res = await clearExpensesForDowngrade({
      ...base,
      current: "conf",
      next: "sel",
      itemExpenses: [{ id: "e1" }],
      confirm: vi.fn(async () => false),
    });
    expect(res.proceed).toBe(false);
  });

  it("deletes all expenses and proceeds on success", async () => {
    const deleteExpense = vi.fn(async () => {});
    const res = await clearExpensesForDowngrade({
      ...base,
      current: "conf",
      next: "",
      itemExpenses: [{ id: "e1" }, { id: "e2" }],
      deleteExpense,
    });
    expect(res.proceed).toBe(true);
    expect(deleteExpense).toHaveBeenCalledTimes(2);
  });

  it("aborts with an error message on partial delete failure (M18)", async () => {
    const deleteExpense = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));
    const res = await clearExpensesForDowngrade({
      ...base,
      current: "conf",
      next: "sel",
      itemExpenses: [{ id: "e1" }, { id: "e2" }],
      deleteExpense,
    });
    expect(res.proceed).toBe(false);
    expect(res.error).toMatch(/could not delete/i);
  });
});
