/**
 * Supabase admin client for server-side writes.
 * Uses the service_role key to bypass RLS.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend .env.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocketImpl from 'ws';

// Supabase's RealtimeClient requires a global `WebSocket`, which Node only
// provides natively from v22. Runtimes on older images (e.g. the WispByte
// `nodejs_19` image) would otherwise throw inside createClient(). Supply the
// `ws` implementation when there is no native WebSocket.
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocketImpl;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.'
    );
  }

  client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}
