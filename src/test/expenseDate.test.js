import { describe, it, expect } from "vitest";
import {
  itemStartDate,
  expenseSortValue,
  expenseDisplayDate,
} from "../shared/constants/expenseDate";

describe("itemStartDate", () => {
  it("returns the date part of a datetime-local start_time", () => {
    expect(itemStartDate({ start_time: "2026-07-20T14:30" })).toBe(
      "2026-07-20",
    );
  });
  it("returns a bare date string as-is", () => {
    expect(itemStartDate({ start_time: "2026-07-20" })).toBe("2026-07-20");
  });
  it("returns null when there is no start_time", () => {
    expect(itemStartDate({})).toBeNull();
    expect(itemStartDate(null)).toBeNull();
    expect(itemStartDate({ start_time: "" })).toBeNull();
  });
});

describe("expenseSortValue", () => {
  it("uses expense_date when present", () => {
    const a = expenseSortValue({ expense_date: "2026-07-20" });
    const b = expenseSortValue({ expense_date: "2026-07-19" });
    expect(a).toBeGreaterThan(b);
  });
  it("prefers expense_date over created_at", () => {
    // expense_date earlier than created_at → sorts by expense_date
    const withBoth = expenseSortValue({
      expense_date: "2026-01-01",
      created_at: "2026-12-31T00:00:00Z",
    });
    const dateOnly = expenseSortValue({ expense_date: "2026-01-01" });
    expect(withBoth).toBe(dateOnly);
  });
  it("falls back to created_at when expense_date is missing", () => {
    const v = expenseSortValue({ created_at: "2026-05-05T10:00:00Z" });
    expect(v).toBe(new Date("2026-05-05T10:00:00Z").getTime());
  });
  it("returns 0 when neither is present", () => {
    expect(expenseSortValue({})).toBe(0);
    expect(expenseSortValue(null)).toBe(0);
  });
});

describe("expenseDisplayDate", () => {
  it("formats expense_date without an off-by-one (parsed at local noon)", () => {
    // 2026-07-20 at noon local is always the 20th regardless of timezone
    const out = expenseDisplayDate({ expense_date: "2026-07-20" });
    expect(out).toBe(new Date("2026-07-20T12:00").toLocaleDateString());
  });
  it("falls back to created_at when expense_date is missing", () => {
    const out = expenseDisplayDate({ created_at: "2026-05-05T10:00:00Z" });
    expect(out).toBe(new Date("2026-05-05T10:00:00Z").toLocaleDateString());
  });
  it("returns empty string when neither is present", () => {
    expect(expenseDisplayDate({})).toBe("");
    expect(expenseDisplayDate(null)).toBe("");
  });
});
