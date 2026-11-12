/**
 * Supabase admin client for server-side writes.
 * Uses the service_role key to bypass RLS.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend .env.
 */
import { SupabaseClient } from '@supabase/supabase-js';
export declare function getSupabase(): SupabaseClient;
//# sourceMappingURL=supabase.d.ts.map