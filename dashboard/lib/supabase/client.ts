import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Used in client components for
 * sign in / sign up / OAuth / password reset actions.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * to be set in the dashboard's .env file.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
