import Link from 'next/link';
import Navbar from '../components/Navbar';
import { SmtpIcon } from '../components/FeatureIcons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SMTP Relay',
  description: 'Send from any app that already speaks SMTP. Standard SMTP and STARTTLS, per-account credentials, drop-in compatible with WordPress and Laravel.',
  alternates: { canonical: '/smtp-relay' },
};

const highlights = [
  'Standard SMTP and STARTTLS support',
  'Per-account credentials, isolated per domain',
  'Drop-in compatible with WordPress, Laravel, and more',
];

export default function SmtpRelayPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <SmtpIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">SMTP Relay</h1>
            <p className="mt-1 text-slate-400">Send from any app that already speaks SMTP.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Point your existing mail library or SMTP-capable server at the E-NVOY relay — no code
          changes required. Generate credentials in the dashboard and start sending.
        </p>

        <div className="mt-8 space-y-3">
          {highlights.map((h) => (
            <div key={h} className="flex items-start gap-3 rounded-2xl border border-canvas-border bg-canvas-raised px-5 py-4">
              <span className="mt-1 text-brand">✓</span>
              <span className="text-sm text-slate-300">{h}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/api-key-auth" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">Get SMTP credentials</Link>
          <Link href="/rest-api" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">REST API</Link>
        </div>
      </main>
    </div>
  );
}
