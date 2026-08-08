import { NextRequest } from 'next/server';
import { API_URL } from '@/lib/api';
import { requireSupabaseUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * Proxies the Express SSE stream to the browser.
 * The Next.js server authenticates via Supabase, then pipes the
 * domain-updated events through so the dashboard updates in realtime.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const upstream = await fetch(`${API_URL}/api/domains/events`, {
    headers: { Accept: 'text/event-stream' },
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Failed to connect to event stream', { status: 502 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const reader = upstream.body!.getReader();

      function push(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
          return push();
        });
      }

      push().catch((err) => controller.error(err));
    },
    cancel() {
      upstream.body?.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}