import { NextResponse } from 'next/server';

/**
 * Tiny in-memory TTL cache.
 *
 * Why this exists: every page navigation hits Supabase Auth (getUser) in the
 * middleware, and every API GET hits it again in the route handler, then
 * queries the database. That is 2-3 network round-trips to Supabase per
 * screen load. We cache the auth lookup and the read queries for a few seconds
 * so the app feels instant and keeps working even if Supabase is briefly slow.
 *
 * This is a process-local singleton. It persists across requests in the same
 * server process (dev server and Node hosting). It is best-effort only — every
 * read is wrapped so a cache failure can never break a request.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | undefined {
  try {
    const e = store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expires) {
      store.delete(key);
      return undefined;
    }
    return e.value as T;
  } catch {
    return undefined;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  try {
    store.set(key, { value, expires: Date.now() + ttlMs });
  } catch {
    /* ignore */
  }
}

export function cacheDelete(key: string): void {
  try {
    store.delete(key);
  } catch {
    /* ignore */
  }
}

/** Run `fn` and cache its result. A cache miss (or undefined result) re-runs. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

/**
 * Browser cache hint for read API responses. `private` keeps per-user data out
 * of shared CDNs; `max-age=10` serves instantly from the browser cache for 10s,
 * and `stale-while-revalidate=60` lets the browser show cached data immediately
 * while refreshing it in the background for up to 60s.
 */
export const BROWSER_CACHE_CONTROL = 'private, max-age=10, stale-while-revalidate=60';

export function cachedJson(body: unknown): NextResponse {
  return NextResponse.json(body, {
    headers: { 'Cache-Control': BROWSER_CACHE_CONTROL },
  });
}
