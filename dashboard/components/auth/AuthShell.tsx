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
    <div className="flex min-h-screen flex-col bg-canvas text-white">
      <header className="flex h-14 items-center gap-3 px-6 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <img src="/logo-icon.svg" alt="E-NVOY" className="h-7 w-7" />
          E-NVOY
        </Link>
        <Link href="/" className="ml-auto text-sm text-slate-400 transition hover:text-white">
          ← Home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 sm:py-16">
        <div className="w-full max-w-xl">
          <h1 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-center text-sm text-slate-400 sm:text-base">{subtitle}</p>
          <div className="mt-8 space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
