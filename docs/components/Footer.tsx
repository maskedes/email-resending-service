import Link from 'next/link';

const FOOTER_LINKS = [
  {
    title: 'Product',
    items: [
      { label: 'Dashboard', href: 'https://email-resending-service.vercel.app' },
      { label: 'CLI', href: '/cli' },
      { label: 'API Reference', href: '/api/send' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Quickstart', href: '/quickstart' },
      { label: 'Authentication', href: '/authentication' },
      { label: 'SDKs', href: '/sdks/node' },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'GitHub', href: 'https://github.com/maskedes/email-resending-service' },
      { label: 'Report an Issue', href: 'https://github.com/maskedes/email-resending-service/issues' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-canvas-border bg-canvas">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon.svg"
                alt="E-NVOY"
                className="h-7 w-7"
              />
              <span className="text-lg font-semibold text-white">E-NVOY</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Open source email sending platform. Send transactional and marketing emails with ease.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-canvas-border pt-6 sm:flex-row">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} E-NVOY. Open source under MIT License.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/maskedes/email-resending-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
