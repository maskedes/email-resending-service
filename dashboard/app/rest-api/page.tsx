import Link from 'next/link';
import Navbar from '../components/Navbar';
import { RestApiIcon } from '../components/FeatureIcons';
import { API_URL } from '@/lib/api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'REST API',
  description: 'Send email with a single authenticated POST. Idempotent requests with automatic retries and webhooks for delivery events.',
  alternates: { canonical: '/rest-api' },
};

const highlights = [
  'Send emails with a single authenticated POST',
  'Idempotent requests with automatic retries',
  'Webhooks for delivery, open, and bounce events',
];

const example = `curl -X POST ${API_URL}/api/emails/send \\
  -H "x-api-key: fms_abc123..." \\
  -d '{"from":"you@domain.com","to":["user@example.com"],"subject":"Hi"}'`;

export default function RestApiPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <RestApiIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">REST API</h1>
            <p className="mt-1 text-slate-400">Send and manage email over a clean HTTP API.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          The E-NVOY REST API lets you send transactional and marketing email, fetch delivery
          status, and pull aggregated stats with simple authenticated requests.
        </p>

        <pre className="mt-6 overflow-x-auto rounded-2xl border border-canvas-border bg-canvas-raised p-5 text-sm text-slate-300"><code>{example}</code></pre>

        <div className="mt-8 space-y-3">
          {highlights.map((h) => (
            <div key={h} className="flex items-start gap-3 rounded-2xl border border-canvas-border bg-canvas-raised px-5 py-4">
              <span className="mt-1 text-brand">✓</span>
              <span className="text-sm text-slate-300">{h}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/api-reference" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">API Reference</Link>
          <Link href="/api-key-auth" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">API Key Auth</Link>
        </div>
      </main>
    </div>
  );
}
