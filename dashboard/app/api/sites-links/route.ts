import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { expressFetch } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { user, response } = await requireSupabaseUser(req);
  if (response) return response;
  const url = new URL(req.url);
  const path = url.pathname.includes('/links') ? '/api/sites-links/links' : '/api/sites-links/sites';
  // Dashboard proxies both under same route — distinguish by query ?type=links
  const type = url.searchParams.get('type');
  const target = type === 'links' ? '/api/sites-links/links' : type === 'sites' ? '/api/sites-links/sites' : path;
  const { status, data } = await expressFetch(target, { userId: user!.id });
  return NextResponse.json(data, { status });
}
export async function POST(req: NextRequest) {
  const { user, response } = await requireSupabaseUser(req);
  if (response) return response;
  const body = await req.json().catch(() => ({}));
  // Heuristic: if body has target_url → link, else site
  const isLink = 'target_url' in body;
  const { status, data } = await expressFetch(isLink ? '/api/sites-links/links' : '/api/sites-links/sites', { method: 'POST', body, userId: user!.id });
  return NextResponse.json(data, { status });
}
