import { describe, it, expect } from "vitest";
import {
  appendOrReplaceById,
  cleanupItemChildren,
  sumItemExpenses,
  isXoteloManaged,
  shouldNotifyUpdate,
} from "../shared/hooks/useItems";

// ─────────────────────────────────────────────────────────────
// C3 — addItem realtime-dedup guard
// ─────────────────────────────────────────────────────────────
describe("appendOrReplaceById (C3: duplicate item guard)", () => {
  it("appends a new item", () => {
    expect(appendOrReplaceById([{ id: "a" }], { id: "b" })).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });
  it("replaces/merges an existing id instead of duplicating", () => {
    const result = appendOrReplaceById([{ id: "a", city: "Rome" }], {
      id: "a",
      name: "X",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "a", city: "Rome", name: "X" });
  });
  it("dedupes the optimistic-append vs realtime-echo race (same id twice → single row)", () => {
    let list = [];
    list = appendOrReplaceById(list, { id: "a", name: "A" }); // optimistic addItem
    list = appendOrReplaceById(list, { id: "a", name: "A" }); // realtime INSERT echo
    expect(list).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// C1 — deleteItem cleanup must not chain .catch on a builder
// ─────────────────────────────────────────────────────────────
// Fake Supabase-like client whose delete().eq() returns a THENABLE WITH NO .catch,
// exactly like @supabase/postgrest-js PostgrestFilterBuilder.
function makeFakeClient({
  expensesError = null,
  placeError = null,
  files = [],
  throwOnList = false,
} = {}) {
  const removed = [];
  const client = {
    from(table) {
      return {
        delete() {
          return {
            eq() {
              const result = {
                error: table === "expenses" ? expensesError : placeError,
              };
              // thenable, but intentionally NO .catch / .finally
              return { then: (resolve) => resolve(result) };
            },
          };
        },
      };
    },
    storage: {
      from() {
        return {
          async list() {
            if (throwOnList) throw new Error("list failed");
            return { data: files };
          },
          async remove(paths) {
            removed.push(...paths);
            return { data: null, error: null };
          },
        };
      },
    },
  };
  return { client, removed };
}

describe("cleanupItemChildren (C1: no .catch on query builder)", () => {
  it("reproduces the root cause: the builder thenable has no .catch", () => {
    const { client } = makeFakeClient();
    const builder = client.from("expenses").delete().eq("item_id", "x");
    expect(typeof builder.then).toBe("function");
    expect(builder.catch).toBeUndefined();
    expect(() => builder.catch(() => {})).toThrow(TypeError);
  });

  it("resolves without throwing even though the builder lacks .catch", async () => {
    const { client } = makeFakeClient();
    await expect(
      cleanupItemChildren(client, "item-1"),
    ).resolves.toBeUndefined();
  });

  it("removes listed storage files under the item folder", async () => {
    const { client, removed } = makeFakeClient({
      files: [{ name: "a.pdf" }, { name: "b.jpg" }],
    });
    await cleanupItemChildren(client, "item-1");
    expect(removed).toEqual(["item-1/a.pdf", "item-1/b.jpg"]);
  });

  it("continues past a delete error and still cleans storage", async () => {
    const { client, removed } = makeFakeClient({
      expensesError: { message: "boom" },
      files: [{ name: "a.pdf" }],
    });
    await expect(
      cleanupItemChildren(client, "item-1"),
    ).resolves.toBeUndefined();
    expect(removed).toEqual(["item-1/a.pdf"]);
  });

  it("swallows a storage list failure", async () => {
    const { client } = makeFakeClient({ throwOnList: true });
    await expect(
      cleanupItemChildren(client, "item-1"),
    ).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// M14 — single source for "sum expenses for an item"
// ─────────────────────────────────────────────────────────────
describe("sumItemExpenses (M14 + M13 NaN guard)", () => {
  const expenses = [
    { item_id: "1", amount: 100 },
    { item_id: "1", amount: 50 },
    { item_id: "2", amount: 20 },
  ];
  it("sums only matching item_id", () => {
    expect(sumItemExpenses(expenses, "1")).toBe(150);
  });
  it("returns 0 for no matches", () => {
    expect(sumItemExpenses(expenses, "nope")).toBe(0);
  });
  it("handles null/undefined expenses", () => {
    expect(sumItemExpenses(null, "1")).toBe(0);
    expect(sumItemExpenses(undefined, "1")).toBe(0);
  });
  it("does not let a non-numeric amount poison the sum (M13)", () => {
    const bad = [
      { item_id: "1", amount: "abc" },
      { item_id: "1", amount: 10 },
    ];
    expect(sumItemExpenses(bad, "1")).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────
// C2 — estimated_cost is read-only for Xotelo-linked stays
// ─────────────────────────────────────────────────────────────
describe("isXoteloManaged (C2)", () => {
  it("is true for a stay with a xotelo_key", () => {
    expect(isXoteloManaged({ type: "stay", xotelo_key: "g123-d456" })).toBe(
      true,
    );
  });
  it("is false for a stay without a key", () => {
    expect(isXoteloManaged({ type: "stay", xotelo_key: "" })).toBe(false);
    expect(isXoteloManaged({ type: "stay" })).toBe(false);
  });
  it("is false for a non-stay even with a key", () => {
    expect(isXoteloManaged({ type: "food", xotelo_key: "g1" })).toBe(false);
  });
  it("is false for null/undefined", () => {
    expect(isXoteloManaged(null)).toBe(false);
    expect(isXoteloManaged(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// M41 — suppress collaborator toast for automated price writebacks
// ─────────────────────────────────────────────────────────────
describe("shouldNotifyUpdate (M41)", () => {
  const me = "me@x.com";
  const other = "other@x.com";
  it("does not notify for my own change", () => {
    expect(
      shouldNotifyUpdate(
        { updated_at: "t0" },
        { updated_by: me, updated_at: "t1" },
        me,
      ),
    ).toBe(false);
  });
  it("does not notify when updated_by is missing", () => {
    expect(shouldNotifyUpdate(null, { updated_at: "t1" }, me)).toBe(false);
  });
  it("notifies for another user's real edit (updated_at bumped)", () => {
    expect(
      shouldNotifyUpdate(
        { updated_at: "t0" },
        { updated_by: other, updated_at: "t1" },
        me,
      ),
    ).toBe(true);
  });
  it("notifies for a brand-new insert from another user (no existing)", () => {
    expect(
      shouldNotifyUpdate(
        undefined,
        { updated_by: other, updated_at: "t1" },
        me,
      ),
    ).toBe(true);
  });
  it("suppresses an automated writeback that did not bump updated_at", () => {
    // live-price writeback: estimated_cost changed but updated_at/updated_by untouched
    expect(
      shouldNotifyUpdate(
        { updated_at: "t0" },
        { updated_by: other, updated_at: "t0" },
        me,
      ),
    ).toBe(false);
  });
});
