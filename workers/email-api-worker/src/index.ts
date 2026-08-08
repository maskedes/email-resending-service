/**
 * E-NVOY Email Sending API — Cloudflare Worker
 *
 * Sits at the edge in front of your Node/Express email API. It:
 *   1. Rate-limits per client IP (KV-backed, sliding window).
 *   2. Proxies POST /send and other /api/emails/* calls to the origin.
 *   3. Forwards the caller's `x-api-key` so origin auth still works.
 *   4. Handles CORS + preflight.
 *
 * Deploy:  npx wrangler deploy
 * Local:   npx wrangler dev
 */

export interface Env {
  ORIGIN_URL: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  EDGE_PROXY_SECRET?: string;
  RATE_LIMITER?: KVNamespace;
  WEBHOOKS?: KVNamespace;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown'
  );
}

function allowOrigin(request: Request, env: Env): string | null {
  const allowed = env.ALLOWED_ORIGINS || '*';
  if (allowed === '*') return '*';
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const list = allowed.split(',').map((s) => s.trim());
  return list.includes(origin) ? origin : null;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = allowOrigin(request, env);
  return {
    'access-control-allow-origin': origin || 'null',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, x-api-key, Authorization',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
}

/**
 * Sliding-window rate limit stored in KV.
 * Key: ratelimit:{ip}  →  JSON array of [timestamp, count] windows.
 */
async function rateLimited(request: Request, env: Env, ip: string): Promise<boolean> {
  if (!env.RATE_LIMITER) return false;

  const max = parseInt(env.RATE_LIMIT_MAX || '100', 10);
  const windowSec = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  const now = Math.floor(Date.now() / 1000);

  const key = `ratelimit:${ip}`;
  const raw = await env.RATE_LIMITER.get(key);
  let windows: Array<[number, number]> = [];
  if (raw) {
    try {
      windows = JSON.parse(raw) as Array<[number, number]>;
    } catch {
      windows = [];
    }
  }

  // Drop expired windows
  windows = windows.filter(([ts]) => ts > now - windowSec);

  const total = windows.reduce((sum, [, count]) => sum + count, 0);
  if (total >= max) return true;

  const current = windows.find(([ts]) => ts === now);
  if (current) current[1] += 1;
  else windows.push([now, 1]);

  await env.RATE_LIMITER.put(key, JSON.stringify(windows), { expirationTtl: windowSec * 2 });
  return false;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const cors = corsHeaders(request, env);

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Rate limit (skip for GET health/reads)
  if (method !== 'GET') {
    const limited = await rateLimited(request, env, clientIp(request));
    if (limited) {
      return new Response(
        JSON.stringify({
          error: {
            type: 'rate_limit_exceeded',
            message: 'Too many requests. Please try again later.',
          },
        }),
        {
          status: 429,
          headers: {
            ...cors,
            ...JSON_HEADERS,
            'retry-after': env.RATE_LIMIT_WINDOW_SECONDS || '60',
          },
        }
      );
    }
  }

  // Health check — no need to hit origin
  if (url.pathname === '/health' || url.pathname === '/') {
    return json({ status: 'ok', service: 'en-voy-email-api', timestamp: new Date().toISOString() }, 200);
  }

  // Build origin request, forwarding auth + API key headers
  const originUrl = (env.ORIGIN_URL || 'http://localhost:3000').replace(/\/+$/, '') + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');

  // Optional shared secret so origin can trust edge-proxied traffic
  if (env.EDGE_PROXY_SECRET) {
    headers.set('x-edge-proxy-secret', env.EDGE_PROXY_SECRET);
  }

  let body: BodyInit | null = null;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  const originRes = await fetch(originUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  // Pass through the origin response with CORS headers merged
  const resHeaders = new Headers(originRes.headers);
  for (const [k, v] of Object.entries(cors)) {
    if (k === 'vary') continue; // keep origin's vary
    resHeaders.set(k, v);
  }

  return new Response(originRes.body, {
    status: originRes.status,
    statusText: originRes.statusText,
    headers: resHeaders,
  });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    return handleRequest(request, env).catch((err) => {
      console.error('Worker error:', err);
      return json(
        {
          error: { type: 'internal_error', message: 'Edge worker error. Please try again.' },
        },
        500
      );
    });
  },
};
