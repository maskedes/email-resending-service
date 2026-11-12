"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueWebhookRetry = enqueueWebhookRetry;
exports.startWebhookWorker = startWebhookWorker;
const bullmq_1 = require("bullmq");
const embedded_1 = require("../database/embedded");
const quotaGuard_1 = require("./quotaGuard");
const QUEUE_NAME = 'webhook';
let queue = null;
function makeConnection() {
    const redis = (0, embedded_1.resolveRedisConfig)();
    // Include auth/TLS so managed Redis (Upstash, Redis Cloud) works.
    return {
        host: redis.host,
        port: redis.port,
        username: redis.username,
        password: redis.password,
        // Layerbase and similar TLS-routed providers REQUIRE an SNI servername;
        // without it the handshake is rejected with "TLS SNI required".
        tls: redis.tls ? { servername: redis.host } : undefined,
    };
}
function getQueue() {
    if (!queue) {
        queue = new bullmq_1.Queue(QUEUE_NAME, {
            connection: makeConnection(),
            defaultJobOptions: {
                attempts: 1,
                removeOnComplete: 1000,
                removeOnFail: 1000,
            },
        });
        // BullMQ's internal connection can emit 'error' (e.g. quota maxed on AUTH)
        // — a bare client with no listener takes the whole process down.
        queue.on('error', (err) => console.error('[webhook-queue] error:', err?.message ?? String(err)));
    }
    return queue;
}
/** Enqueue a retry attempt with a delay in milliseconds. */
async function enqueueWebhookRetry(data, delayMs) {
    try {
        await getQueue().add('retry', data, { delay: delayMs });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[webhook-queue] enqueue failed:', msg);
        throw new quotaGuard_1.QueueUnavailableError(msg);
    }
}
let worker = null;
function startWebhookWorker(deps) {
    if (worker)
        return;
    worker = new bullmq_1.Worker(QUEUE_NAME, async (job) => {
        await deps.process(job.data);
    }, { connection: makeConnection(), concurrency: 5 });
    worker.on('failed', (job, err) => {
        console.error(`[webhook-worker] retry job ${job?.id} failed:`, err.message);
    });
    worker.on('error', (err) => {
        console.error('[webhook-worker] error:', err.message);
    });
    (0, quotaGuard_1.attachQuotaGuard)(worker, 'webhook-worker');
    console.log('[webhook-worker] started');
}
//# sourceMappingURL=webhookQueue.js.map