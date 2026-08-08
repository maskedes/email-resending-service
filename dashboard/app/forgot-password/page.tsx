'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { resetPasswordForEmail } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const err = await resetPasswordForEmail(email);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setMessage('If that email exists, a password reset link has been sent.');
    setLoading(false);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link">
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
        <button
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-white transition hover:text-slate-200">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
