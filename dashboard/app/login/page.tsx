'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import OAuthButtons, { hasEnabledOAuthProviders } from '@/components/auth/OAuthButtons';
import { signInWithPassword } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');

    const err = await signInWithPassword(email, password);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }
    setStatus('success');
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

      {/* OAuth buttons — only shown when a provider is enabled in Supabase */}
      {hasEnabledOAuthProviders() && (
        <>
          <OAuthButtons />

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>
        </>
      )}

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
          disabled={status === 'loading' || status === 'success'}
          className={`auth-btn-primary flex items-center justify-center gap-2 transition-all duration-300 status-done ${
            status === 'success'
              ? '!border-emerald-500/50 !bg-emerald-500/15 !text-emerald-300'
              : status === 'error'
              ? '!border-red-500/50 !bg-red-500/15 !text-red-300'
              : ''
          }`}
        >
          <SignupStatusIcon status={status} />
          <span key={status} className="fade-in">
            {status === 'loading'
              ? 'Signing in…'
              : status === 'success'
              ? 'Signed in'
              : status === 'error'
              ? 'Try again'
              : 'Sign in'}
          </span>
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-white transition hover:text-slate-200">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

function SignupStatusIcon({ status }: { status: SubmitStatus }) {
  if (status === 'loading') {
    return (
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden="true"
      />
    );
  }
  if (status === 'success') {
    return (
      <span className="status-pop inline-flex" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 16 16"
          className="h-5 w-5"
        >
          <path d="M0 0h16v16H0z" fill="none" />
          <path
            fill="#4afc04"
            d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8m9.854-1.146a.5.5 0 0 0-.708-.708L7.25 9.043L5.854 7.646a.5.5 0 1 0-.708.708l1.75 1.75a.5.5 0 0 0 .708 0z"
          />
        </svg>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="status-pop inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
