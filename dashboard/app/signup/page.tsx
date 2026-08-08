'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { signUpWithEmail } from '@/lib/auth';

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const err = await signUpWithEmail(email, password, fullName);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    setMessage(
      'Account created! Check your email to confirm your address, then sign in.'
    );
    setLoading(false);
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
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
