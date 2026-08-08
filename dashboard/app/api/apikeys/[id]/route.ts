import { NextResponse, type NextRequest } from 'next/server';
import { expressFetch } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { status, data } = await expressFetch(`/api/apikeys/${params.id}`, {
    method: 'DELETE',
  });
  return NextResponse.json(data, { status });
}
