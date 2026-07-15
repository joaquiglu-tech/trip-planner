import { supabase } from "./supabase";

const BUCKET = "reservations";
// Receipts/reservations are private (C5). Serve time-limited signed URLs
// instead of permanent public ones. 24h balances travel-day use vs exposure.
const SIGNED_URL_TTL = 60 * 60 * 24;

// Extension of a filename, or "" when there's no real one (M50) — avoids the
// `split('.').pop()` bug that returns the whole name for dot-less files.
export function fileExt(name) {
  const dot = (name || "").lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

// Build the storage object path; omit the dot when there's no extension (M50).
export function storagePath(itemId, name, stamp) {
  const ext = fileExt(name);
  return ext ? `${itemId}/${stamp}.${ext}` : `${itemId}/${stamp}`;
}

async function signedUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) {
    console.warn("Failed to sign URL for", path, error);
    return "";
  }
  return data.signedUrl;
}

export async function uploadFile(itemId, file) {
  if (!file) throw new Error("No file provided"); // M50: guard null/undefined
  const path = storagePath(itemId, file.name, Date.now());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return { name: file.name, path, url: await signedUrl(path) };
}

export async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function listFiles(itemId) {
  // M50: explicit high limit so items with many files aren't silently truncated
  // at the default page size (receipts per item are few, so one page suffices).
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(itemId, { limit: 1000 });
  if (error || !data) return [];
  const paths = data.map((f) => `${itemId}/${f.name}`);
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  if (signErr || !signed) {
    console.warn("Failed to sign URLs for", itemId, signErr);
    return data.map((f, i) => ({ name: f.name, path: paths[i], url: "" }));
  }
  return data.map((f, i) => ({
    name: f.name,
    path: paths[i],
    url: signed[i]?.signedUrl || "",
  }));
}
