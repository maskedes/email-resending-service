'use client';

import { useState, useEffect, useCallback } from 'react';

const EVENT_OPTIONS = [
  { value: 'sent', label: 'Email accepted by provider' },
  { value: 'delivered', label: 'On email delivered' },
  { value: 'failed', label: 'On email failed' },
  { value: 'bounced', label: 'On bounce' },
  { value: 'opened', label: 'On opened' },
  { value: 'clicked', label: 'On link clicked' },
  { value: 'complained', label: 'On spam complaint' },
  { value: 'unsubscribed', label: 'On unsubscribe' },
] as const;

interface Automation {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  secret?: string;
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['delivered', 'failed']);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/webhooks');
      if (!res.ok) throw new Error('load failed');
      const body = await res.json();
      setAutomations(body.data || []);
    } catch {
      setError('Could not load your automations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAutomation() {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), events: selectedEvents }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message || 'Creating the automation failed.');
        return;
      }
      const created = body.webhook as Automation;
      setAutomations((prev) => [created, ...prev]);
      setMessage(
        created.secret
          ? `Automation created. Sign-off secret (shown once): ${created.secret}`
          : 'Automation created.'
      );
      setName('');
      setUrl('');
      setSelectedEvents(['delivered', 'failed']);
    } catch {
      setError('Creating the automation failed.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleAutomation(id: string, current: boolean) {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a)));
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error('toggle failed');
    } catch {
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: current } : a)));
      setError('Could not update the automation.');
    }
  }

  async function removeAutomation(id: string) {
    const previous = automations;
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    } catch {
      setAutomations(previous);
      setError('Could not delete the automation.');
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Automation</h1>
        <p className="mt-1 text-slate-400">
          Fire HTTP requests automatically when email events happen. Deliveries are signed
          (HMAC-SHA256) so your endpoint can verify E-NVOY was the sender.
        </p>
      </div>

      {/* Create Automation */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Create Automation</h2>
        <p className="mb-4 text-sm text-slate-400">
          When any of the selected events occur, E-NVOY POSTs a JSON payload to your URL.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Notify Slack on bounces"
              className="w-full rounded-xl border border-canvas-border bg-canvas px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Target URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hooks/en-voy"
              className="w-full rounded-xl border border-canvas-border bg-canvas px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm text-slate-400">Triggers (events)</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((opt) => {
              const active = selectedEvents.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEvent(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? 'border-brand/60 bg-brand/10 text-brand'
                      : 'border-canvas-border bg-canvas text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={createAutomation}
          disabled={!name.trim() || !url.trim() || selectedEvents.length === 0 || creating}
          className="mt-5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-black hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </section>

      {(error || message) && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Automations List */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Your Automations</h2>

        {loading ? (
          <p className="py-8 text-center text-slate-500">Loading…</p>
        ) : automations.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            No automations yet. Create one above — it fires automatically on the events you pick.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last fired</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {automations.map((a) => (
                  <tr key={a.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                    <td className="px-4 py-3">
                      <p className="text-white">{a.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{a.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.events.map((ev) => (
                          <span
                            key={ev}
                            className="border border-canvas-border bg-canvas px-2 py-0.5 text-xs text-slate-300"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAutomation(a.id, a.is_active)}
                        className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                          a.is_active
                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/25'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {a.last_triggered_at
                        ? new Date(a.last_triggered_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeAutomation(a.id)}
                        className="text-xs text-slate-500 transition-colors hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payload reference */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">What your endpoint receives</h2>
        <pre className="overflow-x-auto border border-canvas-border bg-canvas p-4 text-xs leading-relaxed text-slate-300">
{`POST <your-url>
X-Webhook-Signature: sha256=<hmac_hex_of_body>

{
  "event": "delivered",
  "email": {
    "id": "…", "subject": "…", "to": "user@example.com",
    "from": "hello@your-domain.com", "status": "delivered"
  },
  "details": "250 OK",
  "timestamp": "2026-10-24T18:00:00.000Z"
}`}
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          Verify the signature with your signing secret: HMAC-SHA256 over the raw body. Failed
          deliveries never block email sending — automation is fire-and-forget.
        </p>
      </section>
    </div>
  );
}
