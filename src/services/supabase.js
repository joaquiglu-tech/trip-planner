import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env file.");
}

// The throw above guarantees both are set — no dead `|| ''` fallback (L35).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// M49: warn (don't throw) when the Maps key is missing — maps/place search
// will be disabled, but the rest of the app still works.
if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    "Missing VITE_GOOGLE_MAPS_API_KEY — maps and place search are disabled.",
  );
}
