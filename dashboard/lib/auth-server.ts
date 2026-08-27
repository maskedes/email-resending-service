import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { cacheGet, cacheSet } from '@/lib/cache';

/**
 * Reads the Supabase session cookie value. We key the auth cache on this so we
 * don't call Supabase Auth on every single API request — only when the session
 * cookie actually changes.
 */
function getSessionToken(request: NextRequest): string | undefined {
  try {
    const all = request.cookies.getAll();
    const c = all.find((ck) => ck.name.startsWith('sb-') && ck.name.endsWith('-auth-token'));
    return c?.value;
  } catch {
    return undefined;
  }
}

/**
 * Verifies a Supabase session server-side for route handlers.
 * Returns the user on success, or a 401 NextResponse to short-circuit.
 *
 * The user lookup is cached for 60s per session cookie, which removes the
 * repeated Supabase Auth network call on every API hit.
 */
export async function requireSupabaseUser(request: NextRequest) {
  const token = getSessionToken(request);
  const cacheKey = token ? `user:${token}` : undefined;

  if (cacheKey) {
    const cached = cacheGet<User>(cacheKey);
    if (cached) return { user: cached, response: null };
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

  if (cacheKey) cacheSet(cacheKey, user, 60_000);
  return { user, response: null };
}
