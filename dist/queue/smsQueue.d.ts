import { Job } from 'bullmq';
export interface SmsJobData {
    smsId: string;
}
export declare function enqueueSms(data: SmsJobData, opts?: {
    delay?: number;
}): Promise<Job<SmsJobData>>;
export interface SmsWorkerDeps {
    process: (data: SmsJobData) => Promise<void>;
}
export declare function startSmsWorker(deps: SmsWorkerDeps): void;
//# sourceMappingURL=smsQueue.d.ts.map