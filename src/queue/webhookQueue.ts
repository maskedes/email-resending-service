import { Queue, Worker, Job } from 'bullmq';
import type { EventEmitter } from 'node:events';
import { resolveRedisConfig } from '../database/embedded';
import { attachQuotaGuard, QueueUnavailableError } from './quotaGuard';

export interface WebhookDeliveryJobData {
  webhookId: string;
  /** Event name, e.g. "delivered" or "sms.sent". */
  event: string;
  /** Raw JSON body string as stored at first attempt. */
  rawBody: string;
  /** Attempt number this job is responsible for (2 = first retry). */
  attempt: number;
}

const QUEUE_NAME = 'webhook';

let queue: Queue<WebhookDeliveryJobData> | null = null;

function makeConnection() {
  const redis = resolveRedisConfig();
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

function getQueue(): Queue<WebhookDeliveryJobData> {
  if (!queue) {
    queue = new Queue<WebhookDeliveryJobData>(QUEUE_NAME, {
      connection: makeConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    // BullMQ's internal connection can emit 'error' (e.g. quota maxed on AUTH)
    // — a bare client with no listener takes the whole process down.
    (queue as unknown as EventEmitter).on('error', (err: Error) =>
      console.error('[webhook-queue] error:', err?.message ?? String(err)),
    );
  }
  return queue;
}

/** Enqueue a retry attempt with a delay in milliseconds. */
export async function enqueueWebhookRetry(
  data: WebhookDeliveryJobData,
  delayMs: number
): Promise<void> {
  try {
    await getQueue().add('retry', data, { delay: delayMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook-queue] enqueue failed:', msg);
    throw new QueueUnavailableError(msg);
  }
}

export interface WebhookWorkerDeps {
  process: (data: WebhookDeliveryJobData) => Promise<void>;
}

let worker: Worker<WebhookDeliveryJobData> | null = null;

export function startWebhookWorker(deps: WebhookWorkerDeps): void {
  if (worker) return;
  worker = new Worker<WebhookDeliveryJobData>(
    QUEUE_NAME,
    async (job: Job<WebhookDeliveryJobData>) => {
      await deps.process(job.data);
    },
    { connection: makeConnection(), concurrency: 5 }
  );
  worker.on('failed', (job: Job<WebhookDeliveryJobData> | undefined, err: Error) => {
    console.error(`[webhook-worker] retry job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err: Error) => {
    console.error('[webhook-worker] error:', err.message);
  });
  attachQuotaGuard(worker, 'webhook-worker');
  console.log('[webhook-worker] started');
}
