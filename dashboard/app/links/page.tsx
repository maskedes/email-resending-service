'use client';
import { useEffect, useState } from 'react';
type LinkRow = { id: string; domain: string; slug: string; target_url: string; clicks: number; created_at: string };
type LogRow = { id: string; long_url: string; short_url: string; created_at: string; event?: string; ip?: string | null; ua?: string | null };

export default function LinksPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [domain, setDomain] = useState('en.12');
  const [slug, setSlug] = useState('');
  const [target, setTarget] = useState('https://example.com/very/long/url/to/shorten/for/customer');
  const [pref, setPref] = useState<'green' | 'blue'>('green');
  const [preview, setPreview] = useState<string | null>(null); // expanded link id
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testKey, setTestKey] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const load = async () => {
    const [a, b] = await Promise.all([
      fetch('/api/sites-links/links').then(r => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      fetch('/api/sites-links/logs').then(r => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
    ]);
    setLinks(a.data || []); setLogs(b.data || []);
  };
  useEffect(() => { load(); const v = localStorage.getItem('short_link_pref') as 'green' | 'blue' | null; if (v) setPref(v); }, []);
  useEffect(() => { localStorage.setItem('short_link_pref', pref); }, [pref]);

  /** Mirrors the backend guards (urlSafety.ts) so bad targets never leave the form. */
  const targetIssue = (raw: string): string | null => {
    if (!raw.trim()) return 'Target URL required.';
    let u: URL;
    try { u = new URL(raw.trim()); } catch { return 'Not a valid absolute URL (include https://).'; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Only http/https targets can be shortened.';
    const host = u.hostname;
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.)/.test(host) || /^(172\.(1[6-9]|2\d|3[01])\.)\d/.test(host) || /\.local$/i.test(host) || /\.internal$/i.test(host)) {
      return 'Points at a local/private address — the backend will reject it.';
    }
    return null;
  };

  const create = async () => {
    const issue = targetIssue(target);
    if (issue) { setFormError(issue); return; }
    setFormError(null); setCreating(true);
    try {
      // Domain defaults to the backend's SHORT_LINK_DOMAIN when omitted; same api_key handles logs + triggers
      const r = await fetch('/api/sites-links/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain || undefined, slug: slug || undefined, target_url: target }) });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        setFormError(body?.error?.message || `Failed (HTTP ${r.status})`);
      } else { setSlug(''); load(); }
    } finally { setCreating(false); }
  };

  const shortClass = pref === 'green' ? 'text-emerald-400 underline decoration-emerald-400' : 'text-sky-400 underline decoration-sky-400';

  // link_logs rows: event='click' (redirect served) vs 'create'/legacy (shortened).
  const clickLogs = logs.filter(x => x.event === 'click');
  const createLogs = logs.filter(x => !x.event || x.event === 'create');

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ } };

  /** Test-send a short link via email or SMS — channel inferred from the recipient. */
  const sendTestLink = async (linkId: string) => {
    const value = testTo.trim();
    if (!value) { setSendStatus('Enter a phone number (+15551234567) or an email.'); return; }
    if (!testKey.trim()) { setSendStatus('Your API key is required (same one used in API → keys).'); return; }
    const channel = /^[+0-9()\-\s]{6,20}$/.test(value) ? 'sms' : 'email';
    setSending(true); setSendStatus(null);
    try {
      const r = await fetch(`/api/sites-links/links/${linkId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: testKey.trim(), channel, to: value }),
      });
      const body = await r.json().catch(() => null);
      if (r.ok) {
        setSendStatus(body?.message || `${channel === 'sms' ? 'SMS' : 'Email'} queued — check the ${channel === 'sms' ? 'SMS' : 'Emails'} screen for status.`);
      } else {
        setSendStatus(body?.error?.message || `Failed (HTTP ${r.status})`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Links</h1>
      <p className="text-sm text-muted-foreground">
        Short links highlight the brand slug in {pref}. Every target is validated
        (https-only, no private hosts) before a short code is ever generated —
        previews below let users verify destinations before clicking.
      </p>
      <div className="flex gap-2">
        <button onClick={() => setPref('green')} className={`rounded px-3 py-1 text-xs ${pref === 'green' ? 'bg-emerald-500 text-white' : 'border border-canvas-border'}`}>Green</button>
        <button onClick={() => setPref('blue')} className={`rounded px-3 py-1 text-xs ${pref === 'blue' ? 'bg-sky-500 text-white' : 'border border-canvas-border'}`}>Blue</button>
      </div>
      <div className="rounded-2xl border border-canvas-border bg-canvas-raised p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="short domain (backend default if empty)" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug (auto if empty)" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="long https://target.url" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
        </div>
        {targetIssue(target) !== null && target.trim() !== '' && (
          <p className="text-xs text-amber-400">{targetIssue(target)}</p>
        )}
        {formError && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{formError}</p>
        )}
        <button onClick={create} disabled={creating} className="border border-white/12 bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
          {creating ? 'Creating…' : 'Create short link'}
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Short links</h2>
        {links.map(l => {
          const short = `https://${l.domain}/${l.slug}`;
          const expanded = preview === l.id;
          const schemeSafe = l.target_url.startsWith('https://');
          return (
            <div key={l.id} className="rounded-2xl border border-canvas-border bg-canvas-raised p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="min-w-0">
                  <a href={short} target="_blank" rel="noreferrer" className={shortClass}>
                    <b style={{ color: pref === 'blue' ? '#38bdf8' : '#34d399' }}>{l.domain.split('.')[0]}</b>{l.domain.slice(l.domain.indexOf('.'))}/{l.slug}
                  </a>{' '}
                  <span className="text-slate-400">({l.clicks} clicks)</span> — long:{' '}
                  <span className="break-all text-slate-400">{l.target_url.length > 80 ? `${l.target_url.slice(0, 80)}…` : l.target_url}</span>
                </span>
                <span className="flex shrink-0 gap-3">
                  <button
                    onClick={() => setPreview(expanded ? null : l.id)}
                    className="text-slate-300 underline decoration-dotted hover:text-white"
                  >
                    {expanded ? 'Hide preview' : 'Preview'}
                  </button>
                  <button onClick={() => copy(short)} className="text-slate-300 underline decoration-dotted hover:text-white">Copy</button>
                  <a href={short} target="_blank" rel="noreferrer" className="text-brand underline">open</a>
                </span>
              </div>

              {expanded && (
                <div className="mt-3 rounded-xl border border-canvas-border bg-canvas p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 font-semibold ${schemeSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {schemeSafe ? 'https — verified scheme' : 'http — not encrypted'}
                    </span>
                    <span className="text-slate-400">
                      created {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                    </span>
                    <span className="text-slate-400">• {l.clicks} clicks</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Full destination (verify before sharing):</p>
                  <p className="mt-1 break-all font-mono text-slate-200">{l.target_url}</p>
                  <p className="mt-3 text-xs text-slate-500">Recent activity for this link:</p>
                  {(() => {
                    const linkEvents = logs
                      .filter(x => x.short_url === short && (x.event === 'click' || !x.event || x.event === 'create'))
                      .slice(0, 6);
                    if (linkEvents.length === 0) return <p className="mt-1 text-slate-500">No log entries yet.</p>;
                    return (
                      <ul className="mt-1 space-y-1">
                        {linkEvents.map(r => (
                          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 text-slate-400">
                            <span className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.event === 'click' ? 'bg-sky-500/20 text-sky-400' : 'bg-canvas-border text-slate-300'}`}>
                              {r.event === 'click' ? 'click' : 'created'}
                            </span>
                            {r.event === 'click' && r.ip && <span className="font-mono">{r.ip}</span>}
                            <span className="break-all">{(r.long_url || '').length > 60 ? `${r.long_url.slice(0, 60)}…` : r.long_url}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}

                  <div className="mt-3 rounded-lg border border-canvas-border bg-canvas-raised p-2">
                    <p className="text-xs font-semibold text-slate-300">Send this link as a test</p>
                    <p className="text-[11px] text-slate-500">Phone number → SMS • email address → email (Brevo). Uses your API key.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={testTo}
                        onChange={e => setTestTo(e.target.value)}
                        placeholder="+15551234567 or you@example.com"
                        className="min-w-[240px] flex-1 border border-canvas-border bg-canvas px-2 py-1 text-xs"
                      />
                      <input
                        value={testKey}
                        onChange={e => setTestKey(e.target.value)}
                        type="password"
                        placeholder="API key (fms_…)"
                        className="min-w-[160px] flex-1 border border-canvas-border bg-canvas px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => sendTestLink(l.id)}
                        disabled={sending}
                        className="border border-canvas-border bg-white px-3 py-1 text-xs font-bold text-slate-950 disabled:opacity-50"
                      >
                        {sending ? 'Sending…' : 'Send test'}
                      </button>
                    </div>
                    {sendStatus && <p className="mt-2 text-xs text-slate-400">{sendStatus}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-canvas-border pt-4 space-y-2">
        <h2 className="text-sm font-semibold">Click log (per redirect)</h2>
        <p className="text-xs text-slate-400">
          Every click on a short link is logged with time + masked IP (last octet removed for privacy). Counts can lag a second.
        </p>
        {clickLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No clicks yet — share a short link and watch this fill in.</p>
        ) : (
          clickLogs.slice(0, 30).map(r => {
            const slugPart = r.short_url.split('/').pop() || r.short_url;
            return (
              <div key={r.id} className="border border-canvas-border bg-canvas p-2 text-xs flex flex-wrap gap-x-4 items-baseline justify-between">
                <span className="flex items-baseline gap-3">
                  <a href={r.short_url} target="_blank" rel="noreferrer" className={shortClass}>{slugPart}</a>
                  <span className="font-mono text-slate-300">{r.ip || '—'}</span>
                  <span className="text-slate-400">{r.ua ? `${r.ua.slice(0, 48)}${r.ua.length > 48 ? '…' : ''}` : 'unknown client'}</span>
                </span>
                <span className="text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-canvas-border pt-4 space-y-2">
        <h2 className="text-sm font-semibold">Long URL log (per API key)</h2>
        <p className="text-xs text-slate-400">Every long→short creation logged. Same api_key for queries.</p>
        {createLogs.length === 0 ? <p className="text-xs text-slate-500">No longs yet.</p> : createLogs.map(r => <div key={r.id} className="border border-canvas-border bg-canvas p-2 text-xs flex justify-between"><span className="break-all">{r.long_url.slice(0, 120)}</span><a href={r.short_url} target="_blank" rel="noreferrer" className={`${shortClass} shrink-0 ml-2`}>{r.short_url}</a></div>)}
      </div>
    </div>
  );
}
