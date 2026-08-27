import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Reach the E-NVOY team by hotline, email, GitHub, or dedicated support desk for onboarding and partnerships.',
  alternates: { canonical: '/contacts' },
};

const channels = [
  {
    title: 'Hotline',
    value: '+256 756 924 177',
    href: 'tel:+256756924177',
    note: 'Call us for urgent help during business hours.',
  },
  {
    title: 'Email',
    value: 'hello@freemailsend.dev',
    href: 'mailto:hello@freemailsend.dev',
    note: 'General questions, onboarding, and partnerships.',
  },
  {
    title: 'GitHub',
    value: 'github.com/maskedes/email-resending-service',
    href: 'https://github.com/maskedes/email-resending-service',
    note: 'Bug reports, feature requests, and source code.',
  },
  {
    title: 'Support desk',
    value: 'Dedicated technical help',
    href: '/support',
    note: 'Account issues, deliverability, and sending errors.',
  },
];

export default function ContactsPage() {
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
              <path fill="currentColor" d="M19 2H5c-.55 0-1 .45-1 1v4H2v2h2v2H2v2h2v2H2v2h2v4c0 .55.45 1 1 1h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-6.5 5C13.93 7 15 8.07 15 9.5S13.93 12 12.5 12S10 10.93 10 9.5S11.07 7 12.5 7M17 17H8v-1c0-1.66 1.34-3 3-3h3c1.66 0 3 1.34 3 3z" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Contact Us</h1>
            <p className="mt-1 text-slate-400">We usually reply within one business day.</p>
          </div>
        </div>

        <div className="space-y-3">
          {channels.map((c) =>
            c.href.startsWith('/') ? (
              <Link
                key={c.title}
                href={c.href}
                className="block border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/40"
              >
                <div className="text-xs uppercase tracking-wider text-slate-500">{c.title}</div>
                <div className="mt-1 text-sm font-medium text-white">{c.value}</div>
                <p className="mt-2 text-sm text-slate-400">{c.note}</p>
              </Link>
            ) : (
              <a
                key={c.title}
                href={c.href}
                target="_blank"
                rel="noopener"
                className="block border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/40"
              >
                <div className="text-xs uppercase tracking-wider text-slate-500">{c.title}</div>
                <div className="mt-1 text-sm font-medium text-white">{c.value}</div>
                <p className="mt-2 text-sm text-slate-400">{c.note}</p>
              </a>
            )
          )}
        </div>
      </main>
    </div>
  );
}
