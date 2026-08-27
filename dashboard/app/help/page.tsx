import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'E-NVOY help center: sending your first email, fixing spam placement, rotating API keys, and self-hosting questions answered.',
  alternates: { canonical: '/help' },
};

const faqs = [
  {
    q: 'How do I send my first email?',
    a: 'Grab your API key from the dashboard, then POST to the REST API or point your app at our SMTP relay. A working curl example lives on the home page.',
  },
  {
    q: 'Why are my emails landing in spam?',
    a: 'Almost always a DNS issue. Verify your domain has SPF, DKIM, and DMARC records configured, and warm up new sending domains gradually.',
  },
  {
    q: 'How do I rotate my API key?',
    a: 'Open Settings then API Keys, create a new key, roll it out, then revoke the old one. Active sends keep working on the new key immediately.',
  },
  {
    q: 'Is there really a free tier?',
    a: 'Yes — self-hosting E-NVOY is free forever under the open-source license. Our managed cloud also has a generous free quota.',
  },
  {
    q: 'Can I run this on my own server?',
    a: 'Absolutely. See Developers then Self-Hosted Setup for a Docker Compose stack you can launch in minutes.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10s10-4.486 10-10S17.514 2 12 2m1 16h-2v-2h2zm.976-4.885c-.196.158-.385.309-.535.459c-.408.407-.44.777-.441.793v.133h-2v-.167c0-.118.029-1.177 1.026-2.174c.195-.195.437-.393.691-.599c.734-.595 1.216-1.029 1.216-1.627a1.934 1.934 0 0 0-3.867.001h-2C8.066 7.765 9.831 6 12 6s3.934 1.765 3.934 3.934c0 1.597-1.179 2.55-1.958 3.181" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Help Center</h1>
            <p className="mt-1 text-slate-400">Guides, FAQs and troubleshooting for E-NVOY.</p>
          </div>
        </div>

        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.q} className="border border-canvas-border bg-canvas-raised p-5">
              <h2 className="text-sm font-semibold text-white">{f.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/support"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Contact support
          </Link>
          <Link
            href="/contacts"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Get in touch
          </Link>
        </div>
      </main>
    </div>
  );
}
