import { NextResponse, type NextRequest } from 'next/server';
import { expressFetch } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '50';
  const offset = url.searchParams.get('offset') || '0';

  const { status, data } = await expressFetch(`/api/logs?limit=${limit}&offset=${offset}`);

  if (status === 401) {
    return NextResponse.json({ error: { type: 'unauthorized', message: 'Not authenticated.' } }, { status: 401 });
  }

  return NextResponse.json(data || { data: [] }, { status });
}
