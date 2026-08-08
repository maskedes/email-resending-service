'use client';

import { useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_emails_sent: number;
  created_at: string;
}

export default function ApiKeyManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function generateToken(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
        // Refresh list
        const listRes = await fetch('/api/apikeys');
        const list = await listRes.json();
        setKeys(list.data || []);
      } else {
        setError(data.error?.message || 'Failed to generate token.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
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
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    await fetch(`/api/apikeys/${id}`, { method: 'DELETE' });
    const listRes = await fetch('/api/apikeys');
    const list = await listRes.json();
    setKeys(list.data || []);
  }

  return (
    <section className="mb-10 border border-canvas-border bg-canvas-raised p-6">
      <h2 className="mb-5 text-lg font-semibold text-white">🔑 Generate Token</h2>

      <form onSubmit={generateToken} className="mb-5 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm text-slate-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My App"
            required
            className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate Token'}
        </button>
      </form>

      {error && (
        <div className="mb-5 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-5 border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="mb-2 text-sm text-emerald-300">
            ✅ Token generated! Copy it now — it won&apos;t be shown again:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded border border-canvas-border bg-canvas px-3 py-2 text-sm text-emerald-400">
              {newKey}
            </code>
            <button
              onClick={() => copyKey(newKey)}
              className="border border-canvas-border bg-canvas-border px-4 py-2 text-sm font-semibold text-indigo-300 transition hover:border-brand"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}

      <h3 className="mb-3 text-base font-semibold text-white">📋 API Keys</h3>
      {keys.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No API keys yet. Create one above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Emails Sent</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                  <td className="px-4 py-3 text-white">{k.name}</td>
                  <td className="px-4 py-3 text-slate-300">{k.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        k.is_active
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {k.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{k.total_emails_sent}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => revokeKey(k.id)}
                      className="bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/25"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
