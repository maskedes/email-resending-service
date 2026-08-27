import { NextRequest } from 'next/server';
import { requireSupabaseUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * SSE heartbeat stream. Domain verification results are now returned
 * directly from the POST /api/domains/[id] handler, so this stream
 * just keeps the connection alive for the client.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireSupabaseUser(request);
  if (response) return response;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

      // Heartbeat every 25 seconds to keep the connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(': ping\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      // Clean up on close
      request.signal?.addEventListener('abort', () => {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}