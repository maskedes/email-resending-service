export interface SendSmsInput {
    to: string;
    body: string;
    from?: string;
    tags?: Record<string, string>;
    /** Optional schedule delay in milliseconds. */
    scheduleInMs?: number;
    /** Optional preferred gateway ID. */
    gatewayId?: string;
}
export interface SmsRecord {
    id: string;
    api_key_id: string;
    gateway_id: string | null;
    to_phone: string;
    from_phone: string | null;
    body: string;
    status: string;
    parts: number;
    error_message: string | null;
    metadata: unknown;
    scheduled_at: string | null;
    created_at: string;
    sent_at: string | null;
    delivered_at: string | null;
}
export declare function isValidPhone(phone: string): boolean;
export declare function normalizePhone(phone: string): string;
/** Rough SMS segmentation: GSM 7-bit 160 vs UCS-2 70. Returns part count. */
export declare function smsParts(body: string): number;
export declare function sendSms(apiKeyId: string, input: SendSmsInput): Promise<SmsRecord>;
export declare function addSmsEvent(smsId: string, event: string, details?: string): Promise<void>;
export declare function recordSmsSent(smsId: string, info?: string): Promise<void>;
export declare function recordSmsFailed(smsId: string, err: string): Promise<void>;
export declare function recordSmsDelivered(smsId: string): Promise<void>;
export declare function getSmsById(id: string): Promise<SmsRecord | null>;
export declare function getSmsByApiKeyId(apiKeyId: string, limit?: number, offset?: number): Promise<SmsRecord[]>;
export declare function getSmsEvents(smsId: string): Promise<unknown[]>;
export declare function getSmsStats(apiKeyId: string): Promise<{
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
}>;
//# sourceMappingURL=smsService.d.ts.map