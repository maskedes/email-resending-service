import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Full E-NVOY REST API reference: every endpoint, parameter, and response for sending, listing, and tracking emails.',
  alternates: { canonical: '/api-reference' },
};

const endpoints = [
  { method: 'POST', path: '/v1/emails/send', desc: 'Send a transactional or marketing email.' },
  { method: 'GET', path: '/v1/emails/{id}', desc: 'Fetch the status and events for a sent email.' },
  { method: 'GET', path: '/v1/emails', desc: 'List recent emails with filtering and pagination.' },
  { method: 'GET', path: '/v1/stats', desc: 'Aggregated delivery, open, and bounce stats.' },
];

const sendExample = `curl -X POST https://api.freemailsend.dev/v1/emails/send -H "x-api-key: fms_abc123..." -H "Content-Type: application/json" -d '{"from":"hello@yourdomain.com","to":["user@example.com"],"subject":"Welcome aboard!","html":"<h1>Hello!</h1>"}'`;

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-20">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">API Reference</h1>
            <p className="mt-1 text-slate-400">The E-NVOY REST API — authenticate with your API key.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white">Send an email</h2>
        <pre className="mt-3 overflow-x-auto border border-canvas-border bg-canvas-raised p-5 text-sm text-slate-300"><code>{sendExample}</code></pre>

        <h2 className="mt-10 text-xl font-semibold text-white">Endpoints</h2>
        <div className="mt-4 space-y-3">
          {endpoints.map((e) => (
            <div key={e.path} className="flex items-start gap-4 border border-canvas-border bg-canvas-raised px-5 py-4">
              <span className="mt-0.5 flex-none rounded bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">{e.method}</span>
              <div>
                <div className="font-mono text-sm text-white">{e.path}</div>
                <div className="mt-1 text-sm text-slate-400">{e.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/documentation" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            All documentation
          </Link>
          <Link href="/self-hosted-setup" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Self-hosted setup
          </Link>
        </div>
      </main>
    </div>
  );
}
