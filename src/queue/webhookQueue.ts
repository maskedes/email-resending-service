import { Queue, Worker, Job } from 'bullmq';
import { resolveRedisConfig } from '../database/embedded';

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
    tls: redis.tls ? {} : undefined,
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
  }
  return queue;
}

/** Enqueue a retry attempt with a delay in milliseconds. */
export async function enqueueWebhookRetry(
  data: WebhookDeliveryJobData,
  delayMs: number
): Promise<void> {
  await getQueue().add('retry', data, { delay: delayMs });
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
  console.log('[webhook-worker] started');
}
