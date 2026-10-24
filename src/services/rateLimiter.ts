/**
 * Per-API-key send rate limiter — in-memory.
 *
 * Uses a fixed 1-second window keyed by `apiKeyId:{epochSecond}`.
 * Each send INCRs the counter; when it exceeds the configured max the
 * send is rejected with HTTP 429.
 *
 * Deliberately NOT backed by Redis. The original implementation burned two
 * Redis commands (INCR + EXPIRE) per send against the Upstash free tier's
 * 500k-commands/month cap — helping exhaust the quota and 429 every worker
 * in the process. A single-process fixed window is the correct fit for the
 * one-instance WispByte deployment and costs zero Redis commands.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets (minimum 1). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  /** Epoch second the bucket belongs to. */
  bucket: number;
}

const buckets = new Map<string, Bucket>();

/** Prune stale buckets so the map can't grow unbounded. */
function prune(nowBucket: number): void {
  const staleBefore = nowBucket - 2;
  for (const [key, b] of buckets) {
    if (b.bucket < staleBefore) buckets.delete(key);
  }
}

export async function checkRateLimit(apiKeyId: string, maxPerSecond: number): Promise<RateLimitResult> {
  const nowBucket = Math.floor(Date.now() / 1000);
  if (buckets.size > 4096) prune(nowBucket);

  const key = `${apiKeyId}:${nowBucket}`;
  const entry = buckets.get(key);

  const current = entry ? entry.count + 1 : 1;
  buckets.set(key, { count: current, bucket: nowBucket });

  const allowed = current <= maxPerSecond;
  const retryAfterSeconds = Math.max(1, 2 - (Date.now() % 1000) / 1000);

  return {
    allowed,
    remaining: Math.max(0, maxPerSecond - current),
    retryAfterSeconds,
  };
}
