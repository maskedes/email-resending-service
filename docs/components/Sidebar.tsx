'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/' },
      { label: 'Quickstart', href: '/quickstart' },
      { label: 'Authentication', href: '/authentication' },
    ],
  },
  {
    title: 'CLI',
    items: [
      { label: 'Overview', href: '/cli' },
      { label: 'Send Email', href: '/cli/send' },
      { label: 'Domains', href: '/cli/domains' },
      { label: 'API Keys', href: '/cli/keys' },
      { label: 'Logs & Stats', href: '/cli/logs' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'Send Email', href: '/api/send' },
      { label: 'List Emails', href: '/api/list' },
      { label: 'Email Stats', href: '/api/stats' },
      { label: 'Domains', href: '/api/domains' },
    ],
  },
  {
    title: 'SDKs',
    items: [
      { label: 'Node.js', href: '/sdks/node' },
      { label: 'Python', href: '/sdks/python' },
      { label: 'Go', href: '/sdks/go' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-canvas-border lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 border-b border-canvas-border px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center bg-brand text-xs font-bold text-white">E</div>
          <span className="text-lg font-semibold text-white">E-NVOY</span>
          <span className="rounded-full bg-canvas-border px-2 py-0.5 text-[10px] font-medium text-zinc-500">docs</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-6 px-3 py-4">
          {NAV.map((section) => (
            <div key={section.title}>
              <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-canvas-border px-6 py-4">
          <a
            href="https://github.com/maskedes/email-resending-service"
            target="_blank"
            rel="noopener"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            GitHub →
          </a>
        </div>
      </div>
    </aside>
  );
}
