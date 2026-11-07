import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';

/**
 * POST /api/sites-links/links/[id]/test-send
 * Proxies a "send this short link as a test SMS / email" request to the
 * Express backend (same x-api-key auth as /api/send). The browser never
 * touches the backend directly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { apiKey, channel, to, from } = body as Record<string, string>;

  if (!apiKey || !channel || !to) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'API key, channel (email/sms) and recipient (to) are required.' } },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    const upstream = await fetch(`${base}/api/sites-links/links/${encodeURIComponent(id)}/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ channel, to, from }),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to reach the backend.';
    return NextResponse.json(
      { error: { type: 'network_error', message } },
      { status: 502 }
    );
  }
}
