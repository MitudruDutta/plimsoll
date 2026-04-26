// Supabase browser client. We only ever instantiate one — Supabase's
// in-memory session caches misbehave with multiple instances under
// fast-refresh. The client persists sessions in localStorage so
// reloads keep the user signed in without bouncing through the
// hosted UI.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Supabase 2024+ projects ship a "publishable" key (`sb_publishable_*`)
// that supersedes the legacy anon JWT. Both are accepted by
// @supabase/supabase-js, so we read the new var first and fall back to
// the legacy name for older setups.
const SUPABASE_CLIENT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const supabaseConfigured =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_CLIENT_KEY);

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) in frontend/.env.local.",
    );
  }
  _client = createClient(SUPABASE_URL, SUPABASE_CLIENT_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return _client;
}
