import { supabase } from './supabase';

const BUCKET = 'reservations';

export async function uploadFile(itemId, file) {
  const ext = file.name.split('.').pop();
  const path = `${itemId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { name: file.name, path, url: data.publicUrl };
}

export async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function listFiles(itemId) {
  const { data, error } = await supabase.storage.from(BUCKET).list(itemId);
  if (error || !data) return [];
  return data.map((f) => {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${itemId}/${f.name}`);
    return { name: f.name, path: `${itemId}/${f.name}`, url: urlData.publicUrl };
  });
}
