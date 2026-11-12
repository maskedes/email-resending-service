import { SmsJobData } from '../queue/smsQueue';
/**
 * SMS delivery is done by the Android gateway phone, not by the server.
 * The worker just ensures the message is visible to gateways long enough
 * to be picked up. If no gateway picks it up within the retry window,
 * it will be retried then eventually marked failed with a clear error.
 * Gateways pull via long-poll GET /api/sms/gateway/jobs.
 */
export declare function processSmsJob(data: SmsJobData): Promise<void>;
/** Called when a gateway reports a result; ensures retries stop. */
export declare function onSmsGatewayResult(smsId: string): Promise<void>;
export declare function initSmsWorker(): void;
//# sourceMappingURL=smsWorker.d.ts.map