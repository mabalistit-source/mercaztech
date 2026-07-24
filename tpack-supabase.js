// Supabase config for tpack.html only — a separate project from merkaztech-supabase.js
// (the TPACK tool is standalone and doesn't touch the activity-log project or its data).
// Only used to call the tpack-analyze Edge Function; nothing here is authenticated.

export const supabaseUrl = "https://kvgdmwbxovioqrrynsjl.supabase.co";
export const supabaseAnonKey = "sb_publishable_EmePkErvNLrVGL079lYJQg_psykXH2a";

export const isConfigured = !supabaseUrl.startsWith("YOUR_") && !supabaseAnonKey.startsWith("YOUR_");

let cached = null;

// Resolves to { client } — a ready-to-use Supabase client, used here only for functions.invoke().
export async function loadSupabase() {
  if (!isConfigured) throw new Error('Supabase is not configured yet');
  if (cached) return cached;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client = createClient(supabaseUrl, supabaseAnonKey);
  cached = { client };
  return cached;
}
