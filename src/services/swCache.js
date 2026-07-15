// Service-worker runtime cache that holds private Supabase REST responses.
// Must match the `cacheName` in vite.config.js runtimeCaching.
export const DATA_CACHE = "supabase-api";

// Purge the private-data cache (M43). Called on sign-out so a logged-out or
// next session can't be served the previous user's cached trip/expense data.
// Safe no-op where Cache Storage is unavailable (SSR, tests, old browsers).
export async function purgeDataCache(cacheStorage = globalThis.caches) {
  if (!cacheStorage || typeof cacheStorage.delete !== "function") return false;
  try {
    return await cacheStorage.delete(DATA_CACHE);
  } catch (err) {
    console.warn("Failed to purge data cache:", err);
    return false;
  }
}
