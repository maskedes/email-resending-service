'use client';

import { useState, useEffect } from 'react';
import SmsIcon from '@/components/icons/SmsIcon';

interface Props { keyName?: string }

export default function SmsSender({ keyName }: Props) {
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'queued' | 'sent' | 'delivered' | 'failed'>('idle');
  const [msg, setMsg] = useState('');
  const [smsId, setSmsId] = useState<string | null>(null);

  // Poll delivery status after send (realtime via your gateway's /result → DB)
  useEffect(() => {
    if (!smsId || !['queued', 'sent'].includes(status)) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/sms/${smsId}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.status === 'delivered' || j.status === 'sent') {
          setStatus(j.status);
          setMsg(j.status === 'delivered' ? 'Delivered ✓ (gateway confirmed)' : 'Sent — awaiting delivery receipt');
          if (j.status === 'delivered') clearInterval(iv);
        } else if (j.status === 'failed') {
          setStatus('failed');
          setMsg(j.error_message || 'Gateway reported failure');
          clearInterval(iv);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [smsId, status]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !body.trim()) return;
    setStatus('sending');
    setMsg('');
    setSmsId(null);
    // Use the dashboard's /api/sms proxy (reuses your API key plumbing)
    const r = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setStatus('failed');
      setMsg(j.error?.message || 'Send failed');
      return;
    }
    setSmsId(j.id);
    setStatus('queued');
    setMsg(j.status === 'queued' ? 'Queued — gateway will send within seconds' : 'Sent');
    // keep to/body so you can resend; clear body on delivered
  }

  const disabled = status === 'sending';

  return (
    <section className="border border-canvas-border bg-canvas-raised p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SmsIcon className="h-5 w-5 shrink-0 text-white" />
          <h2 className="text-lg font-semibold text-white">Send SMS realtime</h2>
        </div>
        <a href="/sms" className="shrink-0 text-xs text-slate-400 underline hover:text-white">
          SMS page
        </a>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Same API the dashboard uses: <code className="rounded bg-canvas-border px-1.5 py-0.5 text-slate-300">POST /api/sms/send</code> — Twilio-like, your Android phone delivers.{' '}
        {keyName ? <span className="text-slate-500">via {keyName}</span> : null}
      </p>

      <form onSubmit={send} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div>
            <label className="mb-1 block text-xs text-slate-500">To (E.164)</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+2567… or +1415…"
              className="w-full border border-canvas-border bg-canvas px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
            />
          </div>
          <div className="flex items-end">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message — e.g. Your OTP is 4931. Valid 5 min."
              maxLength={1600}
              className="w-full border border-canvas-border bg-canvas px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={disabled}
            className="border border-white/12 bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send SMS'}
          </button>
          {msg && (
            <span
              className={`text-xs ${status === 'delivered' ? 'text-emerald-300' : status === 'sent' ? 'text-brand-300' : status === 'failed' ? 'text-red-300' : 'text-slate-400'}`}
            >
              {msg}
              {smsId ? <span className="ml-2 text-slate-500">· {smsId.slice(0, 8)}</span> : null}
            </span>
          )}
        </div>
      </form>

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-300">API (like Twilio)</summary>
        <pre className="mt-2 overflow-auto border border-canvas-border bg-canvas p-3 text-[11px] leading-relaxed text-slate-400">
{`curl -X POST https://mailenvoy.qd.je/api/sms/send \\
  -H "x-api-key: fms_..." -H "Content-Type: application/json" \\
  -d '{"to":"+256…","body":"Hello"}'
// Realtime: GET /api/sms/:id polls status queued→sent→delivered (gateway confirms).
// CLI: envoy sms-send --to "+256…" --body "Hello"`}
        </pre>
      </details>
    </section>
  );
}
