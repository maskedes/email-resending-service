'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  created_at: string;
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'bg-info-soft text-info',
  warn: 'bg-warning-soft text-warning',
  error: 'bg-danger-soft text-danger',
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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Logs</h1>
        <p className="mt-1 text-slate-400">Activity and delivery logs for your email service.</p>
      </div>

      <section className="border border-canvas-border bg-canvas-raised p-6">
        {loading ? (
          <p className="py-8 text-center text-slate-500">Loading logs…</p>
        ) : error ? (
          <p className="py-8 text-center text-danger">{error}</p>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold ${
                          LEVEL_STYLES[log.level] || 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.message}</td>
                    <td className="px-4 py-3 text-slate-300">
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
