import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { expressFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';
  const { status, data } = await expressFetch(`/api/sms?limit=${limit}&offset=${offset}`, { userId: user!.id });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const { status, data } = await expressFetch('/api/sms/send', { method: 'POST', body, userId: user!.id });
  return NextResponse.json(data, { status });
}
