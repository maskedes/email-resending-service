'use client';
import { useEffect, useState } from 'react';
type LinkRow = { id: string; domain: string; slug: string; target_url: string; clicks: number };
type LogRow = { id: string; long_url: string; short_url: string; created_at: string };
export default function LinksPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [domain, setDomain] = useState('en.12');
  const [slug, setSlug] = useState('');
  const [target, setTarget] = useState('https://example.com/very/long/url/to/shorten/for/customer');
  const [pref, setPref] = useState<'green' | 'blue'>('green');

  const load = async () => {
    const [a, b] = await Promise.all([
      fetch('/api/sites-links/links').then(r => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      fetch('/api/sites-links/logs').then(r => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
    ]);
    setLinks(a.data || []); setLogs(b.data || []);
  };
  useEffect(() => { load(); const v = localStorage.getItem('short_link_pref') as 'green' | 'blue' | null; if (v) setPref(v); }, []);
  useEffect(() => { localStorage.setItem('short_link_pref', pref); }, [pref]);

  const create = async () => {
    // Short domain defaults to en.12, customer can keep/change; long URL logged per api_key + trigger fires same api_key
    const r = await fetch('/api/sites-links/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain || 'en.12', slug: slug || undefined, target_url: target }) });
    if (!r.ok) alert((await r.json()).error?.message || 'failed'); else { setSlug(''); load(); }
  };

  const shortClass = pref === 'green' ? 'text-emerald-400 underline decoration-emerald-400' : 'text-sky-400 underline decoration-sky-400';
  const enPart = (url: string) => {
    const u = new URL(url.replace(/^https?:\/\//, 'https://'));
    return { en: u.hostname.split('.')[0] || 'en', rest: u.host.slice(u.host.indexOf('.')) + u.pathname };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Links</h1>
      <p className="text-sm text-muted-foreground">
        Short links default <code className="bg-canvas-border px-1">en.12</code> — customer long URL → short. Highlight: <span className="underline decoration-2" style={{ textDecorationColor: pref === 'green' ? '#34d399' : '#38bdf8' }}>en</span> in {pref}. Same API key handles longs (logs) + triggers.
      </p>
      <div className="flex gap-2">
        <button onClick={() => setPref('green')} className={`rounded px-3 py-1 text-xs ${pref === 'green' ? 'bg-emerald-500 text-white' : 'border border-canvas-border'}`}>Green</button>
        <button onClick={() => setPref('blue')} className={`rounded px-3 py-1 text-xs ${pref === 'blue' ? 'bg-sky-500 text-white' : 'border border-canvas-border'}`}>Blue</button>
      </div>
      <div className="rounded-2xl border border-canvas-border bg-canvas-raised p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="short domain (en.12)" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug (auto if empty)" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="long https://target.url" className="border border-canvas-border bg-canvas px-3 py-2 text-sm" />
        </div>
        <button onClick={create} className="border border-white/12 bg-white px-4 py-2 text-sm font-bold text-slate-950">Create short link</button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Short links (en highlighted)</h2>
        {links.map(l => {
          const short = `https://${l.domain}/${l.slug}`;
          const isBlue = pref === 'blue';
          return (
            <div key={l.id} className="rounded-2xl border border-canvas-border bg-canvas-raised p-3 text-sm flex justify-between gap-2">
              <span>
                <a href={`/s/${l.domain}/${l.slug}`} target="_blank" rel="noreferrer" className={shortClass}>
                  <span style={{ color: isBlue ? '#38bdf8' : '#34d399', fontWeight: 700 }}>en</span>.12/{l.slug}
                </a>{' '}
                <span className="text-slate-400">({l.clicks} clicks)</span> — long: <span className="break-all text-slate-400">{l.target_url.slice(0, 80)}</span>
              </span>
              <a href={short} target="_blank" rel="noreferrer" className="shrink-0 text-brand underline">
                open
              </a>
            </div>
          );
        })}
      </div>

      <div className="border-t border-canvas-border pt-4 space-y-2">
        <h2 className="text-sm font-semibold">Long URL log (per API key)</h2>
        <p className="text-xs text-slate-400">Every long→short creation logged. Same api_key for queries.</p>
        {logs.length === 0 ? <p className="text-xs text-slate-500">No longs yet.</p> : logs.map(r => <div key={r.id} className="border border-canvas-border bg-canvas p-2 text-xs flex justify-between"><span className="break-all">{r.long_url.slice(0, 120)}</span><a href={r.short_url} target="_blank" rel="noreferrer" className={`${shortClass} shrink-0 ml-2`}>{r.short_url}</a></div>)}
      </div>
    </div>
  );
}
