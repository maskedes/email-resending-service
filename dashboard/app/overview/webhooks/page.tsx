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
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['sent', 'delivered', 'bounced']);
  const [newWebhook, setNewWebhook] = useState<Webhook | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const ALL_EVENTS = ['sent', 'delivered', 'bounced', 'opened', 'clicked', 'complained', 'unsubscribed'];

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
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Create Webhook</h2>

        {newWebhook && (
          <div className="mb-5 border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300 mb-2">Webhook created! Save your signing secret:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded bg-canvas px-3 py-2 text-sm text-emerald-100 font-mono break-all">
                {newWebhook.id}
              </code>
              <button
                onClick={() => copyValue(newWebhook.id)}
                className="bg-brand/15 px-4 py-2 text-sm font-medium text-white hover:bg-brand/30 transition-colors"
              >
                Copy Secret
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Use this secret to verify webhook signatures. It won't be shown again.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
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
                className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
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
                className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
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
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
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
            className="w-full md:w-auto bg-brand px-6 py-2.5 font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Webhook'}
          </button>
        </form>
      </section>

      {/* Webhooks List */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
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
                className="border border-canvas-border bg-canvas/50 p-5"
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
                  <button
                    onClick={() => copyValue(webhook.url)}
                    className="text-sm text-brand hover:underline self-start"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhook Documentation */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Webhook Payload</h2>
        <p className="mb-4 text-sm text-slate-400">
          Webhooks are sent as POST requests with a JSON body. Verify the signature using the <code className="font-mono text-slate-300">X-Webhook-Signature</code> header.
        </p>
        <pre className="bg-canvas p-4 overflow-x-auto text-sm text-slate-300">
{`{
  "event": "email.sent",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "msg_abc123",
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Hello World",
    "status": "sent"
  }
}`}
        </pre>
      </section>
    </div>
  );
}