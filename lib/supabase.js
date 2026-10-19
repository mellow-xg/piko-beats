import { createClient } from "@supabase/supabase-js";

// Supabase publishable keys are designed to be exposed in client applications.
// Authorization is enforced by RLS; never put a service-role/secret key here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fwgmvyzmrggmkedjqdki.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vTdHEf8J6UTiqhlRz5eAdw_0WRoXo4y";

export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;
