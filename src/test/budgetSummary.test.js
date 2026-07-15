import { describe, it, expect } from "vitest";
// C4: single source of truth — import the REAL aggregator used by both
// OverviewView and BudgetSummary (no local copy of the logic here).
import { computeBudgetTotals } from "../shared/hooks/useItems";

describe("computeBudgetTotals", () => {
  const items = [
    {
      id: "1",
      name: "Hotel",
      type: "stay",
      status: "conf",
      estimated_cost: 500,
    },
    {
      id: "2",
      name: "Restaurant",
      type: "food",
      status: "sel",
      estimated_cost: 80,
    },
    {
      id: "3",
      name: "Museum",
      type: "activity",
      status: "sel",
      estimated_cost: 30,
    },
    {
      id: "4",
      name: "Unselected",
      type: "food",
      status: "",
      estimated_cost: 50,
    },
  ];

  const expenses = [{ id: "e1", item_id: "1", amount: 450 }];

  it("counts selected items correctly (sel + conf)", () => {
    expect(computeBudgetTotals(items, expenses).selCount).toBe(3);
  });

  it("does not count unselected items", () => {
    expect(computeBudgetTotals(items, expenses).selCount).toBe(3); // not 4
  });

  it("uses expense amount for confirmed items in selected total", () => {
    // Hotel: expense 450 (not estimate 500) + Restaurant: 80 + Museum: 30
    expect(computeBudgetTotals(items, expenses).selTotal).toBe(560);
  });

  it("confirmed total sums positive expenses", () => {
    expect(computeBudgetTotals(items, expenses).confTotal).toBe(450);
  });

  it("groups by type correctly", () => {
    const result = computeBudgetTotals(items, expenses);
    expect(result.byType.stay.sel).toBe(450); // expense value
    expect(result.byType.food.sel).toBe(80);
    expect(result.byType.activity.sel).toBe(30);
    expect(result.byType.stay.conf).toBe(450);
  });

  it("handles no expenses", () => {
    const result = computeBudgetTotals(items, []);
    expect(result.confTotal).toBe(0);
    expect(result.selTotal).toBe(610); // 500 + 80 + 30
  });

  it("handles empty items", () => {
    const result = computeBudgetTotals([], []);
    expect(result.selTotal).toBe(0);
    expect(result.confTotal).toBe(0);
    expect(result.selCount).toBe(0);
  });

  it("handles null items/expenses without throwing", () => {
    const result = computeBudgetTotals(null, null);
    expect(result).toEqual({
      byType: {},
      selTotal: 0,
      confTotal: 0,
      selCount: 0,
      confCount: 0,
    });
  });

  // M13 — a non-numeric amount must not poison the totals
  it("does not let a non-numeric expense amount produce NaN", () => {
    const bad = [{ id: "x", item_id: "1", amount: "not-a-number" }];
    const result = computeBudgetTotals(items, bad);
    expect(Number.isNaN(result.confTotal)).toBe(false);
    expect(result.confTotal).toBe(0);
  });

  // C4 — canonical refund rule: zero/negative expenses excluded from the
  // confirmed headline, consistently (this is what fixes the Overview↔Budget drift).
  it("excludes zero and negative (refund) expenses from confirmed total", () => {
    const withRefund = [
      { id: "e1", item_id: "1", amount: 450 },
      { id: "e2", item_id: "1", amount: -50 },
      { id: "e3", item_id: "2", amount: 0 },
    ];
    expect(computeBudgetTotals(items, withRefund).confTotal).toBe(450);
  });
});
