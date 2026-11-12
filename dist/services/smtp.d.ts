import nodemailer from 'nodemailer';
export interface MailMessage {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    headers?: Record<string, string>;
}
export declare function sendViaSmtp(message: MailMessage): Promise<nodemailer.SentMessageInfo>;
//# sourceMappingURL=smtp.d.ts.map