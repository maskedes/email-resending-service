import type { Worker } from 'bullmq';

/**
 * Upstash (and other managed Redis providers) enforce a hard monthly command
 * quota. When it is exhausted every command fails with
 * "ERR max requests limit exceeded" — and BullMQ's internal worker loop
 * retries rejected commands immediately, producing hundreds of errors per
 * second (observed ~120/s in production) while achieving nothing.
 *
 * attachQuotaGuard pauses the worker for a long backoff when it detects a
 * quota error, logs ONCE per backoff window, and resumes afterwards. This
 * keeps the deployment quiet and stops burning any residual quota until the
 * provider resets it (monthly on Upstash free tier) or the plan is upgraded.
 */

const QUOTA_ERROR_RE = /max requests limit exceeded/i;

/** Thrown by producer-side enqueue when Redis is unreachable or quota-maxed. */
export class QueueUnavailableError extends Error {
  code = 'queue_unavailable';
  constructor(message: string) {
    super(message);
    this.name = 'QueueUnavailableError';
  }
}

/** Backoff while the quota is exhausted — long, since only a reset helps. */
const QUOTA_BACKOFF_MS = parseInt(process.env.QUOTA_BACKOFF_MS || String(10 * 60 * 1000), 10);

export function isQuotaExceededError(err: Error | string | undefined | null): boolean {
  if (!err) return false;
  return QUOTA_ERROR_RE.test(typeof err === 'string' ? err : err.message || '');
}

const paused = new WeakSet<Worker>();

export function attachQuotaGuard(worker: Worker, label: string): void {
  worker.on('error', (err: Error) => {
    if (!isQuotaExceededError(err) || paused.has(worker)) return;
    paused.add(worker);
    console.error(
      `[${label}] Redis command quota exhausted — pausing worker for ${Math.round(QUOTA_BACKOFF_MS / 60000)} min ` +
      '(no jobs will be processed until the quota resets or the plan is upgraded).',
    );
    worker.pause().then(() => {
      setTimeout(() => {
        paused.delete(worker);
        worker.resume();
        console.log(`[${label}] quota backoff elapsed — worker resumed.`);
      }, QUOTA_BACKOFF_MS).unref?.();
    }).catch(() => {
      // If even the pause command fails (quota), retry the pause after the
      // backoff window so we do not hot-loop in .pause() either.
      setTimeout(() => {
        paused.delete(worker);
        attachQuotaGuard(worker, label);
      }, QUOTA_BACKOFF_MS).unref?.();
    });
  });
}
