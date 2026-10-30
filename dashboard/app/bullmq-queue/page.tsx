import Link from 'next/link';
import Navbar from '../components/Navbar';
import { BullMqIcon } from '../components/FeatureIcons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BullMQ Queue',
  description: 'Resilient, Redis-backed job processing for email: automatic retries with exponential backoff and horizontally scalable worker pools.',
  alternates: { canonical: '/bullmq-queue' },
};

const highlights = [
  'Automatic retries with exponential backoff',
  'Rate-limit aware scheduling and backpressure',
  'Horizontally scalable worker pools',
];

export default function BullMqQueuePage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to a previous page
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <BullMqIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">BullMQ Queue</h1>
            <p className="mt-1 text-slate-400">Resilient, Redis-backed job processing.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Outbound sends are queued with BullMQ for retries, backpressure, and at-least-once
          delivery — so a downstream hiccup never loses an email.
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
          <Link href="/self-hosted" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">Self-Hosted</Link>
          <Link href="/delivery-tracking" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">Delivery Tracking</Link>
        </div>
      </main>
    </div>
  );
}
