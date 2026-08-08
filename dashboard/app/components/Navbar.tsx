'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/* ─── Chevron icon ─── */
const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`ml-0.5 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* ─── Mobile menu icon ─── */
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Dropdown data ─── */
const featuresItems = [
  { label: 'REST API', desc: 'Simple JSON API to send emails', icon: '⚡' },
  { label: 'SMTP Relay', desc: 'Connect your own Postfix relay', icon: '📮' },
  { label: 'API Key Auth', desc: 'HMAC-signed keys with full CRUD', icon: '🔑' },
  { label: 'Delivery Tracking', desc: 'Real-time queue and delivery logs', icon: '📊' },
  { label: 'BullMQ Queue', desc: 'Redis-backed workers & retries', icon: '🔄' },
  { label: 'Self-Hosted', desc: 'Run on your own server', icon: '🖥️' },
];

const developerItems = [
  { label: 'Documentation', desc: 'Getting started guides', icon: '📖' },
  { label: 'API Reference', desc: 'Full REST API docs', icon: '📘' },
  { label: 'GitHub', desc: 'Source code & issues', icon: '🐙', href: 'https://github.com/maskedes/email-resending-service' },
  { label: 'Self-Hosted Setup', desc: 'Deploy on your server', icon: '🚀' },
];

/* ─── Dropdown hook ─── */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return { open, setOpen, ref };
}

/* ─── Dropdown menu component ─── */
function Dropdown({ label, items, dd }: {
  label: string;
  items: { label: string; desc: string; icon: string; href?: string }[];
  dd: ReturnType<typeof useDropdown>;
}) {
  return (
    <div className="relative" ref={dd.ref}>
      <button
        onClick={() => dd.setOpen(!dd.open)}
        className="flex h-[58px] items-center gap-1.5 px-3 py-1 text-sm font-medium text-slate-400 transition duration-150 hover:text-white select-none"
      >
        {label}
        <Chevron open={dd.open} />
      </button>

      {dd.open && (
            <div className="absolute left-1/2 top-full z-50 mt-1 w-[340px] -translate-x-1/2 border border-canvas-border bg-canvas-raised p-2 shadow-2xl shadow-black/40">
          {items.map((item) =>
            item.href ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener"
                onClick={() => dd.setOpen(false)}
                className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-brand/10"
              >
                <span className="mt-0.5 text-base">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              </a>
            ) : (
              <a
                key={item.label}
                href={`#${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => dd.setOpen(false)}
                className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-brand/10"
              >
                <span className="mt-0.5 text-base">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main navbar ─── */
export default function Navbar() {
  const featuresDD = useDropdown();
  const developersDD = useDropdown();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full">
      {/* Gradient line at bottom of navbar */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />

      {/* Frosted glass background */}
<div className="absolute inset-0 bg-canvas-raised" />

      <div className="relative mx-auto flex h-[58px] w-full max-w-7xl items-center px-6">
        {/* ── Logo ── */}
        <div className="flex flex-1">
          <Link href="/" className="flex items-center gap-2 py-1 text-lg font-semibold tracking-tight text-white transition duration-150">
            <img src="/logo-icon.svg" alt="E-NVOY" className="h-8 w-8" />
            <span>E-NVOY</span>
          </Link>
        </div>

        {/* ── Desktop tabs ── */}
        <ul className="hidden items-center md:flex">
          <li><Dropdown label="Features" items={featuresItems} dd={featuresDD} /></li>
          <li><Dropdown label="Developers" items={developerItems} dd={developersDD} /></li>
          <li>
            <Link
              href="#pricing"
              className="flex h-[58px] items-center px-4 py-1 text-sm font-medium text-slate-400 transition duration-150 hover:text-white"
            >
              Pricing
            </Link>
          </li>
        </ul>

        {/* ── Right side buttons ── */}
        <div className="flex flex-1 justify-end gap-3">
          <Link
            href="/login"
            className="hidden items-center border border-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition duration-200 hover:text-white lg:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="relative inline-flex items-center justify-center overflow-hidden border border-white/10 bg-canvas-raised px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/90 hover:text-black hover:shadow-lg"
          >
            Get started
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="inline-flex items-center justify-center p-1 text-slate-400 transition hover:text-white md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="relative border-t border-canvas-border/50 bg-canvas-raised md:hidden">
          <div className="mx-auto max-w-7xl px-6 py-4 space-y-1">
            <div className="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Features</div>
            {featuresItems.map((item) => (
              <a
                key={item.label}
                href={`#${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 transition hover:bg-brand/10 hover:text-white"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}

            <div className="pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Developers</div>
            {developerItems.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 transition hover:bg-brand/10 hover:text-white"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ) : (
                <a
                  key={item.label}
                  href={`#${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 transition hover:bg-brand/10 hover:text-white"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              )
            )}

            <div className="pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
