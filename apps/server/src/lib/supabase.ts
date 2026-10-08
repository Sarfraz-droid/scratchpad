import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client for server-side use only. Never ship this key to the browser —
// apps/web should use the anon/publishable key instead.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
