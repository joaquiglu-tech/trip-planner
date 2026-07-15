import { supabase } from "./supabase";

const BUCKET = "reservations";
// Receipts/reservations are private (C5). Serve time-limited signed URLs
// instead of permanent public ones. 24h balances travel-day use vs exposure.
const SIGNED_URL_TTL = 60 * 60 * 24;

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
  const ext = file.name.split(".").pop();
  const path = `${itemId}/${Date.now()}.${ext}`;
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
  const { data, error } = await supabase.storage.from(BUCKET).list(itemId);
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
