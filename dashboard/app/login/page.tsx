'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { signInWithPassword } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const err = await signInWithPassword(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your dashboard">
      {error && (
        <div className="mb-5 border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* OAuth buttons — Resend style, side by side */}
      <OAuthButtons />

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="auth-input"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm text-slate-400">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-slate-500 transition hover:text-white"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="auth-input"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Skip auth (development shortcut) */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>
      <Link
        href={next}
        className="flex w-full items-center justify-center gap-2 border border-white/10 bg-canvas-raised px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-brand/40 hover:bg-brand/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand"
      >
        Skip for now — enter dashboard
      </Link>

      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-white transition hover:text-slate-200">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
