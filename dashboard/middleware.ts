import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Auth-flow pages: signed-in users are redirected away from these to /overview
const AUTH_PAGES = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

// Routes reachable by anyone (signed-in or not) without a session.
// The auth pages MUST be here too — otherwise an unauthenticated request to
// /login (or /signup, which redirects to /login) hits the "redirect to login"
// guard below and rewrites itself to /login?next=/login, causing an infinite
// redirect loop ("too many redirects").
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/help',
  '/contacts',
  '/support',
  '/ceo-bio',
  '/documentation',
  '/api-reference',
  '/self-hosted-setup',
  '/rest-api',
  '/smtp-relay',
  '/api-key-auth',
  '/delivery-tracking',
  '/bullmq-queue',
  '/self-hosted',
  // Public user content: sites published on <sub>.<SITE_DOMAIN> and short links.
  '/site',
  '/s',
];

export async function middleware(request: NextRequest) {
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
  if (user && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
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
     * - public assets served from /public (logo-icon.svg, logo.svg, fonts, css,
     *   images). Without this, /logo-icon.svg etc. were treated as protected
     *   routes and redirected to /login, so the logo never rendered.
     * - SEO/verification files (robots.txt, sitemap.xml, *.html verification
     *   files). These must be served publicly and unauthenticated so Google
     *   Search Console can read them; otherwise they get redirected to /login.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf|eot|otf|pdf|txt|map|xml|html)$).*)',
  ],
};

