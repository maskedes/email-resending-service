import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'E-NVOY guides: quickstart, REST API reference, self-hosted setup, SDKs, deliverability, and domain/API-key/webhook guides.',
  alternates: { canonical: '/documentation' },
};

const sections = [
  {
    title: 'Quickstart',
    desc: 'Send your first email in under five minutes with the REST API or SMTP relay.',
    href: '/api-reference',
  },
  {
    title: 'API Reference',
    desc: 'Every endpoint, parameter, and response for the E-NVOY REST API.',
    href: '/api-reference',
  },
  {
    title: 'Self-Hosted Setup',
    desc: 'Run the full stack on your own infrastructure with Docker Compose.',
    href: '/self-hosted-setup',
  },
  {
    title: 'SDKs',
    desc: 'Official libraries for Node.js, Python, and Go.',
    href: '/api-reference',
  },
  {
    title: 'Deliverability',
    desc: 'SPF, DKIM, and DMARC best practices to keep mail out of spam.',
    href: '/help',
  },
  {
    title: 'Guides',
    desc: 'Domains, API keys, webhooks, and tracking events.',
    href: '/help',
  },
];

export default function DocumentationPage() {
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
              <path d="M5 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5z" />
              <path d="M9 8h7M9 12h7M9 16h4" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Documentation</h1>
            <p className="mt-1 text-slate-400">Everything you need to send, track, and self-host E-NVOY.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="rounded-2xl border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/40"
            >
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
