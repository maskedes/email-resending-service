/**
 * E-NVOY — official Node.js / TypeScript SDK.
 *
 * Wraps the `POST /api/emails/send` endpoint. Your API key (prefixed `fms_`)
 * is attached automatically as the `x-api-key` header on every request.
 *
 * @example
 * ```ts
 * import { ENovoy } from '@envoy/sdk';
 *
 * const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY! });
 * const result = await envoy.emails.send({
 *   from: 'hello@yourdomain.com',
 *   to: ['user@example.com'],
 *   subject: 'Welcome!',
 *   html: '<h1>Hello!</h1>',
 * });
 * console.log(result.id);
 * ```
 */

/** Default API host. Overridable per-client via `host`, or globally via the `ENVOY_HOST` env var. */
const DEFAULT_HOST = process.env.ENVOY_HOST || 'http://78.154.103.19:12083';

export interface ENovoyOptions {
  /** Your API key, prefixed with `fms_`. */
  apiKey: string;
  /** API base URL. Defaults to `ENVOY_HOST` or the hosted E-NVOY API. */
  host?: string;
}

export interface SendEmailParams {
  /** Recipient address or list of addresses. */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** HTML body. At least one of `html` / `text` is required. */
  html?: string;
  /** Plain-text body. At least one of `html` / `text` is required. */
  text?: string;
  /** Sender address. Falls back to your default sending domain. */
  from?: string;
  /** Reply-To address. */
  reply_to?: string;
  /** Key/value metadata attached to the message. */
  tags?: Record<string, string>;
  /** Delay delivery by this many milliseconds. */
  scheduleInMs?: number;
}

export interface SendEmailResult {
  /** Queued message id. */
  id: string;
  from: string;
  to: string[];
  subject: string;
  status: string;
  created_at: string;
}

/** Error thrown for any non-2xx API response. */
export class ENovoyError extends Error {
  readonly statusCode: number;
  readonly type?: string;

  constructor(message: string, statusCode: number, type?: string) {
    super(message);
    this.name = 'ENovoyError';
    this.statusCode = statusCode;
    this.type = type;
    Object.setPrototypeOf(this, ENovoyError.prototype);
  }
}

/**
 * The email API surface, reachable as `envoy.emails`.
 */
export class EmailsResource {
  /** @internal */
  constructor(private readonly client: ENovoy) {}

  /** Send a single email. Resolves with the queued message. */
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const body: Record<string, unknown> = {
      to: params.to,
      subject: params.subject,
    };
    if (params.html !== undefined) body.html = params.html;
    if (params.text !== undefined) body.text = params.text;
    if (params.from !== undefined) body.from = params.from;
    if (params.reply_to !== undefined) body.reply_to = params.reply_to;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.scheduleInMs !== undefined) body.scheduleInMs = params.scheduleInMs;

    const data = await this.client.request<Record<string, unknown>>(
      'POST',
      '/api/emails/send',
      body,
    );

    const to = data.to;
    return {
      id: String(data.id ?? ''),
      from: String(data.from ?? ''),
      to: Array.isArray(to) ? (to as string[]) : to ? [String(to)] : [],
      subject: String(data.subject ?? ''),
      status: String(data.status ?? ''),
      created_at: String(data.created_at ?? ''),
    };
  }
}

/**
 * The unified E-NVOY client. One instance per API key.
 */
export class ENovoy {
  readonly apiKey: string;
  readonly host: string;
  readonly emails: EmailsResource;

  constructor(options: ENovoyOptions) {
    if (!options || !options.apiKey) {
      throw new Error('ENovoy: `apiKey` is required.');
    }
    this.apiKey = options.apiKey;
    this.host = (options.host || DEFAULT_HOST).replace(/\/+$/, '');
    this.emails = new EmailsResource(this);
  }

  /** @internal — used by resource classes. */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.host}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const err = data && typeof data === 'object' ? data.error : undefined;
      throw new ENovoyError(
        (err && err.message) || `E-NVOY request failed with status ${res.status}.`,
        res.status,
        err && err.type,
      );
    }

    return data as T;
  }
}

/** Convenience alias. */
export { ENovoy as Envoy };

export default ENovoy;
