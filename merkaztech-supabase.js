// Supabase config + init for the Merkaztech activity log (merkaztech-log.html / merkaztech-entry.html).
// Fill in the two values below from your Supabase project settings — see MERKAZTECH-SETUP.md.
//
// The Supabase SDK itself is loaded lazily via loadSupabase() (dynamic import), not at module
// top-level, so that a page whose config isn't filled in yet — or whose network can't reach
// the CDN — still renders and can show a clear message instead of a blank page.

export const supabaseUrl = "https://ecyqkfyxnexypwaahcgq.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeXFrZnl4bmV4eXB3YWFoY2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTE0MzUsImV4cCI6MjA5OTM2NzQzNX0.E5e7mjglzXtedeZk9skcrtZ9HZWKKO3qb0VLSqb10S0";

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
