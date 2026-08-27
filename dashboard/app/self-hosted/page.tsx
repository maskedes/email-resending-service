import Link from 'next/link';
import Navbar from '../components/Navbar';
import { SelfHostedIcon } from '../components/FeatureIcons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Self-Hosted',
  description: 'Run E-NVOY on your own infrastructure. Full source available, your data stays with you, and there are no per-email fees.',
  alternates: { canonical: '/self-hosted' },
};

const highlights = [
  'Full source available under the open-source license',
  'Your data and your deliverability stay with you',
  'No per-email fees — run it as much as you like',
];

export default function SelfHostedFeaturePage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <SelfHostedIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Self-Hosted</h1>
            <p className="mt-1 text-slate-400">Own your email infrastructure.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Run the entire E-NVOY stack on your own servers with Docker Compose. Keep full control of
          sending, storage, and deliverability.
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
          <Link href="/self-hosted-setup" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">Setup guide</Link>
          <Link href="/bullmq-queue" className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">BullMQ Queue</Link>
        </div>
      </main>
    </div>
  );
}
