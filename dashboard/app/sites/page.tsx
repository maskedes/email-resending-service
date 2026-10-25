'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_TEMPLATES, DEFAULT_TEMPLATE, type SiteTemplate } from '@/lib/siteTemplates';
import {
  type Section,
  type SiteModel,
  type SectionType,
  SECTION_META,
  PALETTE,
  newSection,
  parseModel,
  renderModel,
  templateModel,
} from '@/lib/siteBuilder';

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
    const preset = templateModel(tpl.id);
    setDraft({
      id: null,
      domain: SITE_DOMAIN,
      subdomain: '',
      title: preset.title,
      html: renderModel(preset.model, preset.title),
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

  const publishNow = useCallback(() => {
    if (!draft) return;
    const d = { ...draft, is_published: true };
    setDraft(d);
    if (d.id) persistRef.current?.(d);
  }, [draft]);

  const persist = useCallback(
    async (d: Draft) => {
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
    },
    []
  );
  // Latest persist, callable from publishNow without stale closures.
  const persistRef = useRef<((d: Draft) => Promise<void>) | null>(null);
  persistRef.current = persist;

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
      {/* Toolbar â€” no page <h1> by request. */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Build pages visually on <span className="font-semibold text-slate-200">*.{SITE_DOMAIN}</span> â€” add sections, edit settings, publish.
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
        <p className="text-sm text-slate-500">Loadingâ€¦</p>
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
          onPublishExisting={publishNow}
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• visual editor â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const SECTION_ICON: Record<string, string> = {
  hero: 'home',
  text: 'text',
  images: 'image',
  features: 'grid',
  testimonials: 'chat',
  contact: 'mail',
  links: 'link',
  nav: 'menu',
  footer: 'rule',
  legacy: 'code',
};

function SectionIcon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    home: <path d="M3 10.5 10 4l7 6.5V17H3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
    text: <path d="M3 5h10M3 8.5h14M3 12h14M3 15.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />,
    image: (
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="4" width="15" height="12" rx="2" />
        <circle cx="6.5" cy="8" r="1.2" />
        <path d="m3 14 4.5-4 4 4 3-2.5L18 14" />
      </g>
    ),
    grid: <path d="M3.5 3.5h5.5v5.5H3.5zM11 3.5h5.5v5.5H11zM3.5 11h5.5v5.5H3.5zM11 11h5.5v5.5H11z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
    chat: <path d="M3 4h14v9H8l-5 3.5V4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
    mail: <g fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="m3 6 7 5 7-5" /></g>,
    link: <path d="M7.5 12.5a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 5l-1 1M12.5 7.5a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 0 1-5-5l1-1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
    menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />,
    rule: <path d="M3 13h14M5.5 16.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />,
    code: <path d="m6 5-4 5 4 5M14 5l4 5-4 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  };
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" className="shrink-0 text-slate-400">
      {p[name] || p.grid}
    </svg>
  );
}

function SiteEditor({
  draft,
  onPatch,
  onClose,
  onCreate,
  onPublishExisting,
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
  onPublishExisting: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  status: Status;
  error: string | null;
  busy: boolean;
}) {
  const [model, setModel] = useState<SiteModel | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pendingTemplate, setPendingTemplate] = useState<SiteTemplate | null>(null);
  const isNew = !draft.id;

  // Parse the stored HTML into the section model once per opened site.
  useEffect(() => {
    setModel(parseModel(draft.html));
    setSel(null);
    setAddOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

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

  const apply = useCallback(
    (next: SiteModel) => {
      setModel(next);
      onPatch({ html: renderModel(next, draft.title) });
    },
    [onPatch, draft.title]
  );

  const patchTitle = (title: string) => {
    if (!model) return;
    onPatch({ title, html: renderModel(model, title) });
  };

  const insertSection = (type: SectionType) => {
    if (!model) return;
    const sections = [...model.sections];
    const s = newSection(type);
    // Insert after the selected section, or just above a trailing footer.
    let at = sections.length;
    if (sel) {
      const i = sections.findIndex((x) => x.id === sel);
      if (i >= 0) at = i + 1;
    } else if (sections.length && sections[sections.length - 1].type === 'footer') {
      at = sections.length - 1;
    }
    sections.splice(at, 0, s);
    apply({ ...model, sections });
    setSel(s.id);
    setAddOpen(false);
  };

  if (!model) return null;

  const host = `${draft.subdomain.trim().toLowerCase() || 'your-name'}.${SITE_DOMAIN}`;
  const live = `/site/${draft.domain}${draft.subdomain.trim() ? '/' + draft.subdomain.trim().toLowerCase() : ''}`;
  const selSection = model.sections.find((s) => s.id === sel) || null;
  const prev = draft.html;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" onMouseDown={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-canvas"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{isNew ? 'New site' : (draft.title || draft.subdomain + '.' + SITE_DOMAIN)}</div>
            <div className="truncate text-xs text-slate-400">
              {isNew ? `Will publish to https://${host}` : `https://${host}`}
              {status === 'saving' && <span className="ml-2 text-amber-300">Â· Savingâ€¦</span>}
              {status === 'saved' && !isNew && <span className="ml-2 text-emerald-400">Â· Saved</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={draft.title}
              onChange={(e) => patchTitle(e.target.value)}
              placeholder="Site name"
              className="w-40 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-brand sm:w-52"
            />
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

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
          {/* â”€â”€ Left: sections + publish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex min-h-0 flex-col border-white/10 lg:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              {/* Legacy notice */}
              {model.sections.length === 1 && model.sections[0].type === 'legacy' && (
                <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
                  This site was built with the old editor. Its original content appears below as a Custom HTML block â€” add new sections on top of it, or delete that block to go fully visual.
                </div>
              )}

              {/* ADD A SECTION */}
              <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500">ADD A SECTION</div>
              <div className="relative mb-3">
                <div className="flex flex-col gap-1.5">
                  {PALETTE.map((t) => (
                    <button
                      key={t}
                      onClick={() => insertSection(t)}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/[0.07]"
                    >
                      <SectionIcon name={SECTION_ICON[t]} />
                      {SECTION_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {(model.sections.length > 1 || model.sections[0]?.type !== 'legacy') && (
                <>
                  <div className="mb-1 mt-4 text-[11px] font-semibold tracking-wide text-slate-500">PAGE SECTIONS</div>
                  <p className="mb-2 text-[11px] text-slate-500">Click a section to edit its settings â€” preview updates live.</p>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                {model.sections.map((s, i) => (
                  <div key={s.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSel(s.id === sel ? null : s.id)}
                      className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition ${
                        s.id === sel ? 'bg-white/[0.09] text-white' : 'text-slate-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      <SectionIcon name={SECTION_ICON[s.type]} />
                      <span className="min-w-0 flex-1 truncate">{SECTION_META[s.type].label}</span>
                      <span
                        className="flex shrink-0 items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            if (i === 0 || !model) return;
                            const secs = [...model.sections];
                            [secs[i - 1], secs[i]] = [secs[i], secs[i - 1]];
                            apply({ ...model, sections: secs });
                          }}
                          disabled={i === 0}
                          title="Move up"
                          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          â†‘
                        </button>
                        <button
                          onClick={() => {
                            if (i === model.sections.length - 1) return;
                            const secs = [...model.sections];
                            [secs[i + 1], secs[i]] = [secs[i], secs[i + 1]];
                            apply({ ...model, sections: secs });
                          }}
                          disabled={i === model.sections.length - 1}
                          title="Move down"
                          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          â†“
                        </button>
                        <button
                          onClick={() => {
                            if (!model) return;
                            apply({ ...model, sections: model.sections.filter((x) => x.id !== s.id) });
                            if (sel === s.id) setSel(null);
                          }}
                          title="Remove section"
                          className="rounded p-1 text-red-400 hover:bg-red-500/10"
                        >
                          âœ•
                        </button>
                      </span>
                    </div>
                    {/* Selected section settings */}
                    {s.id === sel && s.type !== 'legacy' && (
                      <div className="border-t border-white/10 px-3 py-3">
                        <SectionForm
                          section={s}
                          onChange={(p) => {
                            if (!model) return;
                            apply({
                              ...model,
                              sections: model.sections.map((x) => (x.id === s.id ? ({ ...x, ...p } as Section) : x)),
                            });
                          }}
                        />
                      </div>
                    )}
                    {s.id === sel && s.type === 'legacy' && (
                      <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-400">
                        Original imported page content â€” it stays exactly as-is on the published site.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Theme */}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">APPEARANCE</div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    Accent
                    <input
                      type="color"
                      value={model.theme.accent}
                      onChange={(e) => apply({ ...model, theme: { ...model.theme, accent: e.target.value } })}
                      className="h-7 w-9 cursor-pointer rounded border border-white/15 bg-transparent p-0"
                    />
                  </label>
                  <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
                    {(['dark', 'light'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => apply({ ...model, theme: { ...model.theme, mode: m } })}
                        className={`rounded-md px-2 py-1 text-xs capitalize ${model.theme.mode === m ? 'bg-white/15 text-white' : 'text-slate-400'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">START FROM A TEMPLATE</div>
                <div className="flex flex-wrap gap-2">
                  {SITE_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (hasRealContent(model)) setPendingTemplate(t);
                        else applyTemplate(t, model, apply, onPatch, draft.title);
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
            </div>

            {/* Publish bar */}
            <div className="border-t border-white/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 20 20" className="shrink-0 text-slate-400"><g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c-4.5 4.7-4.5 10.3 0 15M10 2.5c4.5 4.7 4.5 10.3 0 15" /></g></svg>
                <div className="min-w-0 flex-1">
                  <input
                    value={draft.subdomain}
                    onChange={(e) => onPatch({ subdomain: e.target.value.toLowerCase() })}
                    placeholder="your-name"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-brand"
                  />
                  <div className="mt-1 truncate text-[11px] text-slate-500">{host} â€” your custom website address</div>
                </div>
              </div>
              {subProblem(draft.subdomain) && (
                <p className="mb-2 text-[11px] text-amber-300">{subProblem(draft.subdomain)}</p>
              )}
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={draft.is_published}
                  onChange={(e) => onPatch({ is_published: e.target.checked })}
                  className="h-3.5 w-3.5 accent-emerald-500"
                />
                Visible live after publishing
              </label>
              <button
                onClick={isNew ? onCreate : onPublishExisting}
                disabled={busy || Boolean(subProblem(draft.subdomain))}
                className="w-full rounded-full bg-slate-950 py-2.5 text-sm font-bold text-white shadow-lg ring-1 ring-white/15 transition hover:bg-black disabled:opacity-40"
              >
                {isNew ? (busy ? 'Publishingâ€¦' : 'Publish website') : 'Save & publish'}
              </button>
              {!isNew && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <button onClick={onDuplicate} className="text-slate-400 hover:text-white">Duplicate</button>
                  <button onClick={onDelete} className="text-red-400 hover:text-red-300">Delete site</button>
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ Right: live preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex min-h-0 flex-col bg-slate-950/40">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span className="text-[11px] font-semibold tracking-wide text-slate-500">LIVE WEBSITE PREVIEW</span>
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
                  srcDoc={prev}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            </div>
            <p className="px-4 pb-2 text-xs text-slate-500">Preview updates as you edit your sections.</p>
          </div>
        </div>
      </div>

      {/* Template confirmation dialog */}
      {pendingTemplate && model && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPendingTemplate(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-6 py-5 text-center">
              <div
                className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                style={{ background: `${pendingTemplate.accent}22` }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: pendingTemplate.accent }} />
              </div>
              <h2 className="text-base font-bold text-white">Replace content with &ldquo;{pendingTemplate.name}&rdquo;?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{pendingTemplate.description}</p>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-xs leading-relaxed text-amber-300">
                Your current sections will be replaced. This can&rsquo;t be undone.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <button
                onClick={() => setPendingTemplate(null)}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-4 text-center transition hover:border-white/25 hover:bg-white/[0.07]"
              >
                <span className="block text-sm font-semibold text-slate-200">Cancel</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">Keep my content</span>
              </button>
              <button
                onClick={() => {
                  const t = pendingTemplate;
                  setPendingTemplate(null);
                  applyTemplate(t, model, apply, onPatch, draft.title);
                }}
                className="rounded-xl border border-white/15 bg-white px-4 py-4 text-center transition hover:bg-white/90"
              >
                <span className="block text-sm font-bold text-slate-950">Replace</span>
                <span className="mt-0.5 block text-[11px] text-slate-600">Apply {pendingTemplate.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hasRealContent(model: SiteModel): boolean {
  if (model.sections.length === 1 && model.sections[0].type === 'legacy') return false;
  return model.sections.length > 1;
}

function applyTemplate(
  t: SiteTemplate,
  model: SiteModel,
  apply: (m: SiteModel) => void,
  onPatch: (p: Partial<Draft>) => void,
  _title: string
) {
  const preset = templateModel(t.id);
  apply(preset.model);
  onPatch({ title: preset.title || '' });
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ section settings forms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const inputCls =
  'w-full rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-1.5 text-sm text-white outline-none focus:border-brand';
const labelCls = 'block text-[11px] font-medium text-slate-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </Field>
  );
}

function AreaField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <Field label={label}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${inputCls} resize-y leading-relaxed`} />
    </Field>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-500" />
      {label}
    </label>
  );
}

/** Generic repeating-item editor (links, features, testimonials, images). */
function ItemsEditor<T>({ items, onChange, blank, label, children }: {
  items: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  label: string;
  children: (item: T, set: (p: Partial<T>) => void, i: number) => React.ReactNode;
}) {
  const setAt = (i: number, p: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="mb-1">
      <div className="mb-1 flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        <button
          onClick={() => onChange([...items, blank()])}
          className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
        >
          + Add
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it, i) => (
          <div key={i} className="relative rounded-lg border border-white/10 bg-white/[0.02] p-2.5 pr-8">
            {children(it, (p) => setAt(i, p), i)}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              title="Remove"
              className="absolute right-1.5 top-1.5 rounded p-1 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            >
              âœ•
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-[11px] text-slate-500">Nothing yet â€” press Add.</p>}
      </div>
    </div>
  );
}

const linkBlank = (): { label: string; url: string } => ({ label: 'New link', url: 'https://' });

function LinkFields({ item, set }: { item: { label: string; url: string }; set: (p: Partial<{ label: string; url: string }>) => void }) {
  return (
    <>
      <input value={item.label} onChange={(e) => set({ label: e.target.value })} placeholder="Label" className={`${inputCls} mb-1.5`} />
      <input value={item.url} onChange={(e) => set({ url: e.target.value })} placeholder="https:// or #section" className={inputCls} />
    </>
  );
}

function SectionForm({
  section,
  onChange,
}: {
  section: Section;
  onChange: (p: Record<string, unknown>) => void;
}) {
  switch (section.type) {
    case 'nav':
      return (
        <>
          <TextField label="Brand name" value={section.brand} onChange={(x) => onChange({ brand: x })} />
          <ItemsEditor
            label="Menu links"
            items={section.links}
            blank={linkBlank}
            onChange={(links) => onChange({ links })}
          >
            {(item, set) => <LinkFields item={item} set={set} />}
          </ItemsEditor>
        </>
      );
    case 'hero':
      return (
        <>
          <TextField label="Eyebrow (small label above)" value={section.eyebrow} onChange={(x) => onChange({ eyebrow: x })} placeholder="Optional" />
          <TextField label="Headline" value={section.title} onChange={(x) => onChange({ title: x })} />
          <AreaField label="Subtitle" value={section.subtitle} onChange={(x) => onChange({ subtitle: x })} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Button 1" value={section.ctaLabel} onChange={(x) => onChange({ ctaLabel: x })} />
            <TextField label="Button 1 link" value={section.ctaUrl} onChange={(x) => onChange({ ctaUrl: x })} placeholder="#contact" />
            <TextField label="Button 2" value={section.cta2Label} onChange={(x) => onChange({ cta2Label: x })} placeholder="Optional second button" />
            <TextField label="Button 2 link" value={section.cta2Url} onChange={(x) => onChange({ cta2Url: x })} placeholder="https://" />
          </div>
          <CheckField label="Center-align this section" checked={section.center} onChange={(x) => onChange({ center: x })} />
        </>
      );
    case 'text':
      return (
        <>
          <TextField label="Heading" value={section.title} onChange={(x) => onChange({ title: x })} />
          <AreaField
            label="Text (blank line starts a new paragraph)"
            value={section.body}
            onChange={(x) => onChange({ body: x })}
            rows={5}
          />
          <CheckField label="Center-align" checked={section.center} onChange={(x) => onChange({ center: x })} />
        </>
      );
    case 'images':
      return (
        <>
          <TextField label="Gallery heading" value={section.title} onChange={(x) => onChange({ title: x })} />
          <ItemsEditor
            label="Images (empty ones show as placeholders)"
            items={section.images}
            blank={() => ({ url: '', caption: '' })}
            onChange={(images) => onChange({ images })}
          >
            {(item, set) => (
              <>
                <input value={item.url} onChange={(e) => set({ url: e.target.value })} placeholder="Image URL (https://â€¦jpg)" className={`${inputCls} mb-1.5`} />
                <input value={item.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption (optional)" className={inputCls} />
              </>
            )}
          </ItemsEditor>
        </>
      );
    case 'features':
      return (
        <>
          <TextField label="Heading" value={section.title} onChange={(x) => onChange({ title: x })} />
          <TextField label="Subheading" value={section.subtitle} onChange={(x) => onChange({ subtitle: x })} placeholder="Optional" />
          <ItemsEditor
            label="Feature cards"
            items={section.items}
            blank={() => ({ icon: 'â­', title: 'New feature', body: 'Describe it here.' })}
            onChange={(items) => onChange({ items })}
          >
            {(item, set) => (
              <>
                <div className="grid grid-cols-[56px_1fr] gap-1.5 mb-1.5">
                  <input value={item.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="ðŸ’¡" className={inputCls} />
                  <input value={item.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title" className={inputCls} />
                </div>
                <textarea value={item.body} onChange={(e) => set({ body: e.target.value })} rows={2} placeholder="Description" className={`${inputCls} resize-y leading-relaxed`} />
              </>
            )}
          </ItemsEditor>
        </>
      );
    case 'testimonials':
      return (
        <>
          <TextField label="Heading" value={section.title} onChange={(x) => onChange({ title: x })} />
          <ItemsEditor
            label="Quotes"
            items={section.items}
            blank={() => ({ quote: 'Great experience!', name: 'New customer', role: 'Customer' })}
            onChange={(items) => onChange({ items })}
          >
            {(item, set) => (
              <>
                <textarea value={item.quote} onChange={(e) => set({ quote: e.target.value })} rows={2} placeholder="Quote" className={`${inputCls} resize-y leading-relaxed mb-1.5`} />
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={item.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" className={inputCls} />
                  <input value={item.role} onChange={(e) => set({ role: e.target.value })} placeholder="Role (optional)" className={inputCls} />
                </div>
              </>
            )}
          </ItemsEditor>
        </>
      );
    case 'contact':
      return (
        <>
          <TextField label="Heading" value={section.title} onChange={(x) => onChange({ title: x })} />
          <AreaField label="Subtitle" value={section.subtitle} onChange={(x) => onChange({ subtitle: x })} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Email address" value={section.email} onChange={(x) => onChange({ email: x })} placeholder="you@example.com" />
            <TextField label="Button label" value={section.buttonLabel} onChange={(x) => onChange({ buttonLabel: x })} placeholder="Email us" />
          </div>
        </>
      );
    case 'links':
      return (
        <>
          <TextField label="Your name / brand" value={section.title} onChange={(x) => onChange({ title: x })} />
          <TextField label="Short note" value={section.note} onChange={(x) => onChange({ note: x })} placeholder="All my links, one place." />
          <ItemsEditor label="Link buttons" items={section.links} blank={linkBlank} onChange={(links) => onChange({ links })}>
            {(item, set) => <LinkFields item={item} set={set} />}
          </ItemsEditor>
        </>
      );
    case 'footer':
      return (
        <>
          <TextField label="Brand / name" value={section.brand} onChange={(x) => onChange({ brand: x })} />
          <TextField label="Note (e.g. Â© 2026)" value={section.note} onChange={(x) => onChange({ note: x })} />
          <ItemsEditor label="Footer links" items={section.links} blank={linkBlank} onChange={(links) => onChange({ links })}>
            {(item, set) => <LinkFields item={item} set={set} />}
          </ItemsEditor>
        </>
      );
    case 'legacy':
      return null;
  }
  return null;
}
