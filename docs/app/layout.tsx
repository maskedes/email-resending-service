import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'E-NVOY Docs',
  description: 'Documentation for E-NVOY — the open source email sending platform and CLI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </body>
    </html>
  );
}
