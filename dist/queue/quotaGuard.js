"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueUnavailableError = void 0;
exports.isQuotaExceededError = isQuotaExceededError;
exports.attachQuotaGuard = attachQuotaGuard;
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
class QueueUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.code = 'queue_unavailable';
        this.name = 'QueueUnavailableError';
    }
}
exports.QueueUnavailableError = QueueUnavailableError;
/** Backoff while the quota is exhausted — long, since only a reset helps. */
const QUOTA_BACKOFF_MS = parseInt(process.env.QUOTA_BACKOFF_MS || String(10 * 60 * 1000), 10);
function isQuotaExceededError(err) {
    if (!err)
        return false;
    return QUOTA_ERROR_RE.test(typeof err === 'string' ? err : err.message || '');
}
const paused = new WeakSet();
function attachQuotaGuard(worker, label) {
    worker.on('error', (err) => {
        if (!isQuotaExceededError(err) || paused.has(worker))
            return;
        paused.add(worker);
        console.error(`[${label}] Redis command quota exhausted — pausing worker for ${Math.round(QUOTA_BACKOFF_MS / 60000)} min ` +
            '(no jobs will be processed until the quota resets or the plan is upgraded).');
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
//# sourceMappingURL=quotaGuard.js.map