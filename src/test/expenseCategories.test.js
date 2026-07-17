import { describe, it, expect } from "vitest";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_ORDER,
  categoryLabel,
  orderBudgetTypeKeys,
  buildUnlinkedExpensePayload,
  buildUnlinkedExpenseChanges,
} from "../shared/constants/expenseCategories";

describe("expense category constant", () => {
  it("includes the four item types and the stop-only extras + other", () => {
    const values = EXPENSE_CATEGORIES.map((c) => c.value);
    for (const v of ["stay", "activity", "food", "transport"])
      expect(values).toContain(v);
    for (const v of ["groceries", "gas", "shopping", "fees", "misc", "other"])
      expect(values).toContain(v);
  });
});

describe("categoryLabel", () => {
  it("uses plural labels for the four item types (matches breakdown)", () => {
    expect(categoryLabel("stay")).toBe("Stays");
    expect(categoryLabel("activity")).toBe("Activities");
    expect(categoryLabel("food")).toBe("Food");
    expect(categoryLabel("transport")).toBe("Transport");
  });
  it("labels the extras", () => {
    expect(categoryLabel("gas")).toBe("Gas/Fuel");
    expect(categoryLabel("fees")).toBe("Fees/Tips");
    expect(categoryLabel("groceries")).toBe("Groceries");
  });
  it("empty/undefined => Other", () => {
    expect(categoryLabel("")).toBe("Other");
    expect(categoryLabel(undefined)).toBe("Other");
  });
  it("capitalizes an unknown custom value", () => {
    expect(categoryLabel("parking")).toBe("Parking");
  });
});

describe("orderBudgetTypeKeys", () => {
  it("orders known keys by CATEGORY_ORDER, other last, unknown before other", () => {
    const out = orderBudgetTypeKeys([
      "other",
      "food",
      "parking",
      "stay",
      "groceries",
    ]);
    expect(out).toEqual(["stay", "food", "groceries", "parking", "other"]);
  });
  it("does not mutate its input", () => {
    const input = ["other", "stay"];
    orderBudgetTypeKeys(input);
    expect(input).toEqual(["other", "stay"]);
  });
  it("CATEGORY_ORDER ends with other", () => {
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe("other");
  });
});

describe("buildUnlinkedExpensePayload", () => {
  it("builds a null-item payload from valid input", () => {
    expect(
      buildUnlinkedExpensePayload({
        amount: "12.5",
        category: "groceries",
        note: "  market  ",
        stopId: "s1",
        userEmail: "me@x.com",
        expenseDate: "2026-07-20",
      }),
    ).toEqual({
      amount: 12.5,
      category: "groceries",
      note: "market",
      item_id: null,
      stop_id: "s1",
      created_by: "me@x.com",
      expense_date: "2026-07-20",
    });
  });
  it("defaults category to other and blanks missing fields (null date)", () => {
    expect(buildUnlinkedExpensePayload({ amount: "5" })).toEqual({
      amount: 5,
      category: "other",
      note: "",
      item_id: null,
      stop_id: "",
      created_by: "",
      expense_date: null,
    });
  });
  it("returns null for a non-positive or non-numeric amount", () => {
    expect(buildUnlinkedExpensePayload({ amount: "0" })).toBeNull();
    expect(buildUnlinkedExpensePayload({ amount: "-3" })).toBeNull();
    expect(buildUnlinkedExpensePayload({ amount: "abc" })).toBeNull();
  });
});

describe("buildUnlinkedExpenseChanges", () => {
  const expense = {
    amount: 10,
    category: "food",
    note: "lunch",
    stop_id: "s1",
  };
  it("returns only changed fields", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "20", category: "food", note: "lunch", stop_id: "s1" },
        expense,
      ),
    ).toEqual({ amount: 20 });
  });
  it("captures category/note/stop edits and trims the note", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "10", category: "misc", note: "  dinner ", stop_id: "s2" },
        expense,
      ),
    ).toEqual({ category: "misc", note: "dinner", stop_id: "s2" });
  });
  it("ignores a non-positive amount edit", () => {
    expect(
      buildUnlinkedExpenseChanges(
        { amount: "0", category: "food", note: "lunch", stop_id: "s1" },
        expense,
      ),
    ).toEqual({});
  });
  it("captures an expense_date edit", () => {
    expect(
      buildUnlinkedExpenseChanges(
        {
          amount: "10",
          category: "food",
          note: "lunch",
          stop_id: "s1",
          expense_date: "2026-07-21",
        },
        { ...expense, expense_date: "2026-07-20" },
      ),
    ).toEqual({ expense_date: "2026-07-21" });
  });
  it("does not report an unchanged expense_date", () => {
    expect(
      buildUnlinkedExpenseChanges(
        {
          amount: "10",
          category: "food",
          note: "lunch",
          stop_id: "s1",
          expense_date: "2026-07-20",
        },
        { ...expense, expense_date: "2026-07-20" },
      ),
    ).toEqual({});
  });
  it("clears a date to null (not '') so the DATE column accepts it", () => {
    expect(
      buildUnlinkedExpenseChanges(
        {
          amount: "10",
          category: "food",
          note: "lunch",
          stop_id: "s1",
          expense_date: "",
        },
        { ...expense, expense_date: "2026-07-20" },
      ),
    ).toEqual({ expense_date: null });
  });
});
