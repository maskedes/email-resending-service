import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { cacheGet, cacheSet } from '@/lib/cache';

/**
 * Reads the Supabase session cookie value, used to key the auth cache so we
 * don't hit Supabase Auth on every navigation.
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
 * Refresh the Supabase session in Edge middleware and return both the
 * updated response and the current user (if any). Call this first in
 * the middleware and use the returned response for routing decisions.
 *
 * The user lookup is cached for 60s per session cookie so navigating between
 * screens doesn't trigger a Supabase Auth request every time.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const token = getSessionToken(request);
  const cacheKey = token ? `user:${token}` : undefined;
  if (cacheKey) {
    const cached = cacheGet<User>(cacheKey);
    if (cached) return { supabaseResponse, user: cached };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && cacheKey) cacheSet(cacheKey, user, 60_000);
  return { supabaseResponse, user };
}
