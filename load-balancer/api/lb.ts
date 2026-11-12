// E-NVOY load balancer — Vercel Edge function.
//
// Fans requests across every backend server (they all share the same
// Supabase database + Redis queue, so they are fully stateless) with
// passive failover: an upstream that errors or hangs is put on a short
// cooldown and traffic shifts to the healthy ones, so heavy work never
// wedges on a single host.
//
// Upstream list can be overridden with the LB_UPSTREAMS env var
// (comma-separated base URLs). Defaults are kept in code because both
// addresses are public allocation IPs — no secrets here.

export const config = { runtime: 'edge' };

declare const process: { env: Record<string, string | undefined> };

// Vercel Edge forbids fetching bare IPs, so upstreams are expressed as
// sslip.io wildcard-DNS hostnames that resolve to the allocation IPs
// (78-154-103-19.sslip.io -> 78.154.103.19, etc).
const DEFAULT_UPSTREAMS = 'http://78-154-103-19.sslip.io:12083,http://212-227-38-182.sslip.io:6113';

const UPSTREAMS: string[] = (process.env.LB_UPSTREAMS || DEFAULT_UPSTREAMS)
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const REQUEST_TIMEOUT_MS = 12_000;
const UNHEALTHY_COOLDOWN_MS = 30_000;
const HEALTH_TIMEOUT_MS = 4_000;

/** Per-warm-isolate health state. */
const unhealthyUntil = new Map<string, number>();
let roundRobin = 0;

function abortableTimeout(ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

async function probeHealth(base: string): Promise<boolean> {
  const t = abortableTimeout(HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/health`, { signal: t.signal, cache: 'no-store' });
    if (!res.ok) return false;
    const j = (await res.json()) as { status?: string };
    // Must be our own JSON health payload — hosting providers' "server
    // offline" pages also answer 200 but with HTML.
    return j.status === 'ok';
  } catch {
    return false;
  } finally {
    t.cancel();
  }
}

function pickCandidates(): string[] {
  const now = Date.now();
  const healthy = UPSTREAMS.filter((b) => (unhealthyUntil.get(b) ?? 0) <= now);
  const cooling = UPSTREAMS.filter((b) => (unhealthyUntil.get(b) ?? 0) > now);
  const ordered = [...healthy, ...cooling]; // cooling ones only serve if everything is marked down
  if (healthy.length > 1) {
    roundRobin = (roundRobin + 1) % healthy.length;
    return [...ordered.slice(roundRobin), ...ordered.slice(0, roundRobin)];
  }
  return ordered;
}

const DROPPED_HEADERS = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'content-length']);

function forwardHeaders(from: Headers): Headers {
  const out = new Headers();
  from.forEach((v, k) => {
    const lower = k.toLowerCase();
    if (DROPPED_HEADERS.has(lower) || lower.startsWith('cf-') || lower.startsWith('x-vercel-')) return;
    out.set(k, v);
  });
  return out;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/__lb/status') {
    const now = Date.now();
    return Response.json({
      mode: 'round-robin + passive failover',
      upstreams: UPSTREAMS.map((b) => {
        const retryAt = unhealthyUntil.get(b) ?? 0;
        return {
          base: b,
          healthy: retryAt <= now,
          retryAt: retryAt > now ? new Date(retryAt).toISOString() : null,
        };
      }),
    });
  }

  const target = url.pathname + url.search;

  // Buffer the body once so a failed attempt can be retried on the next upstream.
  const init: RequestInit = { method: req.method, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const candidates = pickCandidates();
  let lastError: unknown = null;

  for (const base of candidates) {
    const t = abortableTimeout(REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(base + target, { ...init, headers: forwardHeaders(req.headers), signal: t.signal });
      unhealthyUntil.delete(base);
      const resHeaders = new Headers(res.headers);
      // The isolate decompresses automatically — drop stale framing headers.
      resHeaders.delete('content-encoding');
      resHeaders.delete('content-length');
      resHeaders.delete('transfer-encoding');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders });
    } catch (err) {
      lastError = err;
      unhealthyUntil.set(base, Date.now() + UNHEALTHY_COOLDOWN_MS);
    } finally {
      t.cancel();
    }
  }

  // Everything was marked down — check if one actually recovered before giving up.
  const probes = await Promise.all(UPSTREAMS.map((b) => probeHealth(b).then((ok) => ({ b, ok }))));
  const alive = probes.find((p) => p.ok);
  if (alive) {
    try {
      const res = await fetch(alive.b + target, { ...init, headers: forwardHeaders(req.headers) });
      unhealthyUntil.delete(alive.b);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch (err) {
      lastError = err;
    }
  }

  return Response.json(
    {
      error: 'all backend servers are unreachable',
      tried: candidates,
      lastError: lastError instanceof Error ? lastError.message : String(lastError),
    },
    { status: 502 },
  );
}
