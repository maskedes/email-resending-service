export interface AttachmentInput {
    /** Display name, e.g. "banner.png". */
    name?: string;
    /** Resend-compatible alias for `name`. */
    filename?: string;
    /** Base64-encoded file content (no data: URI prefix). */
    content: string;
    /** Ignored by validation — the MIME type is detected from magic bytes. */
    content_type?: string;
}
export interface NormalizedAttachment {
    name: string;
    /** Base64 content, decoded-length-tracked. */
    content: string;
    mimeType: string;
    bytes: number;
}
/**
 * Validates an attachments array for inline media on outgoing emails.
 * Images only (magic-byte sniffed, not the declared content_type), capped so a
 * single request can't bloat the emails table or the Brevo payload.
 */
export declare function normalizeAttachments(input: unknown): NormalizedAttachment[] | undefined;
export interface SendEmailInput {
    from?: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    reply_to?: string;
    tags?: Record<string, string>;
    /** Optional base64 image attachments (max 5 files, 2 MB each, 8 MB total). */
    attachments?: AttachmentInput[];
    /** Optional schedule delay in milliseconds (future/scheduled sending). */
    scheduleInMs?: number;
}
export interface EmailRecord {
    id: string;
    api_key_id: string;
    from_email: string;
    from_name: string | null;
    to_email: string;
    subject: string;
    html: string | null;
    text: string | null;
    status: string;
    created_at: string;
    sent_at: string | null;
    delivered_at: string | null;
    error_message: string | null;
    metadata: any;
}
export declare function parseFrom(from?: string): {
    email: string;
    name: string;
};
/**
 * Accepts an email for delivery: records it (status = queued) and enqueues a
 * background job. Actual SMTP delivery happens in the worker.
 */
export declare function sendEmail(apiKeyId: string, input: SendEmailInput): Promise<EmailRecord>;
export declare function addEmailEvent(emailId: string, event: string, details?: string): Promise<void>;
export declare function recordEmailSuccess(emailId: string, messageId: string): Promise<void>;
export declare function recordEmailFailure(emailId: string, errorMessage: string): Promise<void>;
export declare function getEmailById(id: string): Promise<EmailRecord | null>;
export declare function getEmailsByApiKeyId(apiKeyId: string, limit?: number, offset?: number): Promise<EmailRecord[]>;
export declare function getEmailEvents(emailId: string): Promise<any[]>;
export interface EmailStats {
    total: number;
    sent: number;
    failed: number;
    queued: number;
}
export declare function getEmailStats(apiKeyId: string): Promise<EmailStats>;
//# sourceMappingURL=emailService.d.ts.map