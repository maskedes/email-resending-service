import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In: Send Email & SMS from Your Dashboard',
  description:
    'Sign in to the E-NVOY dashboard to send emails and SMS, manage domains, API keys, webhooks, and track delivery in real time.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
