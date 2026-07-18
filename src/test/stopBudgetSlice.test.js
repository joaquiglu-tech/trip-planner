import { describe, it, expect } from "vitest";
import { stopBudgetSlice } from "../features/itinerary/utils";
import { computeBudgetTotals } from "../shared/hooks/useItems";

const items = [
  {
    id: "i1",
    type: "stay",
    status: "conf",
    estimated_cost: 100,
    stop_ids: ["s1"],
  },
  {
    id: "i2",
    type: "activity",
    status: "sel",
    estimated_cost: 20,
    stop_ids: ["s1", "s2"],
  },
  {
    id: "i3",
    type: "food",
    status: "sel",
    estimated_cost: 30,
    stop_ids: ["s2"],
  },
];
const expenses = [
  { id: "e1", item_id: "i1", amount: 90 }, // linked, in s1
  { id: "e2", item_id: "i3", amount: 25 }, // linked, in s2 only
  { id: "e3", stop_id: "s1", amount: 15, category: "other" }, // stop-level, s1
  { id: "e4", stop_id: "s2", amount: 5, category: "other" }, // stop-level, s2
];

describe("stopBudgetSlice", () => {
  it("returns empty slice for a stop with nothing", () => {
    const r = stopBudgetSlice(items, expenses, "s9");
    expect(r.items).toEqual([]);
    expect(r.expenses).toEqual([]);
  });

  it("includes items in the stop and their linked expenses", () => {
    const r = stopBudgetSlice(items, expenses, "s1");
    expect(r.items.map((i) => i.id).sort()).toEqual(["i1", "i2"]);
    expect(r.expenses.map((e) => e.id).sort()).toEqual(["e1", "e3"]);
  });

  it("includes stop-level unlinked expenses via stop_id", () => {
    const r = stopBudgetSlice(items, expenses, "s2");
    // i2 (multi-stop) + i3; expenses e2 (linked i3) + e4 (stop_id s2)
    expect(r.items.map((i) => i.id).sort()).toEqual(["i2", "i3"]);
    expect(r.expenses.map((e) => e.id).sort()).toEqual(["e2", "e4"]);
  });

  it("counts a multi-stop item for each of its stops", () => {
    expect(
      stopBudgetSlice(items, expenses, "s1").items.some((i) => i.id === "i2"),
    ).toBe(true);
    expect(
      stopBudgetSlice(items, expenses, "s2").items.some((i) => i.id === "i2"),
    ).toBe(true);
  });

  it("is null-safe", () => {
    expect(stopBudgetSlice(null, null, "s1")).toEqual({
      items: [],
      expenses: [],
    });
    expect(stopBudgetSlice(undefined, undefined, "s1")).toEqual({
      items: [],
      expenses: [],
    });
  });

  it("feeds computeBudgetTotals to give stop-scoped totals", () => {
    const r = stopBudgetSlice(items, expenses, "s1");
    const t = computeBudgetTotals(r.items, r.expenses);
    // i1 conf -> expense 90; i2 sel -> est 20  => selTotal 110
    expect(t.selTotal).toBe(110);
    // confirmed = positive expenses in slice: e1 90 + e3 15 = 105
    expect(t.confTotal).toBe(105);
  });
});

describe("stopBudgetSlice — transport scoping", () => {
  const items = [
    {
      id: "t1",
      type: "transport",
      status: "conf",
      estimated_cost: 400,
      stop_ids: ["s1", "s2"],
    },
    {
      id: "a1",
      type: "activity",
      status: "sel",
      estimated_cost: 50,
      stop_ids: ["s1", "s2"],
    },
  ];
  const expenses = [
    { id: "te", item_id: "t1", amount: 400 },
    { id: "ae", item_id: "a1", amount: 50 },
  ];

  it("counts transport only in its departure stop (stop_ids[0])", () => {
    const s1 = stopBudgetSlice(items, expenses, "s1");
    expect(s1.items.map((i) => i.id).sort()).toEqual(["a1", "t1"]);
    expect(s1.expenses.map((e) => e.id).sort()).toEqual(["ae", "te"]);
  });

  it("excludes transport from a non-departure stop it also lists", () => {
    const s2 = stopBudgetSlice(items, expenses, "s2");
    // multi-stop activity a1 still appears; transport t1 and its expense do not
    expect(s2.items.map((i) => i.id).sort()).toEqual(["a1"]);
    expect(s2.expenses.map((e) => e.id).sort()).toEqual(["ae"]);
  });
});
