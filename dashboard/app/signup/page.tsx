'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import OAuthButtons, { hasEnabledOAuthProviders } from '@/components/auth/OAuthButtons';
import { signUpWithEmail } from '@/lib/auth';

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');

    const err = await signUpWithEmail(email, password, fullName);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }

    setMessage(
      'Account created! Check your email to confirm your address, then sign in.'
    );
    setStatus('success');
    setTimeout(() => router.push('/login'), 3500);
  }

  return (
    <AuthShell title="Create your account" subtitle="Start sending emails in minutes">
      {error && (
        <div className="mb-5 border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300 ">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-5 border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300 ">
          {message}
        </div>
      )}

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="auth-input"
          />
        </div>
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
          <label className="mb-1.5 block text-sm text-slate-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
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
              ? 'Creating account…'
              : status === 'success'
              ? 'Account created'
              : status === 'error'
              ? 'Try again'
              : 'Create account'}
          </span>
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      {/* OAuth buttons — Google, GitHub, Apple */}
      {hasEnabledOAuthProviders() && <OAuthButtons />}

      {/* Legal text */}
      <p className="mt-6 text-center text-xs text-slate-500">
        By signing up, you agree to our{' '}
        <Link href="#" className="text-slate-400 underline transition hover:text-white">
          Terms
        </Link>
        ,{' '}
        <Link href="#" className="text-slate-400 underline transition hover:text-white">
          Acceptable Use
        </Link>
        , and{' '}
        <Link href="#" className="text-slate-400 underline transition hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-white transition hover:text-slate-200">
          Log in
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
