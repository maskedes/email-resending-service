'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string;
  email_id: string;
  subject: string | null;
  to_email: string | null;
  email_status: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
  queued: 'bg-yellow-500/15 text-yellow-400',
  sent: 'bg-emerald-500/15 text-emerald-400',
  failed: 'bg-red-500/15 text-red-400',
  info: 'bg-blue-500/15 text-blue-400',
  warn: 'bg-yellow-500/15 text-yellow-400',
  error: 'bg-red-500/15 text-red-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  bounced: 'bg-red-500/15 text-red-400',
};

const LEVEL_ICONS: Record<string, string> = {
  queued: '⏳',
  sent: '✅',
  failed: '❌',
  info: 'ℹ️',
  error: '🚫',
  delivered: '📬',
  bounced: '↩️',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (!cancelled) setLogs(data.data || []);
      } catch {
        if (!cancelled) setError('Failed to load logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLogs();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Logs</h1>
        <p className="mt-1 text-slate-400">Real-time email delivery events and activity.</p>
      </div>

      <section className="border border-canvas-border bg-canvas-raised p-6">
        {loading ? (
          <p className="py-8 text-center text-slate-500">Loading logs…</p>
        ) : error ? (
          <p className="py-8 text-center text-red-400">{error}</p>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 text-lg">No logs yet.</p>
            <p className="text-slate-600 text-sm mt-2">Send an email to see delivery events here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-canvas-border/60 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          LEVEL_STYLES[log.level] || 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        <span>{LEVEL_ICONS[log.level] || '📋'}</span>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {log.subject || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.to_email || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                      {log.message || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
