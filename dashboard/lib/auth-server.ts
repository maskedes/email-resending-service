import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * When SKIP_AUTH=true the dashboard skips Supabase authentication entirely,
 * letting you work on the UI without logging in. Every API route that calls
 * this still works because the Express backend trusts the shared service
 * secret that expressFetch() always sends.
 */
export const AUTH_SKIPPED = process.env.SKIP_AUTH === 'true';

/**
 * Verifies a Supabase session server-side for route handlers.
 * Returns the user on success, or a 401 NextResponse to short-circuit.
 * When SKIP_AUTH is set, always lets the request through.
 */
export async function requireSupabaseUser(request: NextRequest) {
  if (AUTH_SKIPPED) {
    return { user: { id: 'skipped', email: 'skip@local' }, response: null };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: { type: 'unauthorized', message: 'Not authenticated.' } },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}
