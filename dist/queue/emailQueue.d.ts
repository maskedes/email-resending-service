import { Job } from 'bullmq';
export interface EmailJobData {
    emailId: string;
}
/** Enqueue an email for async delivery. Returns the job. */
export declare function enqueueEmail(data: EmailJobData, opts?: {
    delay?: number;
}): Promise<Job<EmailJobData>>;
export interface EmailWorkerDeps {
    process: (data: EmailJobData) => Promise<void>;
}
/** Starts the worker that consumes the queue and hands off each job to the processor. */
export declare function startEmailWorker(deps: EmailWorkerDeps): void;
//# sourceMappingURL=emailQueue.d.ts.map