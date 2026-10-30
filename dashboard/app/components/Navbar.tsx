'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  RestApiIcon,
  SmtpIcon,
  ApiKeyIcon,
  DeliveryTrackingIcon,
  BullMqIcon,
  SelfHostedIcon,
} from './FeatureIcons';

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

/* ─── Developer dropdown icons ─── */
const DocsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1.13em" height="1em" viewBox="0 0 576 512" aria-hidden="true">
    <path d="M0 0h576v512H0z" fill="none" />
    <path fill="currentColor" d="M528.3 46.5H388.5c-48.1 0-89.9 33.3-100.4 80.3c-10.6-47-52.3-80.3-100.4-80.3H48c-26.5 0-48 21.5-48 48v245.8c0 26.5 21.5 48 48 48h89.7c102.2 0 132.7 24.4 147.3 75c.7 2.8 5.2 2.8 6 0c14.7-50.6 45.2-75 147.3-75H528c26.5 0 48-21.5 48-48V94.6c0-26.4-21.3-47.9-47.7-48.1M242 311.9c0 1.9-1.5 3.5-3.5 3.5H78.2c-1.9 0-3.5-1.5-3.5-3.5V289c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5v22.9zm0-60.9c0 1.9-1.5 3.5-3.5 3.5H78.2c-1.9 0-3.5-1.5-3.5-3.5v-22.9c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5V251zm0-60.9c0 1.9-1.5 3.5-3.5 3.5H78.2c-1.9 0-3.5-1.5-3.5-3.5v-22.9c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5v22.9zm259.3 121.7c0 1.9-1.5 3.5-3.5 3.5H337.5c-1.9 0-3.5-1.5-3.5-3.5v-22.9c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5v22.9zm0-60.9c0 1.9-1.5 3.5-3.5 3.5H337.5c-1.9 0-3.5-1.5-3.5-3.5V228c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5v22.9zm0-60.9c0 1.9-1.5 3.5-3.5 3.5H337.5c-1.9 0-3.5-1.5-3.5-3.5v-22.8c0-1.9 1.5-3.5 3.5-3.5h160.4c1.9 0 3.5 1.5 3.5 3.5V190z" />
  </svg>
);

const ApiReferenceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M13.26 10.5h2v1h-2z" />
    <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M8.4 15L8 13.77H6.06L5.62 15H4l2.2-6h1.62L10 15Zm8.36-3.5a1.47 1.47 0 0 1-1.5 1.5h-2v2h-1.5V9h3.5a1.47 1.47 0 0 1 1.5 1.5ZM20 15h-1.5V9H20Z" />
    <path fill="currentColor" d="M6.43 12.77h1.16l-.58-1.59z" />
  </svg>
);

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const RocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 8-11 8 8 0 0 1 11 8 22 22 0 0 1-11 8z" />
    <path d="M9 12H5a2 2 0 0 0-2 2 9 9 0 0 0 18 0 2 2 0 0 0-2-2h-4" />
    <path d="M12 15v5" />
  </svg>
);

/* ─── About dropdown icons ─── */
const HelpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10s10-4.486 10-10S17.514 2 12 2m1 16h-2v-2h2zm.976-4.885c-.196.158-.385.309-.535.459c-.408.407-.44.777-.441.793v.133h-2v-.167c0-.118.029-1.177 1.026-2.174c.195-.195.437-.393.691-.599c.734-.595 1.216-1.029 1.216-1.627a1.934 1.934 0 0 0-3.867.001h-2C8.066 7.765 9.831 6 12 6s3.934 1.765 3.934 3.934c0 1.597-1.179 2.55-1.958 3.181" />
  </svg>
);

const ContactsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M19 2H5c-.55 0-1 .45-1 1v4H2v2h2v2H2v2h2v2H2v2h2v4c0 .55.45 1 1 1h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-6.5 5C13.93 7 15 8.07 15 9.5S13.93 12 12.5 12S10 10.93 10 9.5S11.07 7 12.5 7M17 17H8v-1c0-1.66 1.34-3 3-3h3c1.66 0 3 1.34 3 3z" />
  </svg>
);

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="m10.155 14.773l-.009-.021a7 7 0 0 1-.402-.123l-.01-.004A7 7 0 0 1 5 8a7 7 0 0 1 13.96-.749c.044.412-.296.749-.71.749s-.745-.338-.8-.748a5.501 5.501 0 1 0-7.279 5.937a2 2 0 0 1 3.829.81a2 2 0 0 1-3.845.774m-1.025 1.23a8.5 8.5 0 0 1-3.136-1.988a2.25 2.25 0 0 0-1.99 2.234v.92c0 .572.178 1.13.51 1.596C6.056 20.929 8.58 22 12 22s5.945-1.072 7.49-3.235a2.75 2.75 0 0 0 .513-1.599v-.918a2.25 2.25 0 0 0-2.248-2.25H15.5a3.5 3.5 0 0 1-6.37 2.004M16 8a4 4 0 0 0-1.431-3.066a4 4 0 1 0-4.811 6.379A3.5 3.5 0 0 1 12 10.5c.853 0 1.635.305 2.243.813A4 4 0 0 0 16 8" />
  </svg>
);

const CeoBioIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M0 0h20v20H0z" fill="none" />
    <path fill="currentColor" d="M17 16.9v-2.5c0-.7-.1-1.4-.5-2.1s-.9-1.3-1.6-1.7c-.7-.5-2.2-.6-2.9-.6l-1.6 1.7l.6 1.3v3l-1 1.1L9 16v-3l.7-1.3L8 10c-.8 0-2.3.1-3 .6c-.7.4-1.1 1-1.5 1.7S3 13.6 3 14.4v2.5S5.6 18 10 18s7-1.1 7-1.1M10 2.1c-1.9 0-3 1.8-2.7 3.8S8.6 9.3 10 9.3s2.4-1.4 2.7-3.4c.3-2.1-.8-3.8-2.7-3.8" />
  </svg>
);

/* ─── Dropdown data ─── */
const featuresItems = [
  { label: 'REST API', desc: 'Simple JSON API to send emails', icon: <RestApiIcon />, to: '/rest-api' },
  { label: 'SMTP Relay', desc: 'Connect your own Postfix relay', icon: <SmtpIcon />, to: '/smtp-relay' },
  { label: 'API Key Auth', desc: 'HMAC-signed keys with full CRUD', icon: <ApiKeyIcon />, to: '/api-key-auth' },
  { label: 'Delivery Tracking', desc: 'Real-time queue and delivery logs', icon: <DeliveryTrackingIcon />, to: '/delivery-tracking' },
  { label: 'BullMQ Queue', desc: 'Redis-backed workers & retries', icon: <BullMqIcon />, to: '/bullmq-queue' },
  { label: 'Self-Hosted', desc: 'Run on your own server', icon: <SelfHostedIcon />, to: '/self-hosted' },
];

const developerItems = [
  { label: 'Documentation', desc: 'Getting started guides', icon: <DocsIcon />, to: '/documentation' },
  { label: 'API Reference', desc: 'Full REST API docs', icon: <ApiReferenceIcon />, to: '/api-reference' },
  { label: 'GitHub', desc: 'Source code & issues', icon: <GithubIcon />, href: 'https://github.com/maskedes/email-resending-service' },
  { label: 'Self-Hosted Setup', desc: 'Deploy on your server', icon: <RocketIcon />, to: '/self-hosted-setup' },
];

/* ─── About dropdown data ─── */
const aboutItems = [
  { label: 'Help', desc: 'Guides, FAQs & troubleshooting', icon: <HelpIcon />, to: '/help' },
  { label: 'Contacts', desc: 'Reach our team directly', icon: <ContactsIcon />, to: '/contacts' },
  { label: 'Support', desc: 'Get help from our engineers', icon: <SupportIcon />, to: '/support' },
  { label: "CEO's Bio", desc: 'Meet the founder', icon: <CeoBioIcon />, to: '/ceo-bio' },
];

/* ─── Dropdown hook ─── */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Open immediately on hover.
  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  // Close after a short delay so the cursor can travel into the panel.
  const closeMenu = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [clearCloseTimer]);

  // Click still toggles (useful for touch / keyboard users).
  const toggle = useCallback(() => {
    clearCloseTimer();
    setOpen((prev) => !prev);
  }, [clearCloseTimer]);

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

  return { open, setOpen, ref, openMenu, closeMenu, toggle };
}

/* ─── Dropdown menu component ─── */
function Dropdown({ label, items, dd }: {
  label: string;
  items: { label: string; desc: string; icon: ReactNode; href?: string; anchor?: string; to?: string }[];
  dd: ReturnType<typeof useDropdown>;
}) {
  return (
    <div
      className="relative"
      ref={dd.ref}
      onMouseEnter={dd.openMenu}
      onMouseLeave={dd.closeMenu}
    >
      <button
        onClick={dd.toggle}
        className="flex h-[58px] items-center gap-1.5 px-3 py-1 text-sm font-medium text-slate-400 transition duration-150 hover:text-white select-none"
      >
        {label}
        <Chevron open={dd.open} />
      </button>

      <div
        className={`absolute left-1/2 top-full z-50 mt-1 w-[340px] -translate-x-1/2 rounded-2xl border border-canvas-border bg-canvas-raised p-2 shadow-2xl shadow-black/40 transition-all duration-200 ease-out
          ${dd.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}`}
      >
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
            ) : item.to ? (
              <Link
                key={item.label}
                href={item.to}
                onClick={() => dd.setOpen(false)}
                className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-brand/10"
              >
                <span className="mt-0.5 text-base">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              </Link>
            ) : (
              <a
                key={item.label}
                href={`#${item.anchor ?? item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
    </div>
  );
}

/* ─── Main navbar ─── */
export default function Navbar() {
  const featuresDD = useDropdown();
  const developersDD = useDropdown();
  const aboutDD = useDropdown();
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
          <li><Dropdown label="About Us" items={aboutItems} dd={aboutDD} /></li>
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

            <div className="pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">About</div>
            {aboutItems.map((item) => (
              <Link
                key={item.label}
                href={item.to ?? `#${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 transition hover:bg-brand/10 hover:text-white"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

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
