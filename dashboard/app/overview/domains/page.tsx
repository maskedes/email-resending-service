'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CopyButton } from './CopyButton';
import { VerifiedBadge } from './VerifiedBadge';

interface Domain {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed' | 'partial';
  dkim_record_name: string;
  dkim_record_value: string;
  spf_record: string;
  dmarc_record: string;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  last_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
}

interface DnsCheck {
  type: 'DOMAIN' | 'NS' | 'SPF' | 'DKIM' | 'DMARC';
  hostname: string;
  verified: boolean;
  detail: string;
}

interface VerificationPayload {
  id: string;
  verification?: {
    domain?: Domain;
    checks?: DnsCheck[];
    overall?: string;
  };
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [checks, setChecks] = useState<Record<string, DnsCheck[]>>({});
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [newDomain, setNewDomain] = useState<Domain | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const applyVerification = useCallback((payload: VerificationPayload) => {
    const v = payload.verification;
    if (!v) return;

    if (v.domain) {
      setDomains((prev) => {
        const exists = prev.some((d) => d.id === v.domain!.id);
        return exists
          ? prev.map((d) => (d.id === v.domain!.id ? v.domain! : d))
          : [v.domain!, ...prev];
      });
    }
    if (v.checks) {
      setChecks((prev) => ({ ...prev, [payload.id]: v.checks! }));
    }
    setCheckingIds((prev) => {
      const next = new Set(prev);
      next.delete(payload.id);
      return next;
    });
  }, []);

  // Connect to the realtime SSE stream
  useEffect(() => {
    const es = new EventSource('/api/domains/events');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.addEventListener('domain-updated', (e) => {
      try {
        applyVerification(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore malformed payload */
      }
    });
    es.addEventListener('domain-deleted', (e) => {
      try {
        const { id } = JSON.parse((e as MessageEvent).data);
        setDomains((prev) => prev.filter((d) => d.id !== id));
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [applyVerification]);

  async function fetchDomains() {
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      if (data.data) setDomains(data.data);
    } catch {
      // Silently fail
    }
  }

  useEffect(() => {
    fetchDomains();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setNewDomain(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (data.domain) {
        setNewDomain(data.domain);
        setName('');
        await fetchDomains();
      } else {
        setError(data.error?.message || 'Failed to add domain.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setCreating(false);
    }
  }

  async function verifyDomain(id: string) {
    setCheckingIds((prev) => new Set(prev).add(id));
    setChecks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      // SSE will also update us; fall back to direct response if SSE is down.
      if (data.domain) {
        setDomains((prev) => prev.map((d) => (d.id === id ? data.domain : d)));
        if (data.checks) setChecks((prev) => ({ ...prev, [id]: data.checks }));
      }
    } catch {
      // Error handling
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteDomain(id: string) {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) return;
    try {
      await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      await fetchDomains();
    } catch {
      // Error handling
    }
  }

  const STATUS_STYLES: Record<string, string> = {
    verified: 'bg-success-soft text-success',
    pending: 'bg-warning-soft text-warning',
    partial: 'bg-info-soft text-info',
    failed: 'bg-danger-soft text-danger',
  };

  const RECORD_STYLES: Record<string, string> = {
    DOMAIN: 'bg-success-soft text-success border-success-border',
    NS: 'bg-success-soft text-success border-success-border',
    SPF: 'bg-success-soft text-success border-success-border',
    DKIM: 'bg-success-soft text-success border-success-border',
    DMARC: 'bg-success-soft text-success border-success-border',
  };
  const RECORD_PENDING: Record<string, string> = {
    DOMAIN: 'bg-warning-soft text-warning border-warning-border',
    NS: 'bg-warning-soft text-warning border-warning-border',
    SPF: 'bg-warning-soft text-warning border-warning-border',
    DKIM: 'bg-warning-soft text-warning border-warning-border',
    DMARC: 'bg-warning-soft text-warning border-warning-border',
  };
  const RECORD_MISSING: Record<string, string> = {
    DOMAIN: 'bg-canvas text-slate-500 border-canvas-border',
    NS: 'bg-canvas text-slate-500 border-canvas-border',
    SPF: 'bg-canvas text-slate-500 border-canvas-border',
    DKIM: 'bg-canvas text-slate-500 border-canvas-border',
    DMARC: 'bg-canvas text-slate-500 border-canvas-border',
  };

  function recordBadge(domain: Domain, type: 'DOMAIN' | 'NS' | 'SPF' | 'DKIM' | 'DMARC') {
    const live = checks[domain.id]?.find((c) => c.type === type);
    const flagMap = { SPF: domain.spf_verified, DKIM: domain.dkim_verified, DMARC: domain.dmarc_verified };
    const stored = flagMap[type as keyof typeof flagMap];
    const verified = live ? live.verified : stored ?? false;
    const style = live
      ? verified
        ? RECORD_STYLES[type]
        : RECORD_MISSING[type]
      : verified
        ? RECORD_STYLES[type]
        : RECORD_PENDING[type];
    const label = live
      ? verified
        ? `${type} ✓`
        : `${type} —`
      : verified
        ? `${type} ✓`
        : `${type} pending`;
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-center text-xs font-semibold min-w-20 ${style}`}
      >
        {label}
      </span>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Domains</h1>
          <p className="mt-1 text-slate-400">Add and verify domains to send emails with your own domain.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-canvas-border bg-canvas-raised px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-400">
            {connected ? 'Live — realtime DNS checks' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {/* Add Domain Form */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Add Domain</h2>

        {newDomain && (
          <div className="mb-5 border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300 mb-3">
              Domain added! Add these DNS records to verify ownership:
            </p>
            <div className="space-y-3 text-sm">
              <div className="border border-canvas-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">DKIM (TXT)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="flex-1 font-mono text-slate-300 break-all">{newDomain.dkim_record_name}</code>
                  <CopyButton text={newDomain.dkim_record_name} label="DKIM record name" />
                </div>
                <code className="block mt-1 font-mono text-slate-400 break-all">{newDomain.dkim_record_value}</code>
              </div>
              <div className="border border-canvas-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">SPF (TXT)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="flex-1 font-mono text-slate-300 break-all">@{newDomain.name}</code>
                  <CopyButton text={`@${newDomain.name}`} label="SPF record name" />
                </div>
                <code className="block mt-1 font-mono text-slate-400 break-all">{newDomain.spf_record}</code>
              </div>
              <div className="border border-canvas-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">DMARC (TXT)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="flex-1 font-mono text-slate-300 break-all">_dmarc.{newDomain.name}</code>
                  <CopyButton text={`_dmarc.${newDomain.name}`} label="DMARC record name" />
                </div>
                <code className="block mt-1 font-mono text-slate-400 break-all">{newDomain.dmarc_record}</code>
              </div>
            </div>
            <button
              onClick={() => setNewDomain(null)}
              className="mt-4 text-sm text-brand hover:underline"
            >
              Got it, I'll verify later
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-slate-400">Domain Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="example.com"
              required
              disabled={creating}
              className="w-full border border-canvas-border bg-canvas px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-brand disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full md:w-auto bg-brand px-6 py-2.5 font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Adding…' : 'Add Domain'}
          </button>
        </form>
      </section>

      {/* Domains List */}
      <section className="border border-canvas-border bg-canvas-raised p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Your Domains</h2>

        {domains.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">No domains added yet. Add your first domain above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => {
              const checking = checkingIds.has(domain.id);
              return (
              <div
                key={domain.id}
                className="border border-canvas-border bg-canvas/50 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center bg-canvas-border">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/overview/domains/${domain.id}`}
                          className="font-medium text-white hover:text-brand transition-colors"
                        >
                          {domain.name}
                        </Link>
                        {domain.status === 'verified' && <VerifiedBadge />}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {recordBadge(domain, 'DOMAIN')}
                        {recordBadge(domain, 'NS')}
                        {recordBadge(domain, 'SPF')}
                        {recordBadge(domain, 'DKIM')}
                        {recordBadge(domain, 'DMARC')}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {checking
                          ? 'Checking DNS records…'
                          : domain.last_checked_at
                            ? `Last checked ${new Date(domain.last_checked_at).toLocaleString()}`
                            : `Added ${new Date(domain.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[domain.status] || 'bg-slate-500/15 text-slate-400'
                      }`}
                    >
                      {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                    </span>

                    <button
                      onClick={() => verifyDomain(domain.id)}
                      disabled={checking}
                      className="bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {checking ? 'Verifying…' : 'Verify DNS'}
                    </button>

                    <button
                      onClick={() => deleteDomain(domain.id)}
                      className="border border-canvas-border px-4 py-1.5 text-sm font-medium text-slate-400 hover:bg-canvas-border hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Per-record realtime results */}
                {checks[domain.id] && (
                  <div className="mt-4 space-y-2">
                    {checks[domain.id].map((check) => (
                      <div
                        key={check.type}
                        className={`flex flex-col gap-1 border px-3 py-2 text-xs ${
                          check.verified
                            ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                            : 'border-red-500/20 bg-red-500/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              check.verified ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {check.type} {check.verified ? '✓' : '✗'}
                          </span>
                          <code className="font-mono text-slate-500">{check.hostname}</code>
                        </div>
                        <p className="text-slate-400">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* DNS Records */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-white">
                    View DNS Records
                  </summary>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="border border-canvas-border bg-canvas p-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">DKIM (TXT)</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="flex-1 font-mono text-slate-300 break-all">{domain.dkim_record_name}</code>
                        <CopyButton text={domain.dkim_record_name} label="DKIM record name" />
                      </div>
                      <code className="block mt-1 font-mono text-slate-400 break-all">{domain.dkim_record_value}</code>
                    </div>
                    <div className="border border-canvas-border bg-canvas p-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">SPF (TXT)</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="flex-1 font-mono text-slate-300 break-all">@{domain.name}</code>
                        <CopyButton text={`@${domain.name}`} label="SPF record name" />
                      </div>
                      <code className="block mt-1 font-mono text-slate-400 break-all">{domain.spf_record}</code>
                    </div>
                    <div className="border border-canvas-border bg-canvas p-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">DMARC (TXT)</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="flex-1 font-mono text-slate-300 break-all">_dmarc.{domain.name}</code>
                        <CopyButton text={`_dmarc.${domain.name}`} label="DMARC record name" />
                      </div>
                      <code className="block mt-1 font-mono text-slate-400 break-all">{domain.dmarc_record}</code>
                    </div>
                  </div>
                </details>
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}