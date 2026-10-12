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
  const [copied, setCopied] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'revoke' | 'delete'; id: string } | null>(null);

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
        const raw = String(data.key);
        setNewKey(raw);
        setName('');
        setEmail('');
        // Build a masked preview (fms_••••••••wxyz) so the key is also
        // visible in the list below after the one-time reveal is dismissed.
        const preview = `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`;
        if (data.id) setPreviews((p) => ({ ...p, [String(data.id)]: preview }));
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function revokeKey(id: string) {
    setConfirmDialog({ type: 'revoke', id });
  }

  function deleteKey(id: string) {
    setConfirmDialog({ type: 'delete', id });
  }

  async function performRevoke(id: string) {
    try {
      await fetch(`/api/apikeys/${id}`, { method: 'DELETE' });
      await fetchKeys();
    } catch {
      // Error handling
    }
  }

  async function performDelete(id: string) {
    try {
      await fetch(`/api/apikeys/${id}?permanent=true`, { method: 'DELETE' });
      await fetchKeys();
    } catch {
      // Error handling
    }
  }

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="mt-1 text-slate-400">Manage your API keys for sending emails via REST API or SMTP.</p>
        </div>

      {/* Create Key Form */}
      <section className="rounded-xl border border-canvas-border bg-canvas-raised p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-white">Create New API Key</h2>
        <p className="mb-5 text-sm text-slate-400">Generate a key to authenticate API or SMTP requests.</p>

        {newKey && (
          <div className="relative mb-6 overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 shadow-lg shadow-emerald-500/5">
            <span className="absolute inset-y-0 left-0 w-1 bg-emerald-400/70" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setNewKey(null)}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-canvas hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3l-1.4 1.41l6.29 6.3l-6.3 6.29l1.41 1.41l6.3-6.3l6.29 6.3l1.41-1.41l-6.3-6.29l6.3-6.3z" />
              </svg>
            </button>
            <h3 className="mb-3 pr-8 text-sm font-semibold text-emerald-300">
              API key created — copy it now, it won&apos;t be shown again
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <code className="flex-1 break-all rounded-lg border border-canvas-border bg-canvas px-3.5 py-3 text-sm text-emerald-200 font-mono">
                {newKey}
              </code>
              <button
                type="button"
                onClick={() => copyKey(newKey)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-brand/90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 36 36" aria-hidden="true">
                  <path d="M0 0h36v36H0z" fill="none" />
                  <path fill="currentColor" d="M27 3.56A1.56 1.56 0 0 0 25.43 2H5.57A1.56 1.56 0 0 0 4 3.56v24.88A1.56 1.56 0 0 0 5.57 30h.52V4.07H27Z" className="clr-i-solid clr-i-solid-path-1" />
                  <rect width="23" height="28" x="8" y="6" fill="currentColor" className="clr-i-solid clr-i-solid-path-2" rx="1.5" ry="1.5" />
                  <path fill="none" d="M0 0h36v36H0z" />
                </svg>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="md:col-span-1">
            <label htmlFor="apikey-name" className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
            <input
              id="apikey-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
              required
              disabled={creating}
              className="w-full rounded-lg border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="apikey-email" className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              id="apikey-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={creating}
              className="w-full rounded-lg border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            />
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-black transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Generate Key'}
            </button>
          </div>
        </form>
      </section>

      {/* API Keys List */}
      <section className="rounded-xl border border-canvas-border bg-canvas-raised p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-white">Your API Keys</h2>

        {keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-canvas-border py-12 text-center">
            <p className="text-slate-500">No API keys yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-canvas-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-canvas text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Emails Sent</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-border/60">
                {keys.map((key) => (
                  <tr key={key.id} className="bg-canvas-raised transition-colors hover:bg-brand/5">
                    <td className="px-4 py-3 font-medium text-white">{key.name}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-canvas px-2 py-1 font-mono text-xs text-slate-400">{previews[key.id] ?? 'fms_••••••••••••'}</code>
                    </td>
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
      <section className="rounded-xl border border-canvas-border bg-canvas-raised p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-white">SMTP Configuration</h2>
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

      {/* Confirmation popout card for revoke / delete (dark blue, solid) */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={confirmDialog.type === 'delete' ? 'Delete API key' : 'Revoke API key'}
            className="w-full max-w-md rounded-xl border border-blue-500/40 bg-[#0c1f3f] p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              {confirmDialog.type === 'delete' ? 'Delete API key?' : 'Revoke API key?'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {confirmDialog.type === 'delete'
                ? 'This key will be permanently deleted and removed from the database. This cannot be undone.'
                : 'This key will be revoked and can no longer be used to send emails. This cannot be undone.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border border-slate-400/30 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { id, type } = confirmDialog;
                  setConfirmDialog(null);
                  if (type === 'delete') performDelete(id);
                  else performRevoke(id);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  confirmDialog.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {confirmDialog.type === 'delete' ? 'Delete' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}