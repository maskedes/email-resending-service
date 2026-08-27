import Link from 'next/link';
import Navbar from '../components/Navbar';
import { ApiKeyIcon } from '../components/FeatureIcons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Key Auth',
  description: 'HMAC-signed, scoped API keys with full CRUD from the dashboard. Rotate and revoke instantly with zero downtime and per-key rate limits.',
  alternates: { canonical: '/api-key-auth' },
};

const highlights = [
  'Scoped keys — send-only or full admin',
  'Rotate and revoke instantly with zero downtime',
  'Per-key usage attribution and rate limits',
];

export default function ApiKeyAuthPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <ApiKeyIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">API Key Auth</h1>
            <p className="mt-1 text-slate-400">Secure, scoped credentials for sending.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Create and rotate API keys to authenticate REST requests and SMTP logins. Keys are
          HMAC-signed and support full CRUD so you can roll them over safely.
        </p>

        <div className="mt-8 space-y-3">
          {highlights.map((h) => (
            <div key={h} className="flex items-start gap-3 border border-canvas-border bg-canvas-raised px-5 py-4">
              <span className="mt-1 text-brand">✓</span>
              <span className="text-sm text-slate-300">{h}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/rest-api" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">REST API</Link>
          <Link href="/smtp-relay" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">SMTP Relay</Link>
        </div>
      </main>
    </div>
  );
}
