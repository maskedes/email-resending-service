import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password: Choose a New Secure Password',
  description:
    'Set a new password for your E-NVOY account from the secure reset link. Your session stays active after the change.',
  robots: { index: false, follow: true },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
