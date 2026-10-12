import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { expressFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;
  const { status, data } = await expressFetch('/api/sms/gateway/status', { userId: user!.id });
  return NextResponse.json(data, { status });
}
export async function POST(request: NextRequest) {
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const { status, data } = await expressFetch('/api/sms/gateway/register', { method: 'POST', body, userId: user!.id });
  return NextResponse.json(data, { status });
}
