import { Queue, Worker, Job } from 'bullmq';
import type { EventEmitter } from 'node:events';
import { resolveRedisConfig } from '../database/embedded';
import { attachQuotaGuard, QueueUnavailableError } from './quotaGuard';

export interface EmailJobData {
  emailId: string;
}

const QUEUE_NAME = 'email';

let queue: Queue<EmailJobData> | null = null;

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

function getQueue(): Queue<EmailJobData> {
  if (!queue) {
    queue = new Queue<EmailJobData>(QUEUE_NAME, {
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
    (queue as unknown as EventEmitter).on('error', (err: Error) =>
      console.error('[email-queue] error:', err?.message ?? String(err)),
    );
  }
  return queue;
}

/** Enqueue an email for async delivery. Returns the job. */
export async function enqueueEmail(data: EmailJobData, opts?: { delay?: number }): Promise<Job<EmailJobData>> {
  try {
    return await getQueue().add('send', data, {
      delay: opts?.delay,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email-queue] enqueue failed:', msg);
    throw new QueueUnavailableError(msg);
  }
}

export interface EmailWorkerDeps {
  process: (data: EmailJobData) => Promise<void>;
}

let worker: Worker<EmailJobData> | null = null;

/** Starts the worker that consumes the queue and hands off each job to the processor. */
export function startEmailWorker(deps: EmailWorkerDeps): void {
  if (worker) {
    return;
  }
  worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      await deps.process(job.data);
    },
    {
      connection: makeConnection(),
      concurrency: 5,
    }
  );

  worker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
    console.error(`[worker] Email job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('[worker] Worker error:', err.message);
  });

  attachQuotaGuard(worker, 'email-worker');

  console.log('[worker] Email worker started');
}
