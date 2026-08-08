'use client';

import { useState } from 'react';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  created_at: string;
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [error, setError] = useState('');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Automation</h1>
        <p className="mt-1 text-slate-400">Automate email workflows with triggers and actions.</p>
      </div>

      {/* Create Automation */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Create Automation</h2>
        <p className="mb-4 text-sm text-slate-400">
          Build automations to send emails on events, schedule sends, or trigger webhooks automatically.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Automation name"
            className="flex-1 min-w-[200px] border border-canvas-border bg-canvas px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none"
          />
          <select className="border border-canvas-border bg-canvas px-3 py-2 text-sm text-slate-300 focus:border-brand focus:outline-none">
            <option>On email delivered</option>
            <option>On email failed</option>
            <option>On webhook received</option>
            <option>Scheduled (cron)</option>
          </select>
          <button className="bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
            Create
          </button>
        </div>
      </section>

      {/* Automations List */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Your Automations</h2>
        {error ? (
          <p className="py-8 text-center text-danger">{error}</p>
        ) : automations.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            No automations yet. Create one above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {automations.map((a) => (
                  <tr key={a.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                    <td className="px-4 py-3 text-white">{a.name}</td>
                    <td className="px-4 py-3 text-slate-300">{a.trigger}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold ${
                          a.enabled
                            ? 'bg-success-soft text-success'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {a.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(a.created_at).toLocaleDateString()}
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
