import Link from 'next/link';
import Navbar from '../../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhooks — E-NVOY Docs',
  description:
    'Receive real-time HTTP notifications for email and SMS events from E-NVOY. Event list, payload schemas, HMAC signature verification, retries and delivery history.',
  alternates: { canonical: '/documentation/webhooks' },
};

const steps = [
  { n: 1, title: 'Create a webhook', desc: 'Dashboard → Webhooks → Create. Give it a target URL and the events you want.' },
  { n: 2, title: 'Save the signing secret', desc: 'Shown once after creation. Store it server-side — you need it to verify signatures.' },
  { n: 3, title: 'Verify the signature', desc: 'For every request, HMAC-SHA256 the raw body with your secret and compare with X-Webhook-Signature. Reject mismatches.' },
  { n: 4, title: 'Handle retries idempotently', desc: 'Deliveries may arrive more than once (up to 4 attempts). Use payload.id ("<id>:<event>:<ts>") or your own idempotency store.' },
];

const events = [
  ['queued', 'Email accepted by provider and placed in queue'],
  ['sent', 'Provider reported the message as sent'],
  ['delivered', 'Delivery confirmed'],
  ['bounced', 'Permanent or temporary bounce'],
  ['failed', 'Delivery failed before leaving'],
  ['opened', 'Tracked open (tracking pixel)'],
  ['clicked', 'Click on a tracked link'],
  ['complained', 'Recipient reported spam'],
  ['unsubscribed', 'Recipient unsubscribed'],
  ['sms.queued', 'SMS placed in queue'],
  ['sms.sent', 'SMS dispatched via gateway'],
  ['sms.failed', 'SMS failed to send'],
  ['sms.delivered', 'SMS delivery confirmed by gateway'],
];

export default function WebhooksGuidePage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-20">
        <Link
          href="/documentation"
          className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to documentation
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-white">Webhooks</h1>
        <p className="mt-2 leading-relaxed text-slate-400">
          Real-time HTTP notifications for every email and SMS event in E-NVOY. Delivered with
          retries, attempt history, and HMAC-SHA256 signatures — verify before trusting the payload.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Quick start</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4 rounded-2xl border border-canvas-border bg-canvas-raised p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                  {s.n}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{s.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-400">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Verify the signature (Node.js)</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-canvas-border bg-canvas-raised p-4 text-xs leading-relaxed text-slate-300">
{`import crypto from 'crypto';

function verifyWebhookSignature(secret, rawBody, header) {
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(header || '')
  );
}`}
          </pre>
          <p className="mt-3 text-xs text-slate-500">
            HMAC-SHA256 over the exact request body with your signing secret; compared against the
            <code className="px-1 font-mono text-slate-300">X-Webhook-Signature</code> header.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Events</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-canvas-border">
            <table className="w-full text-sm">
              <thead className="bg-canvas-raised text-left text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Fires when</th></tr>
              </thead>
              <tbody className="divide-y divide-canvas-border">
                {events.map(([ev, desc]) => (
                  <tr key={ev}>
                    <td className="px-4 py-3 font-mono text-brand">{ev}</td>
                    <td className="px-4 py-3 text-slate-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Payload shape</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-canvas-border bg-canvas-raised p-4 text-xs leading-relaxed text-slate-300">
{`POST <your-url>
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac_sha256_hex>
X-Webhook-Event: delivered
X-Webhook-Id: <webhook-id>

{
  "id": "<email-id>:delivered:1762506600000",
  "event": "delivered",
  "created_at": "2026-11-07T09:30:00.000Z",
  "data": {
    "email_id": "…", "api_key_id": "…",
    "from": "hello@yourdomain.com",
    "to": "user@example.com",
    "subject": "…", "status": "delivered",
    "details": "250 OK",
    "timestamp": "2026-11-07T09:30:00.000Z"
  }
}`}
          </pre>
          <p className="mt-3 text-xs text-slate-500">
            For SMS events the <code className="px-1 font-mono text-slate-300">data</code> shape is{' '}
            <span className="font-mono">sms_id, api_key_id, to, from, body, parts, status, details, timestamp</span>.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Delivery semantics &amp; history</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
            <li>Response <code className="px-1 font-mono text-slate-200">2xx</code> → recorded as delivered.</li>
            <li>Any other status / timeout / network error → retried with backoff: 30s → 5m → 30m (4 attempts total), then logged as <code className="px-1 font-mono text-slate-200">dead</code> and never retried.</li>
            <li>Every attempt is logged — see Dashboard → Webhooks → <span className="text-slate-200">View history</span> for success rate, per-attempt outcomes, HTTP status codes and timestamps.</li>
            <li>Fire-and-forget from your perspective: webhooks never block or fail email/SMS sending.</li>
            <li>Unsubscribed hooks and deleted/paused hooks are skipped quietly — retries stop.</li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-slate-500">
          Dashboard → Webhooks → <a href="/overview/webhooks" className="text-brand hover:underline">manage subscriptions &amp; history</a>.
        </p>
      </main>
    </div>
  );
}
