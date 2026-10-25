'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmailRow {
  id: string;
  api_key_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-yellow-500/15 text-yellow-400',
  sending: 'bg-blue-500/15 text-blue-400',
  sent: 'bg-emerald-500/15 text-emerald-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  failed: 'bg-red-500/15 text-red-400',
  bounced: 'bg-red-500/15 text-red-400',
};

// Filter categories shown as a scrollable chip row above the log table.
const STATUS_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'queued', label: 'Queued' },
  { id: 'sent', label: 'Sent' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'failed', label: 'Failed' },
  { id: 'bounced', label: 'Bounced' },
];

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LogsPage() {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [keyIds, setKeyIds] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const mergeEmails = useCallback((incoming: EmailRow[]) => {
    setEmails((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      for (const e of incoming) map.set(e.id, e);
      return Array.from(map.values())
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 200);
    });
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/emails?limit=100');
      const json = await res.json();
      if (Array.isArray(json.keyIds)) setKeyIds(json.keyIds);
      if (Array.isArray(json.data)) mergeEmails(json.data);
      setError('');
    } catch {
      setError('Failed to load emails.');
    } finally {
      setLoading(false);
    }
  }, [mergeEmails]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // True realtime: INSERT (new send) + UPDATE (queued -> sent/failed).
  useEffect(() => {
    if (!keyIds.length) return;
    const sb = createClient();
    const filter = `api_key_id=in.(${keyIds.join(',')})`;
    const ch = sb
      .channel('email-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails', filter },
        (p) => mergeEmails([p.new as EmailRow])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emails', filter },
        (p) => mergeEmails([p.new as EmailRow])
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => {
      sb.removeChannel(ch);
      setLive(false);
    };
  }, [keyIds, mergeEmails]);

  // Polling safety net (covers realtime blocked by RLS/network).
  useEffect(() => {
    const t = setInterval(fetchEmails, 8000);
    return () => clearInterval(t);
  }, [fetchEmails]);

  const filtered = emails.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !e.to_email.toLowerCase().includes(q) &&
        !e.subject.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Email Logs</h1>
          <p className="mt-1 text-slate-400">
            Every send on your keys, updating live.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            live
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-yellow-500/15 text-yellow-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              live ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'
            }`}
          />
          {live ? 'LIVE' : 'POLLING'}
        </span>
      </div>

      {/* Status categories — scrollable chip row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_CATEGORIES.map((cat) => {
            const active = statusFilter === cat.id;
            const count = cat.id === 'all' ? emails.length : emails.filter((e) => e.status === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setStatusFilter(cat.id)}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap w-28 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-brand bg-brand text-black'
                    : 'border-canvas-border bg-canvas text-slate-400 hover:border-brand/40 hover:text-white'
                }`}
              >
                {cat.label}
                {emails.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${
                      active ? 'bg-black/10 text-black' : 'bg-canvas-raised text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to or subject…"
            className="w-full rounded bg-canvas px-3 py-2 text-sm text-white border border-canvas-border placeholder:text-slate-600"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500">Loading logs…</p>
        ) : error ? (
          <p className="py-8 text-center text-red-400">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 text-lg">No emails yet.</p>
            <p className="text-slate-600 text-sm mt-2">
              Send an email and watch it appear here live.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-canvas-border">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">To</th>
                  <th className="pb-2 pr-4 font-medium">Subject</th>
                  <th className="pb-2 pr-4 font-medium">From</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <>
                    <tr
                      key={e.id}
                      onClick={() =>
                        setExpanded(expanded === e.id ? null : e.id)
                      }
                      className="border-b border-canvas-border/50 cursor-pointer hover:bg-white/5"
                    >
                      <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">
                        {fmtTime(e.created_at)}
                      </td>
                      <td className="py-2 pr-4 text-white break-all">
                        {e.to_email}
                      </td>
                      <td className="py-2 pr-4 text-slate-300 max-w-[280px] truncate">
                        {e.subject}
                      </td>
                      <td className="py-2 pr-4 text-slate-400 max-w-[200px] truncate">
                        {e.from_name
                          ? `${e.from_name} <${e.from_email}>`
                          : e.from_email}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[e.status] ||
                            'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr key={e.id + '-detail'}>
                        <td
                          colSpan={5}
                          className="py-3 px-4 bg-black/20 text-xs text-slate-400"
                        >
                          <div className="grid gap-1 sm:grid-cols-2">
                            <div>
                              <span className="text-slate-600">ID: </span>
                              <span className="font-mono">{e.id}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Sent at: </span>
                              {e.sent_at ? fmtTime(e.sent_at) : '—'}
                            </div>
                            <div>
                              <span className="text-slate-600">
                                Delivered at:{' '}
                              </span>
                              {e.delivered_at
                                ? fmtTime(e.delivered_at)
                                : '—'}
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-600">Error: </span>
                              <span className="text-red-300">
                                {e.error_message || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
