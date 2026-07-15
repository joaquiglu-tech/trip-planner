import { describe, it, expect } from "vitest";
import {
  appendOrReplaceById,
  cleanupItemChildren,
  sumItemExpenses,
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
