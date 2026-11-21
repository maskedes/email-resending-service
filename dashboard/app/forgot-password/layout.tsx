import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password? Request a Secure Reset Link',
  description:
    'Request a password reset link for your E-NVOY account. Enter your email and we will send a secure reset link.',
  alternates: { canonical: '/forgot-password' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
