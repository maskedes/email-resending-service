import { NextResponse, type NextRequest } from 'next/server';
import { expressFetch } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { status, data } = await expressFetch('/api/apikeys');
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { status, data } = await expressFetch('/api/apikeys', {
    method: 'POST',
    body,
  });
  return NextResponse.json(data, { status });
}
