import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CEO Bio & Company Values',
  description: 'Meet the founder behind E-NVOY and the open-by-default, deliverability-first, developer-focused values driving the project.',
  alternates: { canonical: '/ceo-bio' },
};

const values = [
  {
    title: 'Open by default',
    desc: 'Source available, self-hostable, and free of vendor lock-in.',
  },
  {
    title: 'Deliverability first',
    desc: 'We optimize for the inbox, not just for sending.',
  },
  {
    title: 'Built with developers',
    desc: 'APIs and docs that respect your time and your stack.',
  },
];

export default function CeoBioPage() {
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
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M0 0h20v20H0z" fill="none" />
              <path fill="currentColor" d="M17 16.9v-2.5c0-.7-.1-1.4-.5-2.1s-.9-1.3-1.6-1.7c-.7-.5-2.2-.6-2.9-.6l-1.6 1.7l.6 1.3v3l-1 1.1L9 16v-3l.7-1.3L8 10c-.8 0-2.3.1-3 .6c-.7.4-1.1 1-1.5 1.7S3 13.6 3 14.4v2.5S5.6 18 10 18s7-1.1 7-1.1M10 2.1c-1.9 0-3 1.8-2.7 3.8S8.6 9.3 10 9.3s2.4-1.4 2.7-3.4c.3-2.1-.8-3.8-2.7-3.8" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">CEO's Bio</h1>
            <p className="mt-1 text-slate-400">Meet the founder behind E-NVOY.</p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <p>
            Mask Edes is the founder and CEO of E-NVOY. After years of wrangling SMTP servers,
            fighting spam filters, and watching small teams overpay for something as basic as email,
            they set out to make reliable delivery free and open to everyone.
          </p>
          <p>
            Today E-NVOY powers transactional and marketing email for developers and businesses who
            want full control over their sending infrastructure — without the lock-in.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-white">Our mission</h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Email delivery should be a solved problem, not a paid one. We believe the infrastructure
          behind every signup email, password reset, and receipt should be open source, self-hostable,
          and free to run.
        </p>

        <div className="mt-8 space-y-3">
          {values.map((v) => (
            <div key={v.title} className="border border-canvas-border bg-canvas-raised p-5">
              <div className="text-sm font-semibold text-white">{v.title}</div>
              <p className="mt-1 text-sm text-slate-400">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
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
