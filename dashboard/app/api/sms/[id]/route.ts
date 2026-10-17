import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';
import { expressFetch } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, response } = await requireSupabaseUser(request);
  if (response) return response;
  const { status, data } = await expressFetch(`/api/sms/${encodeURIComponent(id)}`, { userId: user!.id });
  return NextResponse.json(data, { status });
}
