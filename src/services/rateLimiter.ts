import Redis from 'ioredis';
import { resolveRedisConfig } from '../database/embedded';

/**
 * Per-API-key send rate limiter backed by Redis.
 *
 * Uses a fixed 1-second window keyed by `{apiKeyId}:{epochSecond}`.
 * Each send INCRs the counter; when it exceeds the configured max the
 * send is rejected with HTTP 429. Fails open if Redis is unreachable so
 * a Redis hiccup never blocks legitimate delivery.
 */

let client: Redis | null = null;

function getRedis(): Redis {
  if (!client) {
    const cfg = resolveRedisConfig();
    client = new Redis({ host: cfg.host, port: cfg.port });
    client.on('error', (err) => console.error('[rateLimit] redis error:', err.message));
  }
  return client;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets (minimum 1). */
  retryAfterSeconds: number;
}

export async function checkRateLimit(apiKeyId: string, maxPerSecond: number): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const bucket = Math.floor(Date.now() / 1000);
    const key = `rl:email:${apiKeyId}:${bucket}`;

    const current = await redis.incr(key);
    // Keep the key around just past the window boundary so late arrivals
    // for the previous second don't get a fresh key.
    if (current === 1) {
      await redis.expire(key, 2);
    }

    const allowed = current <= maxPerSecond;
    const retryAfterSeconds = Math.max(1, 2 - (Date.now() % 1000) / 1000);

    return {
      allowed,
      remaining: Math.max(0, maxPerSecond - current),
      retryAfterSeconds,
    };
  } catch (err) {
    // Fail open: if Redis is unavailable, don't block sends.
    console.error('[rateLimit] Redis check failed, allowing request:', (err as Error).message);
    return { allowed: true, remaining: 1, retryAfterSeconds: 0 };
  }
}
