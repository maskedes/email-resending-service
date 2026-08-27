import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'E-NVOY support channels and response SLAs for Free, Pro, and Enterprise plans, plus GitHub issue tracking.',
  alternates: { canonical: '/support' },
};

const channels = [
  {
    title: 'Email support',
    desc: 'Priority help with sending, deliverability, and your account.',
    contact: 'support@freemailsend.dev',
    href: 'mailto:support@freemailsend.dev',
  },
  {
    title: 'GitHub issues',
    desc: 'Report bugs and request features in the open-source repo.',
    contact: 'Open an issue',
    href: 'https://github.com/maskedes/email-resending-service/issues',
  },
  {
    title: 'Community',
    desc: 'Chat with other self-hosters and the core team.',
    contact: 'Join the discussion',
    href: 'https://github.com/maskedes/email-resending-service/discussions',
  },
];

const sla = [
  { plan: 'Free / Self-hosted', time: 'Best effort', detail: 'Community-supported via GitHub.' },
  { plan: 'Pro', time: '24 hours', detail: 'Email support with a guaranteed response.' },
  { plan: 'Enterprise', time: '4 hours', detail: 'Dedicated channel and SLA-backed support.' },
];

export default function SupportPage() {
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
              <path fill="currentColor" d="m10.155 14.773l-.009-.021a7 7 0 0 1-.402-.123l-.01-.004A7 7 0 0 1 5 8a7 7 0 0 1 13.96-.749c.044.412-.296.749-.71.749s-.745-.338-.8-.748a5.501 5.501 0 1 0-7.279 5.937a2 2 0 0 1 3.829.81a2 2 0 0 1-3.845.774m-1.025 1.23a8.5 8.5 0 0 1-3.136-1.988a2.25 2.25 0 0 0-1.99 2.234v.92c0 .572.178 1.13.51 1.596C6.056 20.929 8.58 22 12 22s5.945-1.072 7.49-3.235a2.75 2.75 0 0 0 .513-1.599v-.918a2.25 2.25 0 0 0-2.248-2.25H15.5a3.5 3.5 0 0 1-6.37 2.004M16 8a4 4 0 0 0-1.431-3.066a4 4 0 1 0-4.811 6.379A3.5 3.5 0 0 1 12 10.5c.853 0 1.635.305 2.243.813A4 4 0 0 0 16 8" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Support</h1>
            <p className="mt-1 text-slate-400">Get help from our engineers and community.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener"
              className="border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/40"
            >
              <div className="text-sm font-semibold text-white">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.desc}</p>
              <div className="mt-3 text-xs font-medium text-brand">{c.contact}</div>
            </a>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-white">Response times</h2>
        <div className="mt-4 space-y-3">
          {sla.map((s) => (
            <div
              key={s.plan}
              className="flex items-center justify-between border border-canvas-border bg-canvas-raised px-5 py-4"
            >
              <div>
                <div className="text-sm font-medium text-white">{s.plan}</div>
                <div className="text-xs text-slate-500">{s.detail}</div>
              </div>
              <div className="text-sm font-semibold text-brand">{s.time}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/help"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Browse the Help Center
          </Link>
          <Link
            href="/contacts"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Other ways to reach us
          </Link>
        </div>
      </main>
    </div>
  );
}
