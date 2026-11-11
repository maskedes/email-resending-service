import { Queue, Worker, Job } from 'bullmq';
import type { EventEmitter } from 'node:events';
import { resolveRedisConfig } from '../database/embedded';
import { attachQuotaGuard, QueueUnavailableError } from './quotaGuard';

export interface SmsJobData {
  smsId: string;
}

const QUEUE_NAME = 'sms';

let queue: Queue<SmsJobData> | null = null;

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

function getQueue(): Queue<SmsJobData> {
  if (!queue) {
    queue = new Queue<SmsJobData>(QUEUE_NAME, {
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
      console.error('[sms-queue] error:', err?.message ?? String(err)),
    );
  }
  return queue;
}

export async function enqueueSms(data: SmsJobData, opts?: { delay?: number }): Promise<Job<SmsJobData>> {
  try {
    return await getQueue().add('send', data, { delay: opts?.delay });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sms-queue] enqueue failed:', msg);
    throw new QueueUnavailableError(msg);
  }
}

export interface SmsWorkerDeps {
  process: (data: SmsJobData) => Promise<void>;
}

let worker: Worker<SmsJobData> | null = null;

export function startSmsWorker(deps: SmsWorkerDeps): void {
  if (worker) return;
  worker = new Worker<SmsJobData>(
    QUEUE_NAME,
    async (job: Job<SmsJobData>) => {
      await deps.process(job.data);
    },
    { connection: makeConnection(), concurrency: 5 }
  );
  worker.on('failed', (job: Job<SmsJobData> | undefined, err: Error) => {
    console.error(`[sms-worker] job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err: Error) => {
    console.error('[sms-worker] error:', err.message);
  });
  attachQuotaGuard(worker, 'sms-worker');
  console.log('[sms-worker] started');
}
