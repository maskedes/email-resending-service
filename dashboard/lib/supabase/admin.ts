import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client using the service_role key.
 * Bypasses RLS — use only in API route handlers, never on the client.
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment (non-public).
 */
let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
  }

  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
