import { describe, it, expect } from "vitest";
import { purgeDataCache, DATA_CACHE } from "../services/swCache";

// M43 — on logout, purge the service-worker cache holding private Supabase
// REST data so it can't be served to the next session / while logged out.
describe("purgeDataCache (M43)", () => {
  it("deletes the supabase data cache", async () => {
    const deleted = [];
    const fake = {
      delete: async (name) => {
        deleted.push(name);
        return true;
      },
    };
    const result = await purgeDataCache(fake);
    expect(deleted).toEqual([DATA_CACHE]);
    expect(result).toBe(true);
  });

  it("is a safe no-op when Cache Storage is unavailable", async () => {
    await expect(purgeDataCache(undefined)).resolves.toBe(false);
    await expect(purgeDataCache({})).resolves.toBe(false);
  });

  it("swallows delete errors instead of throwing", async () => {
    const fake = {
      delete: async () => {
        throw new Error("boom");
      },
    };
    await expect(purgeDataCache(fake)).resolves.toBe(false);
  });
});
