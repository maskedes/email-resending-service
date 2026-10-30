import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Self-Hosted Setup',
  description: 'Deploy the full E-NVOY stack in minutes with Docker Compose: clone the repo, configure env, start the stack, and point your DNS.',
  alternates: { canonical: '/self-hosted-setup' },
};

const steps = [
  { n: 1, title: 'Clone the repo', desc: 'Get the Docker Compose stack from GitHub.' },
  { n: 2, title: 'Configure environment', desc: 'Copy .env.example and set your keys, domain, and database URL.' },
  { n: 3, title: 'Start the stack', desc: 'Run docker compose up -d to launch the API, worker, and Postgres.' },
  { n: 4, title: 'Point your DNS', desc: 'Add the SPF, DKIM, and DMARC records shown in the dashboard.' },
];

const composeExample = `git clone https://github.com/maskedes/email-resending-service envoy
cd envoy/deploy
cp .env.example .env   # edit with your values
docker compose up -d`;

export default function SelfHostedPage() {
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
              <rect x="3" y="4" width="18" height="6" rx="1" />
              <rect x="3" y="14" width="18" height="6" rx="1" />
              <circle cx="7" cy="7" r="1" fill="currentColor" />
              <circle cx="7" cy="17" r="1" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Self-Hosted Setup</h1>
            <p className="mt-1 text-slate-400">Run the full E-NVOY stack on your own infrastructure.</p>
          </div>
        </div>

        <pre className="overflow-x-auto rounded-2xl border border-canvas-border bg-canvas-raised p-5 text-sm text-slate-300"><code>{composeExample}</code></pre>

        <div className="mt-8 space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="flex items-start gap-4 rounded-2xl border border-canvas-border bg-canvas-raised px-5 py-4">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">{s.n}</span>
              <div>
                <div className="text-sm font-semibold text-white">{s.title}</div>
                <p className="mt-1 text-sm text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/documentation" className="rounded-2xl border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Back to documentation
          </Link>
        </div>
      </main>
    </div>
  );
}
