import { Queue, Worker, Job } from 'bullmq';
import { resolveRedisConfig } from '../database/embedded';

export interface EmailJobData {
  emailId: string;
}

const QUEUE_NAME = 'email';

let queue: Queue<EmailJobData> | null = null;

function makeConnection() {
  const redis = resolveRedisConfig();
  return { host: redis.host, port: redis.port };
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
  }
  return queue;
}

/** Enqueue an email for async delivery. Returns the job. */
export async function enqueueEmail(data: EmailJobData, opts?: { delay?: number }): Promise<Job<EmailJobData>> {
  return getQueue().add('send', data, {
    delay: opts?.delay,
  });
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

  console.log('[worker] Email worker started');
}