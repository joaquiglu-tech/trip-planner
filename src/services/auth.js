import { supabase } from "./supabase";

// Auth data-access lives here so pages stay presentational and don't call
// supabase.auth directly (M39). Each wrapper returns Supabase's { data, error }.
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function updateDisplayName(name) {
  return supabase.auth.updateUser({ data: { display_name: name } });
}
