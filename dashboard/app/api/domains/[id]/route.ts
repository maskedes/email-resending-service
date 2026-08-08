import { NextResponse, type NextRequest } from 'next/server';
import { expressFetch } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const { status, data } = await expressFetch(`/api/domains/${id}`);
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const { status, data } = await expressFetch(`/api/domains/${id}/verify`, {
    method: 'POST',
  });
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const { id } = await params;
  const { status, data } = await expressFetch(`/api/domains/${id}`, {
    method: 'DELETE',
  });
  return NextResponse.json(data, { status });
}