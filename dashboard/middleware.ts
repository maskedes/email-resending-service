import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_SKIPPED } from '@/lib/auth-server';
import { updateSession } from '@/lib/supabase/middleware';

// Public routes that never require a Supabase session
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
];

/**
 * When SKIP_AUTH=true the middleware lets every request through, so you can
 * browse the dashboard without logging in or configuring Cloudflare Access.
 */
export async function middleware(request: NextRequest) {
  if (AUTH_SKIPPED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // ---- Cloudflare Zero Trust Access check ----
  // When CLOUDFLARE_ACCESS_ENABLED=true, require the request to carry the
  // Cf-Access-Jwt-Assertion header that Cloudflare Access injects after a
  // successful login at the edge. Requests that bypass Cloudflare are blocked.
  if (process.env.CLOUDFLARE_ACCESS_ENABLED === 'true') {
    const cfHeader = request.headers.get('cf-access-jwt-assertion');
    const cfEmail = request.headers.get('cf-access-authenticated-user-email');
    if (!cfHeader && !cfEmail) {
      // Let API/auth asset paths through (Next internal), block page traffic.
      if (!pathname.startsWith('/_next')) {
        return new NextResponse('Access denied. This site is protected by Cloudflare Zero Trust.', {
          status: 403,
        });
      }
    }
  }

  // ---- Supabase session ----
  const { supabaseResponse, user } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // Not signed in -> redirect to login (except public routes)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Signed in -> keep them out of auth pages, send to overview
  if (user && isPublic && !pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/overview';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

