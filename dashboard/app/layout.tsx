import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-NVOY — Free Open Source Email Sending Service',
  description: 'E-NVOY by Ink E-socialz Inc. Send transactional and marketing emails for free. Open source email platform with SMTP relay, REST API, and real-time delivery tracking. Self-hosted and developer-friendly.',
  icons: { icon: '/logo-icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Material Symbols Outlined';
            font-style: normal;
            font-weight: 100 700;
            src: url('/fonts/MaterialSymbolsOutlined.ttf') format('truetype');
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
