'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_TEMPLATES, DEFAULT_TEMPLATE, type SiteTemplate } from '@/lib/siteTemplates';

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'onboard.qd.je';

type Site = {
  id: string;
  api_key_id: string;
  domain: string;
  subdomain: string | null;
  title: string | null;
  html: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

type Draft = {
  id: string | null;
  domain: string;
  subdomain: string;
  title: string;
  html: string;
  is_published: boolean;
};

type Status = 'idle' | 'saving' | 'saved' | 'error';

const SIG = (d: Draft) =>
  JSON.stringify([d.subdomain.trim().toLowerCase(), d.title, d.html, d.is_published]);

const SUB_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function subProblem(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return 'Choose a subdomain for your site.';
  if (s.length > 63) return 'Subdomain is too long (max 63 characters).';
  if (!SUB_RE.test(s)) return 'Use lowercase letters, numbers and hyphens only.';
  return null;
}

const toDraft = (s: Site): Draft => ({
  id: s.id,
  domain: s.domain,
  subdomain: s.subdomain || '',
  title: s.title || '',
  html: s.html,
  is_published: s.is_published,
});

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const savedSig = useRef<string>('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sites-links/sites');
      if (r.ok) {
        const j = await r.json();
        setSites(j.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  };

  const openNew = (tpl: SiteTemplate = DEFAULT_TEMPLATE) => {
    setError(null);
    setStatus('idle');
    savedSig.current = '';
    setDraft({
      id: null,
      domain: SITE_DOMAIN,
      subdomain: '',
      title: '',
      html: tpl.html,
      is_published: true,
    });
  };

  const openEdit = (s: Site) => {
    setError(null);
    setStatus('saved');
    const d = toDraft(s);
    savedSig.current = SIG(d);
    setDraft(d);
  };

  const close = () => {
    setDraft(null);
    setError(null);
    setStatus('idle');
  };

  // Escape closes the editor.
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft]);

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const persist = useCallback(async (d: Draft) => {
    if (!d.id) return;
    setStatus('saving');
    const payload = {
      subdomain: d.subdomain.trim().toLowerCase(),
      title: d.title,
      html: d.html,
      is_published: d.is_published,
    };
    const res = await fetch(`/api/sites-links/sites/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus('error');
      setError(j?.error?.message || 'Could not save changes.');
      return;
    }
    savedSig.current = SIG({ ...d, subdomain: payload.subdomain });
    setStatus('saved');
    setError(null);
    setSites((prev) => prev.map((x) => (x.id === j.id ? j : x)));
  }, []);

  // Realtime: debounced auto-save for existing sites (create is explicit).
  useEffect(() => {
    if (!draft || !draft.id) return;
    if (SIG(draft) === savedSig.current) return;
    if (subProblem(draft.subdomain)) return; // don't persist an invalid address

    const timer = window.setTimeout(() => persist(draft), 700);
    return () => window.clearTimeout(timer);
  }, [draft, persist]);

  const create = async () => {
    if (!draft) return;
    const problem = subProblem(draft.subdomain);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/sites-links/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain: draft.subdomain.trim().toLowerCase(),
        title: draft.title,
        html: draft.html,
        is_published: draft.is_published,
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j?.error?.message || 'Could not create the site.');
      return;
    }
    setSites((prev) => [j, ...prev]);
    const d = toDraft(j);
    savedSig.current = SIG(d);
    setDraft(d);
    setStatus('saved');
    flash(`Live at https://${d.subdomain || 'your-name'}.${SITE_DOMAIN}`);
  };

  const duplicate = async (s: Site) => {
    const base = (s.subdomain || 'site').replace(/-copy(-\d+)?$/, '');
    for (const cand of [`${base}-copy`, `${base}-copy-2`, `${base}-copy-${Math.random().toString(36).slice(2, 6)}`]) {
      const res = await fetch('/api/sites-links/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: cand, title: s.title, html: s.html, is_published: false }),
      });
      if (res.ok) {
        const j = await res.json();
        setSites((prev) => [j, ...prev]);
        flash(`Duplicated to ${cand}.${SITE_DOMAIN} (draft)`);
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!/taken/i.test(j?.error?.message || '')) {
        setError(j?.error?.message || 'Could not duplicate.');
        return;
      }
    }
    setError('Could not find a free name for the copy.');
  };

  const remove = async (s: Site) => {
    if (!window.confirm(`Delete ${s.subdomain ? s.subdomain + '.' : ''}${s.domain}? This cannot be undone.`)) return;
    const res = await fetch(`/api/sites-links/sites/${s.id}`, { method: 'DELETE' });
    if (res.ok) {
      setSites((prev) => prev.filter((x) => x.id !== s.id));
      if (draft?.id === s.id) close();
      flash('Site deleted');
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.message || 'Could not delete.');
    }
  };

  const copyUrl = (s: Site) => {
    const host = s.subdomain ? `${s.subdomain}.${s.domain}` : s.domain;
    const url = `https://${host}`;
    const p = navigator.clipboard?.writeText(url);
    if (p) p.then(() => flash('URL copied'), () => flash(url));
    else flash(url);
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Toolbar — no page <h1> by request. */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Publish pages on <span className="font-semibold text-slate-200">*.{SITE_DOMAIN}</span> — click a card to edit with live preview.
        </p>
        <button
          onClick={() => openNew()}
          className="rounded-xl border border-white/15 bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
        >
          + New site
        </button>
      </div>

      {/* Template gallery for quick starts */}
      <div className="mb-6 mt-4 flex flex-wrap gap-2">
        {SITE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => openNew(t)}
            title={t.description}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : sites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-slate-300">No sites yet.</p>
          <p className="mt-1 text-xs text-slate-500">Pick a template above or start from Blank.</p>
          <button
            onClick={() => openNew()}
            className="mt-4 rounded-xl border border-white/15 bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-200"
          >
            Create your first site
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <SiteCard
              key={s.id}
              site={s}
              onOpen={() => openEdit(s)}
              onDuplicate={() => duplicate(s)}
              onDelete={() => remove(s)}
              onCopy={() => copyUrl(s)}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/95 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {draft && (
        <SiteEditor
          draft={draft}
          onPatch={patch}
          onClose={close}
          onCreate={create}
          onSave={() => persist(draft)}
          onDelete={() => {
            const s = sites.find((x) => x.id === draft.id);
            if (s) remove(s);
          }}
          onDuplicate={() => {
            const s = sites.find((x) => x.id === draft.id);
            if (s) duplicate(s);
          }}
          status={status}
          error={error}
          busy={busy}
        />
      )}
    </div>
  );
}

function SiteCard({
  site,
  onOpen,
  onDuplicate,
  onDelete,
  onCopy,
}: {
  site: Site;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const host = site.subdomain ? `${site.subdomain}.${site.domain}` : site.domain;
  const live = `/site/${site.domain}${site.subdomain ? '/' + site.subdomain : ''}`;
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.05]">
      <button onClick={onOpen} className="block w-full text-left" title="Open editor">
        <div className="relative h-40 overflow-hidden border-b border-white/10 bg-slate-950">
          <iframe
            title={host}
            srcDoc={site.html}
            sandbox=""
            tabIndex={-1}
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{ width: '400%', height: '400%', transform: 'scale(0.25)', border: 0 }}
          />
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
            style={{
              background: site.is_published ? 'rgba(16,185,129,.18)' : 'rgba(148,163,184,.18)',
              color: site.is_published ? '#34d399' : '#cbd5e1',
            }}
          >
            {site.is_published ? 'Live' : 'Draft'}
          </span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{site.title || host}</div>
          <div className="truncate text-xs text-slate-400">{host}</div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <a href={live} target="_blank" rel="noreferrer" className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10">Open</a>
          <button onClick={onCopy} className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10">Copy</button>
          <button onClick={onDuplicate} className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10">Dup</button>
          <button onClick={onDelete} className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Del</button>
        </div>
      </div>
    </div>
  );
}

function SiteEditor({
  draft,
  onPatch,
  onClose,
  onCreate,
  onSave,
  onDelete,
  onDuplicate,
  status,
  error,
  busy,
}: {
  draft: Draft;
  onPatch: (p: Partial<Draft>) => void;
  onClose: () => void;
  onCreate: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  status: Status;
  error: string | null;
  busy: boolean;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  // Template the user asked to apply but hasn't confirmed yet. While set, the
  // confirmation dialog is shown in place of the old native window.confirm().
  const [pendingTemplate, setPendingTemplate] = useState<SiteTemplate | null>(null);
  const isNew = !draft.id;

  // Dismiss the template dialog with Escape (the editor itself stays open).
  useEffect(() => {
    if (!pendingTemplate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPendingTemplate(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pendingTemplate]);

  const host = `${draft.subdomain.trim().toLowerCase() || 'your-name'}.${SITE_DOMAIN}`;
  const live = `/site/${draft.domain}${draft.subdomain.trim() ? '/' + draft.subdomain.trim().toLowerCase() : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" onMouseDown={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-canvas"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{isNew ? 'New site' : (draft.title || host)}</div>
            <div className="truncate text-xs text-slate-400">
              {isNew ? `Will publish to https://${host}` : `https://${host}`}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-xs">
              {status === 'saving' && <span className="text-amber-300">Saving…</span>}
              {status === 'saved' && !isNew && <span className="text-emerald-400">● All changes saved</span>}
              {status === 'idle' && isNew && <span className="text-slate-500">Not saved yet</span>}
            </span>
            {!isNew && (
              <a href={live} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                Open live
              </a>
            )}
            <button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          {/* Editor */}
          <div className="min-h-0 overflow-y-auto border-white/10 p-4 lg:border-r">
            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            <label className="mb-1 block text-xs font-medium text-slate-400">Title</label>
            <input
              value={draft.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="My site"
              className="mb-3 w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />

            <label className="mb-1 block text-xs font-medium text-slate-400">Address</label>
            <div className="mb-3 flex items-stretch">
              <input
                value={draft.subdomain}
                onChange={(e) => onPatch({ subdomain: e.target.value.toLowerCase() })}
                placeholder="your-name"
                className="min-w-0 flex-1 rounded-l-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-brand"
              />
              <span className="flex items-center rounded-r-lg border border-l-0 border-white/12 bg-white/[0.05] px-3 text-sm text-slate-400">
                .{SITE_DOMAIN}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Content (HTML)</label>
              <span className="text-[11px] text-slate-500">{draft.html.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={draft.html}
              onChange={(e) => onPatch({ html: e.target.value })}
              rows={16}
              spellCheck={false}
              className="mb-3 w-full resize-y rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-brand"
            />

            {/* Templates */}
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-slate-400">Start from a template</div>
              <div className="flex flex-wrap gap-2">
                {SITE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      // Applying a template over existing content needs consent,
                      // so ask via the in-app dialog (no native confirm popup).
                      if (draft.html.trim()) {
                        setPendingTemplate(t);
                        return;
                      }
                      onPatch({ html: t.html, title: draft.title || (t.name === 'Blank' ? '' : t.name) });
                    }}
                    title={t.description}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:bg-white/[0.07]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) => onPatch({ is_published: e.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              Published (visible at {host})
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isNew ? (
                <button
                  onClick={onCreate}
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  {busy ? 'Creating…' : 'Create site'}
                </button>
              ) : (
                <>
                  <button
                    onClick={onSave}
                    className="rounded-xl border border-white/15 bg-white px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    Save now
                  </button>
                  <button onClick={onDuplicate} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                    Duplicate
                  </button>
                  <button onClick={onDelete} className="ml-auto rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex min-h-0 flex-col bg-slate-950/40">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span className="text-xs text-slate-400">Live preview</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> realtime
              </span>
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
                <button
                  onClick={() => setDevice('desktop')}
                  className={`rounded-md px-2 py-1 text-xs ${device === 'desktop' ? 'bg-white/15 text-white' : 'text-slate-400'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setDevice('mobile')}
                  className={`rounded-md px-2 py-1 text-xs ${device === 'mobile' ? 'bg-white/15 text-white' : 'text-slate-400'}`}
                >
                  Mobile
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden p-3">
              <div
                className="h-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl transition-all"
                style={{ width: device === 'mobile' ? 390 : '100%' }}
              >
                <iframe
                  title="Live preview"
                  srcDoc={draft.html}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    {/* ── Template confirmation dialog ─────────────────────────────────────
        Replaces the old native window.confirm(). Everything is centred in the
        viewport, and the actions are large cards rather than plain buttons. */}
    {pendingTemplate && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-dialog-title"
        onClick={() => setPendingTemplate(null)}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-slate-950 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-5 text-center">
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
              style={{ background: `${pendingTemplate.accent}22` }}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: pendingTemplate.accent }}
              />
            </div>
            <h2 id="template-dialog-title" className="text-base font-bold text-white">
              Replace content with &ldquo;{pendingTemplate.name}&rdquo;?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {pendingTemplate.description}
            </p>
          </div>

          {/* Warning */}
          <div className="px-6 py-4">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-xs leading-relaxed text-amber-300">
              Your current HTML will be overwritten. This can&rsquo;t be undone
              unless you copy it first.
            </div>
          </div>

          {/* Actions — two cards side by side */}
          <div className="grid grid-cols-2 gap-3 px-6 pb-6">
            <button
              onClick={() => setPendingTemplate(null)}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-4 text-center transition hover:border-white/25 hover:bg-white/[0.07]"
            >
              <span className="block text-sm font-semibold text-slate-200">Cancel</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Keep my content
              </span>
            </button>

            <button
              onClick={() => {
                const t = pendingTemplate;
                setPendingTemplate(null);
                onPatch({
                  html: t.html,
                  title: draft?.title || (t.name === 'Blank' ? '' : t.name),
                });
              }}
              className="rounded-xl border border-white/15 bg-white px-4 py-4 text-center transition hover:bg-white/90"
            >
              <span className="block text-sm font-bold text-slate-950">Replace</span>
              <span className="mt-0.5 block text-[11px] text-slate-600">
                Apply {pendingTemplate.name}
              </span>
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
