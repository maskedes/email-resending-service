export interface WebhookDeliveryJobData {
    webhookId: string;
    /** Event name, e.g. "delivered" or "sms.sent". */
    event: string;
    /** Raw JSON body string as stored at first attempt. */
    rawBody: string;
    /** Attempt number this job is responsible for (2 = first retry). */
    attempt: number;
}
/** Enqueue a retry attempt with a delay in milliseconds. */
export declare function enqueueWebhookRetry(data: WebhookDeliveryJobData, delayMs: number): Promise<void>;
export interface WebhookWorkerDeps {
    process: (data: WebhookDeliveryJobData) => Promise<void>;
}
export declare function startWebhookWorker(deps: WebhookWorkerDeps): void;
//# sourceMappingURL=webhookQueue.d.ts.map