"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueEmail = enqueueEmail;
exports.startEmailWorker = startEmailWorker;
const bullmq_1 = require("bullmq");
const embedded_1 = require("../database/embedded");
const quotaGuard_1 = require("./quotaGuard");
const QUEUE_NAME = 'email';
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
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: 1000,
                removeOnFail: 5000,
            },
        });
        // BullMQ's internal connection can emit 'error' (e.g. quota maxed on AUTH)
        // — a bare client with no listener takes the whole process down.
        queue.on('error', (err) => console.error('[email-queue] error:', err?.message ?? String(err)));
    }
    return queue;
}
/** Enqueue an email for async delivery. Returns the job. */
async function enqueueEmail(data, opts) {
    try {
        return await getQueue().add('send', data, {
            delay: opts?.delay,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[email-queue] enqueue failed:', msg);
        throw new quotaGuard_1.QueueUnavailableError(msg);
    }
}
let worker = null;
/** Starts the worker that consumes the queue and hands off each job to the processor. */
function startEmailWorker(deps) {
    if (worker) {
        return;
    }
    worker = new bullmq_1.Worker(QUEUE_NAME, async (job) => {
        await deps.process(job.data);
    }, {
        connection: makeConnection(),
        concurrency: 5,
    });
    worker.on('failed', (job, err) => {
        console.error(`[worker] Email job ${job?.id} failed:`, err.message);
    });
    worker.on('error', (err) => {
        console.error('[worker] Worker error:', err.message);
    });
    (0, quotaGuard_1.attachQuotaGuard)(worker, 'email-worker');
    console.log('[worker] Email worker started');
}
//# sourceMappingURL=emailQueue.js.map