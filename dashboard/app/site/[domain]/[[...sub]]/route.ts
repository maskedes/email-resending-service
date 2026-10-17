import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public site renderer (no auth).
 *
 *   GET /site/<domain>/<subdomain>   → that user's page
 *   GET /site/<domain>               → the apex page
 *
 * In production a wildcard host (`<sub>.<SITE_DOMAIN>`) is proxied here by
 * Caddy; in development this path is what the dashboard "preview" link uses.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string; sub?: string[] }> }
) {
  const { domain: rawDomain, sub: rawSub } = await params;
  const domain = decodeURIComponent(rawDomain);
  const sub = rawSub?.[0] ? decodeURIComponent(rawSub[0]) : null;

  const sb = createAdminClient();
  let query = sb
    .from('sites')
    .select('html, is_published')
    .eq('domain', domain)
    .eq('is_published', true);
  query = sub ? query.eq('subdomain', sub) : query.is('subdomain', null);

  const { data } = await query.limit(1).maybeSingle();

  if (!data) {
    return new NextResponse('Site not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}
