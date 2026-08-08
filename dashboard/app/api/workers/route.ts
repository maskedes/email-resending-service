import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const WORKER_NAME = 'en-voy-email-api';

export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  // No credentials configured → return not deployed
  if (!ACCOUNT_ID || !API_TOKEN) {
    return NextResponse.json({ worker: null, configured: false });
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (res.status === 404) {
      return NextResponse.json({ worker: null, configured: true });
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      return NextResponse.json(
        { worker: null, configured: true, error: data.errors?.[0]?.message || 'Failed to fetch worker.' },
        { status: 502 }
      );
    }

    const script = data.result;
    const deployment = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/subdomain`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: 'no-store',
      }
    );

    return NextResponse.json({
      configured: true,
      worker: {
        name: script.id || WORKER_NAME,
        deployed: true,
        modified: script.modified_on || '',
        url: `https://${WORKER_NAME}.${ACCOUNT_ID}.workers.dev`,
      },
    });
  } catch {
    return NextResponse.json(
      { worker: null, configured: true, error: 'Could not reach Cloudflare API.' },
      { status: 502 }
    );
  }
}