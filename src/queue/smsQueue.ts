import { Queue, Worker, Job } from 'bullmq';
import { resolveRedisConfig } from '../database/embedded';

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
    tls: redis.tls ? {} : undefined,
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
  }
  return queue;
}

export async function enqueueSms(data: SmsJobData, opts?: { delay?: number }): Promise<Job<SmsJobData>> {
  return getQueue().add('send', data, { delay: opts?.delay });
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
  console.log('[sms-worker] started');
}
