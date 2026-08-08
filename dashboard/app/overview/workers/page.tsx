'use client';

import { useState } from 'react';

interface WorkerInfo {
  name: string;
  deployed: boolean;
  url: string;
  modified: string;
}

export default function WorkersPage() {
  const [deployed, setDeployed] = useState<boolean | null>(null);
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Worker deploy scripts from wrangler.toml
  const workerConfig = {
    name: 'en-voy-email-api',
    description:
      'Edge proxy for the email sending REST API with per-IP rate limiting, CORS, and API key forwarding.',
    deployCommand: 'npx wrangler deploy',
    devCommand: 'npx wrangler dev',
  };

  async function checkStatus() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/workers/status');
      const data = await res.json();
      if (data.worker) {
        setWorker(data.worker);
        setDeployed(true);
      } else {
        setDeployed(false);
      }
    } catch {
      setError('Could not reach the server to check worker status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Workers</h1>
        <p className="mt-1 text-slate-400">
          Cloudflare edge Workers that run your email API closer to users.
        </p>
      </div>

      {/* Status / Info */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Email API Edge Worker</h2>
            <p className="mt-1 text-sm text-slate-400">{workerConfig.description}</p>
          </div>
          <button
            onClick={checkStatus}
            disabled={loading}
            className="bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check Status'}
          </button>
        </div>

        {error && (
          <div className="mt-4 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {deployed !== null && (
          <div
            className={`mt-4 border p-4 text-sm ${
              deployed
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {deployed ? (
              <>
                <p className="font-medium">Worker deployed ✨</p>
                <p className="mt-1 text-emerald-300/80">
                  Name: {worker?.name} • Last modified: {worker?.modified}
                </p>
                <p className="mt-1">
                  Endpoint: <code className="font-mono text-emerald-200">{worker?.url}</code>
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Worker not deployed yet</p>
                <p className="mt-1">
                  Run the command below from <code className="font-mono">workers/email-api-worker</code>.
                </p>
              </>
            )}
          </div>
        )}

        {message && (
          <div className="mt-4 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {/* Deploy steps */}
        <div className="mt-6 space-y-4">
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">1. Install & configure</p>
            <code className="text-sm text-slate-200 font-mono">
              cd workers/email-api-worker && npm install
            </code>
            <p className="mt-2 text-xs text-slate-500">
              Then paste your Cloudflare API token into <code className="font-mono">.env</code>.
            </p>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">2. Local dev</p>
            <code className="text-sm text-slate-200 font-mono">{workerConfig.devCommand}</code>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">3. Deploy to Cloudflare</p>
            <code className="text-sm text-slate-200 font-mono">{workerConfig.deployCommand}</code>
          </div>
        </div>
      </section>

      {/* What the worker does */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">What this Worker does</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="font-medium text-white">⚡ Edge rate limiting</p>
            <p className="mt-1 text-sm text-slate-400">
              Sliding-window limits per IP before traffic reaches your origin, so abuse is stopped at the edge.
            </p>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="font-medium text-white">🔀 Proxies POST /api/emails/send</p>
            <p className="mt-1 text-sm text-slate-400">
              Forwards requests to your Express API, passing through the <code className="font-mono">x-api-key</code> header for auth.
            </p>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="font-medium text-white">🔐 Optional shared secret</p>
            <p className="mt-1 text-sm text-slate-400">
              Sends <code className="font-mono">x-edge-proxy-secret</code> so your backend only accepts proxied traffic.
            </p>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="font-medium text-white">🌍 CORS + preflight</p>
            <p className="mt-1 text-sm text-slate-400">
              Handles cross-origin requests and OPTIONS preflight automatically from the edge.
            </p>
          </div>
        </div>
      </section>

      {/* Code location */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Project Files</h2>
        <div className="space-y-2 text-sm">
          <div className="border border-canvas-border bg-canvas p-3 font-mono text-slate-300">
            workers/email-api-worker/wrangler.toml
          </div>
          <div className="border border-canvas-border bg-canvas p-3 font-mono text-slate-300">
            workers/email-api-worker/src/index.ts
          </div>
          <div className="border border-canvas-border bg-canvas p-3 font-mono text-slate-300">
            workers/email-api-worker/package.json
          </div>
        </div>
      </section>
    </div>
  );
}