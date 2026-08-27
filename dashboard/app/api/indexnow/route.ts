import { NextResponse, type NextRequest } from 'next/server';

// ─── IndexNow configuration ────────────────────────────────────────────────
// The key MUST match the contents of /public/<KEY>.txt and the keyLocation
// below. If you ever rotate it, update all three together.
const INDEXNOW_KEY = '7b3e9a2c-5d1f-4c8b-9e6a-0f2d4c6b8a13';
const HOST = 'mailenvoy.qd.je';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

// Submits one or more of our own URLs to IndexNow so Bing, Yandex, Naver,
// Seznam and other participating engines index them immediately instead of
// waiting for their next scheduled crawl.
//
// Body: { "urls": ["https://mailenvoy.qd.je/...", ...] }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawUrls = (body as { urls?: unknown })?.urls;

  if (!Array.isArray(rawUrls)) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'A "urls" array is required.' } },
      { status: 400 }
    );
  }

  // Only allow URLs that belong to our own host.
  const urls: string[] = [];
  for (const u of rawUrls) {
    if (typeof u !== 'string') continue;
    try {
      if (new URL(u).host === HOST) urls.push(u);
    } catch {
      /* ignore invalid URLs */
    }
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: `All URLs must point to ${HOST}.` } },
      { status: 400 }
    );
  }

  if (urls.length > 10000) {
    return NextResponse.json(
      { error: { type: 'validation_error', message: 'A single submission supports at most 10,000 URLs.' } },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls,
      }),
    });

    const text = await res.text().catch(() => '');
    if (res.ok) {
      return NextResponse.json({ submitted: urls.length, status: res.status });
    }

    return NextResponse.json(
      { error: { type: 'indexnow_error', message: text || res.statusText }, upstreamStatus: res.status },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: { type: 'network_error', message: e?.message || 'Failed to reach the IndexNow API.' } },
      { status: 502 }
    );
  }
}
