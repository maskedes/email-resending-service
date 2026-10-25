'use client';

import { useState, useEffect, useCallback } from 'react';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/emailTemplates';

type Mode = 'library' | 'mine' | 'custom';

interface MyTemplate {
  id: string;
  api_key_id: string;
  name: string;
  subject: string;
  html: string | null;
  text: string | null;
  created_at: string;
}

interface ApiKeyOption {
  id: string;
  name: string;
  email: string;
}

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function extractVariables(...texts: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    let m: RegExpExecArray | null;
    VAR_RE.lastIndex = 0;
    while ((m = VAR_RE.exec(t)) !== null) set.add(m[1]);
  }
  return Array.from(set);
}

function renderTemplate(text: string, values: Record<string, string>): string {
  if (!text) return '';
  return text.replace(VAR_RE, (_, k: string) => (values[k] !== undefined ? values[k] : ''));
}

export default function TemplatesPage() {
  const [mode, setMode] = useState<Mode>('library');

  // Library mode
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);

  // Mine mode
  const [myTemplates, setMyTemplates] = useState<MyTemplate[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[]>([]);
  const [mineLoaded, setMineLoaded] = useState(false);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);

  // Editor (new / edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [edApiKeyId, setEdApiKeyId] = useState('');
  const [edName, setEdName] = useState('');
  const [edSubject, setEdSubject] = useState('');
  const [edHtml, setEdHtml] = useState('');
  const [edText, setEdText] = useState('');
  const [edSaving, setEdSaving] = useState(false);
  const [edError, setEdError] = useState<string | null>(null);

  // Custom compose mode
  const [apiKey, setApiKey] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const selected: EmailTemplate | undefined = EMAIL_TEMPLATES.find((t) => t.id === selectedId);

  function copy(text: string, which: 'subject' | 'body') {
    try {
      navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    setMineError(null);
    try {
      const [tRes, kRes] = await Promise.all([fetch('/api/templates'), fetch('/api/apikeys')]);
      const tJson = await tRes.json().catch(() => ({}));
      const kJson = await kRes.json().catch(() => ({}));
      setMyTemplates(tJson.data || []);
      setApiKeys(kJson.data || []);
      setMineLoaded(true);
    } catch {
      setMineError('Failed to load your templates.');
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'mine' && !mineLoaded && !mineLoading) {
      loadMine();
    }
  }, [mode, mineLoaded, mineLoading, loadMine]);

  function openNewEditor() {
    setEditingId(null);
    setEdApiKeyId(apiKeys[0]?.id || '');
    setEdName('');
    setEdSubject('');
    setEdHtml('');
    setEdText('');
    setEdError(null);
    setEditorOpen(true);
  }

  function openEditEditor(t: MyTemplate) {
    setEditingId(t.id);
    setEdApiKeyId(t.api_key_id);
    setEdName(t.name);
    setEdSubject(t.subject);
    setEdHtml(t.html || '');
    setEdText(t.text || '');
    setEdError(null);
    setEditorOpen(true);
  }

  async function saveEditor() {
    setEdSaving(true);
    setEdError(null);
    try {
      const payload = {
        name: edName,
        subject: edSubject,
        html: edHtml,
        text: edText,
        apiKeyId: edApiKeyId,
      };
      const res = await fetch(
        editingId ? `/api/templates/${editingId}` : '/api/templates',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEdError(data?.error?.message || 'Failed to save template.');
        return;
      }
      setEditorOpen(false);
      setMineLoaded(false); // force reload
      loadMine();
    } catch {
      setEdError('Network error. Please try again.');
    } finally {
      setEdSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMineLoaded(false);
        loadMine();
      }
    } catch {
      /* ignore */
    }
  }

  async function duplicateTemplate(t: MyTemplate) {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Copy of ${t.name}`,
          subject: t.subject,
          html: t.html || '',
          text: t.text || '',
          apiKeyId: t.api_key_id,
        }),
      });
      if (res.ok) {
        setMineLoaded(false);
        loadMine();
      }
    } catch {
      /* ignore */
    }
  }

  // Load a template (built-in or user) into the custom composer.
  function useTemplate(opts: { subject: string; html?: string | null; text?: string | null }) {
    setSubject(opts.subject);
    setHtml(opts.html || '');
    setText(opts.text || '');
    const vars = extractVariables(opts.subject, opts.html, opts.text);
    setVariables(vars);
    setVariableValues({});
    setResult(null);
    setMode('custom');
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const renderedSubject = renderTemplate(subject, variableValues);
    const renderedHtml = renderTemplate(html, variableValues);
    const renderedText = renderTemplate(text, variableValues);

    if (!apiKey || !to || !renderedSubject || (!renderedHtml && !renderedText)) {
      setResult({
        ok: false,
        message: 'API key, To, Subject and content (HTML or Text) are required.',
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          from,
          to,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, message: data?.error?.message || 'Failed to send email.' });
        return;
      }
      setResult({ ok: true, message: `Email queued successfully (ID: ${data?.id || 'n/a'}).` });
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  const labelCls = 'mb-1.5 block text-sm text-slate-400';
  const inputCls =
    'w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand';

  const tabBtn = (m: Mode, label: string) =>
    `rounded-md px-4 py-2 text-sm font-medium transition ${
      mode === m ? 'bg-brand text-black' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Templates</h1>
          <p className="mt-1 text-slate-400">
            Start from a professional template, write your own, or reuse templates you have saved.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex shrink-0 rounded-lg border border-canvas-border bg-canvas p-1">
          <button type="button" onClick={() => setMode('library')} className={tabBtn('library', 'Template Library')}>
            Template Library
          </button>
          <button type="button" onClick={() => setMode('mine')} className={tabBtn('mine', 'My Templates')}>
            My Templates
          </button>
          <button type="button" onClick={() => setMode('custom')} className={tabBtn('custom', 'Custom Email')}>
            Custom Email
          </button>
        </div>
      </div>

      {mode === 'library' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="border border-canvas-border bg-canvas-raised p-6 lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-white">Template Library</h2>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {EMAIL_TEMPLATES.map((t) => {
                const active = selectedId === t.id;
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
                        active
                          ? 'border-brand/60 bg-brand/10 text-white'
                          : 'border-canvas-border text-slate-300 hover:border-brand/60 hover:bg-brand/5'
                      }`}
                    >
                      <span className="font-medium">{t.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => useTemplate({ subject: t.subject, html: null, text: t.body })}
                      className="shrink-0 rounded-lg border border-canvas-border px-3 py-3 text-xs font-medium text-brand transition hover:border-brand/60 hover:bg-brand/5"
                      title="Use this template"
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border border-canvas-border bg-canvas-raised p-6 lg:col-span-2">
            <h2 className="mb-5 text-lg font-semibold text-white">Preview</h2>
            {!selected ? (
              <p className="text-slate-500">Select a template from the library to preview its content.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Subject</label>
                    <button
                      type="button"
                      onClick={() => copy(selected.subject, 'subject')}
                      className="text-xs text-brand transition-colors hover:text-brand/80"
                    >
                      {copied === 'subject' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="border border-canvas-border bg-canvas px-4 py-2.5 text-white">
                    {selected.subject}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Body</label>
                    <button
                      type="button"
                      onClick={() => copy(selected.body, 'body')}
                      className="text-xs text-brand transition-colors hover:text-brand/80"
                    >
                      {copied === 'body' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap border border-canvas-border bg-canvas px-4 py-3 font-mono text-sm leading-relaxed text-slate-300">
                    {selected.body}
                  </pre>
                </div>

                <p className="text-xs text-slate-500">
                  Replace the bracketed placeholders (e.g.{' '}
                  <code className="text-slate-400">[Your Name]</code>) with your own details before
                  sending.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {mode === 'mine' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Saved Templates</h2>
            <button
              type="button"
              onClick={openNewEditor}
              disabled={apiKeys.length === 0}
              className="bg-brand px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              title={apiKeys.length === 0 ? 'Create an API key first' : 'New template'}
            >
              + New Template
            </button>
          </div>

          {apiKeys.length === 0 && (
            <p className="mb-4 py-10 text-center text-sm text-slate-400">
              You need at least one API key before you can save a template.
            </p>
          )}

          {mineLoading ? (
            <p className="text-slate-400">Loading…</p>
          ) : mineError ? (
            <p className="text-red-300">{mineError}</p>
          ) : myTemplates.length === 0 ? (
            <p className="text-slate-500">You have no saved templates yet.</p>
          ) : (
            <div className="space-y-3">
              {myTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border border-canvas-border bg-canvas-raised p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="truncate text-sm text-slate-400">{t.subject}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {extractVariables(t.subject, t.html, t.text).length > 0
                        ? `Variables: ${extractVariables(t.subject, t.html, t.text).join(', ')}`
                        : 'No variables'}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => useTemplate({ subject: t.subject, html: t.html, text: t.text })}
                      className="rounded-lg border border-brand/50 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/10"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateTemplate(t)}
                      className="rounded-lg border border-canvas-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand/60 hover:bg-brand/5"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditEditor(t)}
                      className="rounded-lg border border-canvas-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand/60 hover:bg-brand/5"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editor modal */}
          {editorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-2xl overflow-y-auto rounded-xl border border-canvas-border bg-canvas-raised p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">
                  {editingId ? 'Edit Template' : 'New Template'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Sender API Key</label>
                    <select
                      value={edApiKeyId}
                      onChange={(e) => setEdApiKeyId(e.target.value)}
                      className={inputCls}
                    >
                      {apiKeys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({k.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Name</label>
                    <input
                      value={edName}
                      onChange={(e) => setEdName(e.target.value)}
                      placeholder="Welcome Email"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Subject</label>
                    <input
                      value={edSubject}
                      onChange={(e) => setEdSubject(e.target.value)}
                      placeholder="Welcome to {{app_name}}"
                      className={inputCls}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Use <code className="text-slate-400">{'{{variable}}'}</code> placeholders for
                      dynamic content (e.g. <code className="text-slate-400">{'{{user_name}}'}</code>).
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>HTML Body</label>
                    <textarea
                      value={edHtml}
                      onChange={(e) => setEdHtml(e.target.value)}
                      rows={8}
                      placeholder="<h1>Hello {{user_name}}</h1>"
                      className={`${inputCls} font-mono text-sm`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Text Body</label>
                    <textarea
                      value={edText}
                      onChange={(e) => setEdText(e.target.value)}
                      rows={5}
                      placeholder="Hello {{user_name}}, welcome to {{app_name}}!"
                      className={`${inputCls} font-mono text-sm`}
                    />
                  </div>

                  {edError && (
                    <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {edError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorOpen(false)}
                      className="rounded-lg border border-canvas-border px-4 py-2 text-sm text-slate-300 transition hover:bg-brand/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEditor}
                      disabled={edSaving}
                      className="bg-brand px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand/90 disabled:opacity-50"
                    >
                      {edSaving ? 'Saving…' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <form onSubmit={handleSend} className="space-y-6">
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <h2 className="mb-5 text-lg font-semibold text-white">Compose Your Email</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fms_..."
                  className={inputCls}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Your API key from the API Keys page. It is sent only to the email service to
                  authenticate the send.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>From</label>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="hello@yourdomain.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>To</label>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="user@example.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className={inputCls}
                />
              </div>

              {variables.length > 0 && (
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
                  <div className="mb-2 text-sm font-medium text-white">Template Variables</div>
                  <p className="mb-3 text-xs text-slate-400">
                    Provide a value for each variable. They are rendered into the email when sent.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variables.map((v) => (
                      <div key={v}>
                        <label className="mb-1 block text-xs text-slate-400">{`{{${v}}}`}</label>
                        <input
                          value={variableValues[v] || ''}
                          onChange={(e) =>
                            setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                          placeholder={`Value for ${v}`}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>HTML Body</label>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={10}
                  placeholder="<h1>Hello!</h1><p>Your message</p>"
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>

              <div>
                <label className={labelCls}>Text Body</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="Plain-text version of your message"
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>

              {result && (
                <div
                  className={`border p-4 text-sm ${
                    result.ok
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  {result.message}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="bg-brand px-6 py-2.5 font-medium text-black transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}
