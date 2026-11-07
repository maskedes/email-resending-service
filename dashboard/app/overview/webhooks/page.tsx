'use client';

import { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  /** Returned once on creation — the HMAC signing secret. */
  secret?: string;
}

interface DeliveryRow {
  id: string;
  event: string;
  attempt: number;
  outcome: 'delivered' | 'pending_retry' | 'dead';
  http_status: number | null;
  error: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface DeliverySummary {
  attempts: number;
  delivered: number;
  failed: number;
  pending_retry: number;
  success_rate: number;
  last: DeliveryRow | null;
}

interface DeliveriesResponse {
  data: DeliveryRow[];
  summary: DeliverySummary;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['sent', 'delivered', 'bounced']);
  const [newWebhook, setNewWebhook] = useState<Webhook | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deliveries, setDeliveries] = useState<Record<string, DeliveriesResponse | null>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const ALL_EVENTS = ['sent', 'delivered', 'bounced', 'opened', 'clicked', 'complained', 'unsubscribed', 'queued', 'sms.queued', 'sms.sent', 'sms.failed', 'sms.delivered'];

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (data.data) setWebhooks(data.data);
    } catch {
      // Silently fail
    }
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  function toggleEvent(event: string) {
    setEvents(prev => prev.includes(event)
      ? prev.filter(e => e !== event)
      : [...prev, event]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setNewWebhook(null);

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events }),
      });
      const data = await res.json();

      if (data.webhook) {
        setNewWebhook(data.webhook);
        setName('');
        setUrl('');
        setEvents(['sent', 'delivered', 'bounced']);
        await fetchWebhooks();
      } else {
        setError(data.error?.message || 'Failed to create webhook.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setCreating(false);
    }
  }

  async function copyValue(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      await fetchWebhooks();
    } catch {
      // Error handling
    }
  }

  async function toggleHistory(id: string) {
    if (deliveries[id]) {
      setDeliveries((prev) => ({ ...prev, [id]: null }));
      return;
    }
    setHistoryLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries`);
      const body = await res.json();
      setDeliveries((prev) => ({ ...prev, [id]: body.data?.length !== undefined ? body : { data: [], summary: { attempts: 0, delivered: 0, failed: 0, pending_retry: 0, success_rate: 0, last: null } } }));
    } catch {
      setDeliveries((prev) => ({ ...prev, [id]: null }));
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  function outcomeBadge(outcome: DeliveryRow['outcome']): string {
    if (outcome === 'delivered') return 'bg-emerald-500/20 text-emerald-400';
    if (outcome === 'dead') return 'bg-red-500/20 text-red-400';
    return 'bg-amber-500/20 text-amber-400';
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    try {
      await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      await fetchWebhooks();
    } catch {
      // Error handling
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Webhooks</h1>
        <p className="mt-1 text-slate-400">Receive real-time HTTP notifications when email events occur.</p>
      </div>

      {/* Create Webhook Form */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Create Webhook</h2>

        {newWebhook && newWebhook.secret && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300 mb-2">Webhook created! Save your signing secret:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded bg-canvas px-3 py-2 text-sm text-emerald-100 font-mono break-all">
                {newWebhook.secret}
              </code>
              <button
                onClick={() => copyValue(newWebhook.secret!)}
                className="rounded-xl bg-brand/15 px-4 py-2 text-sm font-medium text-white hover:bg-brand/30 transition-colors"
              >
                Copy Secret
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Verify the signature using the <code className="font-mono">X-Webhook-Signature</code> header (HMAC-SHA256 of the raw body with this secret). It won't be shown again.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App Webhook"
                required
                disabled={creating}
                className="w-full rounded-xl border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.com/webhooks/emails"
                required
                disabled={creating}
                className="w-full rounded-xl border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Events to subscribe to</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  disabled={creating}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    events.includes(event)
                      ? 'bg-brand/20 text-white border border-brand/30'
                      : 'bg-canvas-border text-slate-400 hover:bg-canvas-border hover:text-white'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl md:w-auto bg-brand px-6 py-2.5 font-medium text-black transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Webhook'}
          </button>
        </form>
      </section>

      {/* Webhooks List */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Your Webhooks</h2>

        {webhooks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">No webhooks configured yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="rounded-2xl border border-canvas-border bg-canvas/50 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center bg-canvas-border">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">{webhook.name}</p>
                      <p className="text-sm text-slate-400 truncate max-w-xs">{webhook.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {webhook.events.join(', ')}
                    </span>
                    <button
                      onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        webhook.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-canvas-border text-slate-400 hover:bg-canvas-border hover:text-white'
                      }`}
                    >
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="border border-canvas-border px-4 py-1.5 text-sm font-medium text-slate-400 hover:bg-canvas-border hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-canvas-border flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Created {new Date(webhook.created_at).toLocaleDateString()}
                    {webhook.last_triggered_at && (
                      <> • Last triggered {new Date(webhook.last_triggered_at).toLocaleDateString()}</>
                    )}
                  </p>
                  <div className="flex items-center gap-4 self-start">
                    <button
                      onClick={() => copyValue(webhook.url)}
                      className="text-sm text-brand hover:underline"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => toggleHistory(webhook.id)}
                      className="text-sm text-slate-300 hover:text-white hover:underline"
                    >
                      {historyLoading[webhook.id]
                        ? 'Loading…'
                        : deliveries[webhook.id]
                          ? 'Hide history'
                          : 'View history'}
                    </button>
                  </div>
                </div>

                {deliveries[webhook.id] && (
                  <div className="mt-4 rounded-xl border border-canvas-border bg-canvas p-4">
                    {deliveries[webhook.id]!.data.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No delivery attempts yet — they'll appear here after the first event fires.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="text-slate-400">
                            Success rate{' '}
                            <span className="font-semibold text-white">
                              {deliveries[webhook.id]!.summary.success_rate}%
                            </span>
                          </span>
                          <span className="text-emerald-400">{deliveries[webhook.id]!.summary.delivered} delivered</span>
                          <span className="text-red-400">{deliveries[webhook.id]!.summary.failed} dead</span>
                          <span className="text-amber-400">{deliveries[webhook.id]!.summary.pending_retry} retrying</span>
                        </div>
                        <div className="mt-3 max-h-48 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-canvas text-slate-500">
                              <tr>
                                <th className="py-1 pr-4">Event</th>
                                <th className="py-1 pr-4">Attempt</th>
                                <th className="py-1 pr-4">Outcome</th>
                                <th className="py-1 pr-4">HTTP</th>
                                <th className="py-1">When</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveries[webhook.id]!.data.slice(0, 8).map((d) => (
                                <tr key={d.id} className="border-t border-canvas-border/60">
                                  <td className="py-1.5 pr-4 font-mono text-slate-300">{d.event}</td>
                                  <td className="py-1.5 pr-4 text-slate-400">#{d.attempt}</td>
                                  <td className="py-1.5 pr-4">
                                    <span className={`rounded px-2 py-0.5 ${outcomeBadge(d.outcome)}`}>
                                      {d.outcome}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-4 text-slate-400">{d.http_status ?? '—'}</td>
                                  <td className="py-1.5 text-slate-500">
                                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {deliveries[webhook.id]!.data.length > 8 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Showing 8 of {deliveries[webhook.id]!.data.length} recent attempts.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhook Documentation */}
      <section className="rounded-2xl border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Webhook Payload</h2>
        <p className="mb-4 text-sm text-slate-400">
          Webhooks are delivered as HTTP POST requests with a JSON body. Verify the signature using the{' '}
          <code className="font-mono text-slate-300">X-Webhook-Signature</code> header. Deliveries
          retry with backoff (30s → 5m → 30m) and keep an attempt history in the dashboard.
        </p>
        <pre className="bg-canvas p-4 overflow-x-auto text-xs leading-relaxed text-slate-300">
{`POST <your-url>
X-Webhook-Signature: sha256=<hmac_sha256_of_raw_body>

{
  "id": "<email-id>:delivered:1762506600000",
  "event": "delivered",
  "created_at": "2026-11-07T09:30:00.000Z",
  "data": { ... }
}`}
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          See the <a href="/documentation/webhooks" className="text-brand hover:underline">Webhooks guide</a> for
          the full event list, payload schemas (email + SMS), and a signature-verification snippet.
        </p>
      </section>
    </div>
  );
}