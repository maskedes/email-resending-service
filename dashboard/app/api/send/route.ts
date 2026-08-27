import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';

// Proxies a send request to the Express backend's /api/emails/send endpoint.
// The browser cannot call the backend directly with the API key (CORS + key
// handling), so we forward server-side. The user supplies their own API key,
// which is sent as the `x-api-key` header expected by the backend.
export async function POST(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const { apiKey, from, to, subject, html, text } = body as Record<string, string>;

  if (!apiKey || !to || !subject || (!html && !text)) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'API key, To, Subject, and content (HTML or Text) are required.' } },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    const upstream = await fetch(`${base}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: { type: 'network_error', message: e?.message || 'Failed to reach the email service.' } },
      { status: 502 }
    );
  }
}
