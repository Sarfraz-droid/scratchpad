import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Anon/publishable key only — safe for the browser. Use apps/server for anything
// requiring the service-role key.
export const supabase = createClient(url, anonKey);
