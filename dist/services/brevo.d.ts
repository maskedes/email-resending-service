export interface MailMessage {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    /** Brevo tags for reporting/filtering in the Brevo dashboard. */
    tags?: string[];
    headers?: Record<string, string>;
    /** Base64 attachments (Brevo field `attachments: [{name, content}]`). */
    attachments?: Array<{
        name: string;
        content: string;
    }>;
}
export declare function sendViaBrevo(message: MailMessage): Promise<{
    messageId: string;
}>;
//# sourceMappingURL=brevo.d.ts.map