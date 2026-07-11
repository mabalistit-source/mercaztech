// Supabase config + init for the Merkaztech activity log (merkaztech-log.html / merkaztech-entry.html).
// Fill in the two values below from your Supabase project settings — see MERKAZTECH-SETUP.md.
//
// The Supabase SDK itself is loaded lazily via loadSupabase() (dynamic import), not at module
// top-level, so that a page whose config isn't filled in yet — or whose network can't reach
// the CDN — still renders and can show a clear message instead of a blank page.

export const supabaseUrl = "YOUR_SUPABASE_URL";
export const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

export const isConfigured = !supabaseUrl.startsWith("YOUR_") && !supabaseAnonKey.startsWith("YOUR_");

let cached = null;

// Resolves to { client } — a ready-to-use Supabase client (auth + database + realtime).
export async function loadSupabase() {
  if (!isConfigured) throw new Error('Supabase is not configured yet (see MERKAZTECH-SETUP.md)');
  if (cached) return cached;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client = createClient(supabaseUrl, supabaseAnonKey);
  cached = { client };
  return cached;
}
