import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up for a Free Open Source Email Platform',
  description:
    'Create a free E-NVOY account and start sending transactional and marketing email with SMTP relay, REST API, and delivery tracking.',
  robots: { index: false, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
