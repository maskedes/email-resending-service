import Link from 'next/link';

export default function Home() {
  return (
    <div className="prose">
      <h1>E-NVOY Documentation</h1>
      <p className="text-lg text-zinc-300">
        The open source email sending platform. Send transactional emails via REST API, SMTP, or CLI — self-hosted and free forever.
      </p>

      <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/quickstart" className="group rounded-lg border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/50">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand text-xl">bolt</span>
            <span className="font-semibold text-white">Quickstart</span>
          </div>
          <p className="text-sm text-zinc-400">Send your first email in under 2 minutes.</p>
        </Link>
        <Link href="/cli" className="group rounded-lg border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/50">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand text-xl">terminal</span>
            <span className="font-semibold text-white">CLI</span>
          </div>
          <p className="text-sm text-zinc-400">Send emails, manage domains — all from the terminal.</p>
        </Link>
        <Link href="/api/send" className="group rounded-lg border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/50">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand text-xl">api</span>
            <span className="font-semibold text-white">API Reference</span>
          </div>
          <p className="text-sm text-zinc-400">Complete REST API docs with examples in every language.</p>
        </Link>
        <Link href="/authentication" className="group rounded-lg border border-canvas-border bg-canvas-raised p-5 transition hover:border-brand/50">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand text-xl">key</span>
            <span className="font-semibold text-white">Authentication</span>
          </div>
          <p className="text-sm text-zinc-400">Set up API keys and secure your requests.</p>
        </Link>
      </div>

      <hr />

      <h2>What is E-NVOY?</h2>
      <p>
        E-NVOY is a self-hosted, open source email sending platform. It provides a clean REST API,
        SMTP relay, and a full-featured CLI — everything you need to send transactional and marketing emails
        without paying for a third-party service.
      </p>

      <h3>Features</h3>
      <ul>
        <li><strong>REST API</strong> — Send emails with a simple JSON payload</li>
        <li><strong>SMTP Relay</strong> — Connect via Postfix or any SMTP server</li>
        <li><strong>CLI Tool</strong> — Send emails, manage domains, check logs from the terminal</li>
        <li><strong>Real-time Tracking</strong> — Delivery status, queue monitoring, and event logs</li>
        <li><strong>Domain Verification</strong> — DKIM, SPF, and DMARC validation with DNS checks</li>
        <li><strong>Dashboard</strong> — Web UI for managing API keys, domains, and emails</li>
        <li><strong>Self-Hosted</strong> — Docker Compose deployment, your data never leaves your server</li>
      </ul>

      <h3>Architecture</h3>
      <pre><code>{`┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Caddy   │────▶│ Backend  │
│ (CLI/API)│     │ (Proxy)  │     │ (Express)│
└──────────┘     └──────────┘     └─────┬────┘
                                        │
                              ┌─────────┼─────────┐
                              │         │         │
                         ┌────▼───┐ ┌───▼───┐ ┌───▼───┐
                         │ Postgres│ │ Redis │ │ Postfix│
                         └────────┘ └───────┘ └───────┘`}</code></pre>
    </div>
  );
}
