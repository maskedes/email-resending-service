'use client';

import { useState, useEffect } from 'react';

interface ApiKey {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_emails_sent: number;
  created_at: string;
  last_used_at: string | null;
}

const RevokeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M17 2H7C4.24 2 2 4.92 2 8.5S4.24 15 7 15c1.13 0 2.16-.49 3-1.31V21c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V8.5C22 4.92 19.76 2 17 2M7 13c-1.63 0-3-2.06-3-4.5S5.37 4 7 4s3 2.06 3 4.5S8.63 13 7 13" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z" />
  </svg>
);

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/apikeys');
      const data = await res.json();
      if (data.data) setKeys(data.data);
    } catch {
      // Silently fail - could add error state
    }
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setNewKey(null);

    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (data.key) {
        setNewKey(data.key);
        setName('');
        setEmail('');
        await fetchKeys();
      } else {
        setError(data.error?.message || 'Failed to generate API key.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setCreating(false);
    }
  }

  async function copyKey(text: string) {
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

  async function revokeKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    try {
      await fetch(`/api/apikeys/${id}`, { method: 'DELETE' });
      await fetchKeys();
    } catch {
      // Error handling
    }
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this API key permanently? It will be revoked and removed from the database. This cannot be undone.')) return;
    try {
      await fetch(`/api/apikeys/${id}/delete`, { method: 'DELETE' });
      await fetchKeys();
    } catch {
      // Error handling
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">API Keys</h1>
        <p className="mt-1 text-slate-400">Manage your API keys for sending emails via REST API or SMTP.</p>
      </div>

      {/* Create Key Form */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Create New API Key</h2>

        {newKey && (
          <div className="mb-5 border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300 mb-2">Your new API key (copy now - it won't be shown again):</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded bg-canvas px-3 py-2 text-sm text-emerald-100 font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={() => copyKey(newKey)}
                className="bg-brand/15 px-4 py-2 text-sm font-medium text-white hover:bg-brand/30 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4 md:grid md:grid-cols-3 md:gap-4">
          <div className="md:col-span-1">
            <label className="mb-1.5 block text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
              required
              disabled={creating}
              className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1.5 block text-sm text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={creating}
              className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Generate Key'}
            </button>
          </div>
        </form>
      </section>

      {/* API Keys List */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Your API Keys</h2>

        {keys.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">No API keys yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Emails Sent</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                    <td className="px-4 py-3 font-medium text-white">{key.name}</td>
                    <td className="px-4 py-3 text-slate-300">{key.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          key.is_active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{key.total_emails_sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {key.is_active && (
                          <button
                            onClick={() => revokeKey(key.id)}
                            title="Revoke"
                            aria-label="Revoke"
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <RevokeIcon />
                          </button>
                        )}
                        <button
                          onClick={() => deleteKey(key.id)}
                          title="Delete permanently"
                          aria-label="Delete permanently"
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SMTP Info */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">SMTP Configuration</h2>
        <p className="mb-4 text-sm text-slate-400">
          Use your API key as the password for SMTP authentication.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Host</p>
            <code className="text-slate-200 font-mono">smtp.freemailsend.com</code>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Port</p>
            <code className="text-slate-200 font-mono">587 (TLS)</code>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Username</p>
            <code className="text-slate-200 font-mono">your-api-key-id</code>
          </div>
          <div className="border border-canvas-border bg-canvas/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Password</p>
            <code className="text-slate-200 font-mono">your-api-key-secret</code>
          </div>
        </div>
      </section>
    </div>
  );
}