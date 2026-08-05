import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

let transporter: Transporter | null = null;

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

/** Lazily creates the shared SMTP transporter from configuration. */
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth.user ? config.smtp.auth : undefined,
      tls: {
        rejectUnauthorized: false, // Accept self-signed certs (dev/relay servers)
      },
    });
  }
  return transporter;
}

export async function sendViaSmtp(message: MailMessage): Promise<nodemailer.SentMessageInfo> {
  return getTransporter().sendMail(message);
}