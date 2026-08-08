import { NextResponse, type NextRequest } from 'next/server';
import { expressFetch } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { status, data } = await expressFetch('/api/dashboard/overview');

  if (status === 401) {
    return NextResponse.json({ error: { type: 'unauthorized', message: 'Not authenticated.' } }, { status: 401 });
  }
  if (status >= 400) {
    return NextResponse.json(data || { error: { type: 'error', message: 'Failed to load overview.' } }, { status });
  }
  return NextResponse.json(data);
}
