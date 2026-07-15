import { describe, it, expect } from "vitest";
import { itemHasExpense } from "../shared/hooks/useExpenses";

// M01 — max 1 expense per item. itemHasExpense is the guard used by addExpense.
describe("itemHasExpense (M01)", () => {
  const expenses = [
    { id: "e1", item_id: "1", amount: 100 },
    { id: "e2", item_id: null, amount: 20 }, // unlinked expense
  ];
  it("is true when the item already has an expense", () => {
    expect(itemHasExpense(expenses, "1")).toBe(true);
  });
  it("is false when the item has none", () => {
    expect(itemHasExpense(expenses, "2")).toBe(false);
  });
  it("is false for a null/undefined itemId (unlinked expenses are allowed)", () => {
    expect(itemHasExpense(expenses, null)).toBe(false);
    expect(itemHasExpense(expenses, undefined)).toBe(false);
    expect(itemHasExpense(expenses, "")).toBe(false);
  });
  it("is false for null/undefined expenses", () => {
    expect(itemHasExpense(null, "1")).toBe(false);
    expect(itemHasExpense(undefined, "1")).toBe(false);
  });
});
