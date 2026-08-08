'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CopyButton } from '../CopyButton';
import { VerifiedBadge } from '../VerifiedBadge';

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
  expected: string;
  found: string[] | null;
  verified: boolean;
  detail: string;
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-success-soft text-success border-success-border',
  pending: 'bg-warning-soft text-warning border-warning-border',
  partial: 'bg-info-soft text-info border-info-border',
  failed: 'bg-danger-soft text-danger border-danger-border',
};

const STATUS_LABEL: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  partial: 'Partially verified',
  failed: 'Failed',
};

const RECORD_ORDER: Array<'DOMAIN' | 'NS' | 'SPF' | 'DKIM' | 'DMARC'> = ['DOMAIN', 'NS', 'SPF', 'DKIM', 'DMARC'];

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [domain, setDomain] = useState<Domain | null>(null);
  const [checks, setChecks] = useState<DnsCheck[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'records' | 'configuration'>('records');

  const applyVerification = useCallback(
    (payload: { id: string; verification?: { domain?: Domain; checks?: DnsCheck[] } }) => {
      if (payload.id !== id) return;
      const v = payload.verification;
      if (v?.domain) setDomain(v.domain);
      if (v?.checks) setChecks(v.checks);
      setChecking(false);
    },
    [id]
  );

  // Fetch the domain
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/domains/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.domain) {
          setDomain(data.domain);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setError('Could not reach the server.');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Realtime SSE for this domain
  useEffect(() => {
    const es = new EventSource('/api/domains/events');
    es.onopen = () => setConnected(true);
    es.addEventListener('domain-updated', (e) => {
      try {
        applyVerification(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [applyVerification]);

  async function verifyDomain() {
    setChecking(true);
    setChecks(null);
    try {
      const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.domain) setDomain(data.domain);
      if (data.checks) setChecks(data.checks);
    } catch {
      setError('Could not run DNS verification.');
    } finally {
      setChecking(false);
    }
  }

  async function deleteDomain() {
    if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) return;
    try {
      await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      router.push('/overview/domains');
      router.refresh();
    } catch {
      setError('Could not delete the domain.');
    }
  }

  if (notFound) {
    return (
      <div className="space-y-8">
        <div className="border border-canvas-border bg-canvas-raised/80 p-10 text-center">
          <p className="text-slate-400">Domain not found.</p>
          <button
            onClick={() => router.push('/overview/domains')}
            className="mt-4 bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
          >
            Back to Domains
          </button>
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="space-y-8">
        <div className="border border-canvas-border bg-canvas-raised/80 p-10 text-center">
          <p className="text-slate-400">Loading domain…</p>
        </div>
      </div>
    );
  }

  const verifiedCount = checks
    ? checks.filter((c) => c.verified).length
    : [domain.spf_verified, domain.dkim_verified, domain.dmarc_verified].filter(Boolean).length;

  const domainChecks = checks ?? RECORD_ORDER.map((type) => ({
    type,
    hostname:
      type === 'DKIM'
        ? `${domain.dkim_record_name}.${domain.name}`
        : type === 'DMARC'
          ? `_dmarc.${domain.name}`
          : domain.name,
    expected:
      type === 'SPF'
        ? domain.spf_record
        : type === 'DKIM'
          ? domain.dkim_record_value
          : type === 'DMARC'
            ? domain.dmarc_record
            : type === 'DOMAIN'
              ? 'Domain exists in public DNS'
              : 'Authoritative nameservers resolvable',
    found: null,
    verified:
      type === 'SPF'
        ? domain.spf_verified
        : type === 'DKIM'
          ? domain.dkim_verified
          : type === 'DMARC'
            ? domain.dmarc_verified
            : false,
    detail: '',
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div>
        <button
          onClick={() => router.push('/overview/domains')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Domains
        </button>
      </div>

      {/* Header */}
      <div className="border border-canvas-border bg-canvas-raised p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-canvas-border">
              <span className="material-symbols-outlined text-2xl text-brand-300">dns</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{domain.name}</h1>
                {domain.status === 'verified' && <VerifiedBadge size={22} />}
              </div>
              <p className="text-sm text-slate-500">
                Domain · {domain.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={verifyDomain}
              disabled={checking}
              className="bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-wait"
            >
              {checking ? 'Verifying…' : 'Restart'}
            </button>
            <button
              onClick={deleteDomain}
              className="border border-canvas-border px-4 py-2 text-sm font-medium text-slate-400 hover:bg-brand/10 hover:text-white transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Created</p>
            <p className="mt-0.5 text-slate-200">{new Date(domain.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
            <span className={`mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[domain.status] || 'bg-slate-500/15 text-slate-400 border-slate-600'}`}>
              {STATUS_LABEL[domain.status] || domain.status}
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Region</p>
            <p className="mt-0.5 text-slate-200">Global</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Live status</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-slate-200">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {connected ? 'Connected' : 'Reconnecting…'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-canvas-border">
        {(['records', 'configuration'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'records' ? 'Records' : 'Configuration'}
            {activeTab === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'records' ? (
        <>
          {/* Status overview */}
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">DNS Records</h2>
              <span className="text-sm text-slate-400">
                {verifiedCount} of 3 records verified
              </span>
            </div>

            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success transition-all duration-500 shadow-glow"
                  style={{ width: `${(verifiedCount / 3) * 100}%` }}
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {domainChecks.map((check) => (
                  <div
                    key={check.type}
                    className={`border p-5 ${
                      check.verified
                        ? 'border-success-border bg-success-soft'
                        : check.found && check.found.length > 0
                          ? 'border-danger-border bg-danger-soft'
                          : 'border-canvas-border bg-canvas/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {check.type}
                      </span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                          check.verified
                            ? 'bg-success-soft text-success'
                            : 'bg-brand-950 text-slate-500'
                        }`}
                      >
                        {check.verified ? '✓' : '—'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{check.detail || 'Not checked yet.'}</p>
                    <p className="mt-2 truncate font-mono text-xs text-slate-500">{check.hostname}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Domain Verification — DKIM */}
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <h2 className="text-lg font-semibold text-white">Domain Verification</h2>
            <h3 className="mt-1 text-sm font-medium text-slate-400">DKIM</h3>

            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Content</th>
                  <th className="px-3 py-2.5">TTL</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-canvas-border/60">
                  <td className="px-3 py-3">
                    <span className="rounded border border-canvas-border bg-canvas px-2 py-0.5 font-mono text-xs text-slate-300">TXT</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-slate-200 break-all">{domain.dkim_record_name}.{domain.name}</code>
                      <CopyButton text={`${domain.dkim_record_name}.${domain.name}`} label="DKIM record name" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[260px] truncate font-mono text-xs text-slate-300">{domain.dkim_record_value}</code>
                      <CopyButton text={domain.dkim_record_value} label="DKIM record value" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400">Auto</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs font-semibold ${domain.dkim_verified ? 'text-success' : 'text-warning'}`}>
                      {domain.dkim_verified ? 'verified' : 'pending'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Enable Sending — SPF */}
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <h2 className="text-lg font-semibold text-white">Enable Sending</h2>
            <h3 className="mt-1 text-sm font-medium text-slate-400">SPF</h3>

            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Content</th>
                  <th className="px-3 py-2.5">TTL</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-canvas-border/60">
                  <td className="px-3 py-3">
                    <span className="rounded border border-canvas-border bg-canvas px-2 py-0.5 font-mono text-xs text-slate-300">TXT</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-slate-200 break-all">@{domain.name}</code>
                      <CopyButton text={`@${domain.name}`} label="SPF record name" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[260px] truncate font-mono text-xs text-slate-300">{domain.spf_record}</code>
                      <CopyButton text={domain.spf_record} label="SPF record value" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400">Auto</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs font-semibold ${domain.spf_verified ? 'text-success' : 'text-warning'}`}>
                      {domain.spf_verified ? 'verified' : 'pending'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* DMARC */}
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <h2 className="text-lg font-semibold text-white">DMARC</h2>
            <p className="mt-1 text-sm text-slate-400">
              DMARC helps protect your domain from spoofing. Add this record to your DNS provider.
            </p>

            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Content</th>
                  <th className="px-3 py-2.5">TTL</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-canvas-border/60">
                  <td className="px-3 py-3">
                    <span className="rounded border border-canvas-border bg-canvas px-2 py-0.5 font-mono text-xs text-slate-300">TXT</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-slate-200 break-all">_dmarc.{domain.name}</code>
                      <CopyButton text={`_dmarc.${domain.name}`} label="DMARC record name" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[260px] truncate font-mono text-xs text-slate-300">{domain.dmarc_record}</code>
                      <CopyButton text={domain.dmarc_record} label="DMARC record value" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400">Auto</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs font-semibold ${domain.dmarc_verified ? 'text-success' : 'text-warning'}`}>
                      {domain.dmarc_verified ? 'verified' : 'pending'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <>
          {/* Configuration */}
          <section className="border border-canvas-border bg-canvas-raised p-6">
            <h2 className="mb-5 text-lg font-semibold text-white">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-canvas-border bg-canvas/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Created</p>
                <p className="mt-1 text-sm text-slate-200">{new Date(domain.created_at).toLocaleString()}</p>
              </div>
              <div className="border border-canvas-border bg-canvas/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Verified</p>
                <p className="mt-1 text-sm text-slate-200">
                  {domain.verified_at ? new Date(domain.verified_at).toLocaleString() : 'Not verified yet'}
                </p>
              </div>
              <div className="border border-canvas-border bg-canvas/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Last checked</p>
                <p className="mt-1 text-sm text-slate-200">
                  {domain.last_checked_at ? new Date(domain.last_checked_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="border border-canvas-border bg-canvas/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Domain ID</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-200">{domain.id}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}