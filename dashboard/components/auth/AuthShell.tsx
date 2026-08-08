import Link from 'next/link';
import { ReactNode } from 'react';

/**
 * Resend-style centered auth shell with a single card on a dark blurred background.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas text-white px-4 py-10">
      <div className="pointer-events-none absolute inset-0" />

      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-2 border border-white/10 bg-canvas-raised px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-canvas-border focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center bg-canvas-border text-white">←</span>
        Home
      </Link>

      <div className="relative z-10 w-full max-w-xl border border-canvas-border bg-canvas-raised p-8 sm:p-10">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-brand/30" />
        <div className="mb-8 text-center">
          <img src="/logo-icon.svg" alt="E-NVOY" className="mx-auto mb-4 h-12 w-12" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">{subtitle}</p>
        </div>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
