import Link from 'next/link';
import Navbar from '../components/Navbar';
import { DeliveryTrackingIcon } from '../components/FeatureIcons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Tracking',
  description: 'Real-time insight into every message: accepted, delivered, opened, and clicked, with automatic bounce and complaint handling.',
  alternates: { canonical: '/delivery-tracking' },
};

const highlights = [
  'Live event stream: accepted, delivered, opened, clicked',
  'Automatic bounce and complaint handling',
  'Per-message history and retry visibility',
];

export default function DeliveryTrackingPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mb-10 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-border bg-canvas-raised text-2xl text-brand">
            <DeliveryTrackingIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Delivery Tracking</h1>
            <p className="mt-1 text-slate-400">Real-time insight into every message.</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Follow each email through accepted, delivered, opened, clicked, bounced, and complained
          states. Subscribe to webhooks or poll the stats endpoint for a full picture.
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
          <Link href="/api-reference" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">Stats endpoint</Link>
          <Link href="/bullmq-queue" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">BullMQ Queue</Link>
        </div>
      </main>
    </div>
  );
}
