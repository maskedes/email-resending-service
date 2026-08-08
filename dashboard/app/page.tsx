import Link from 'next/link';
import Navbar from './components/Navbar';
import HeroLanguageTabs from './components/HeroLanguageTabs';

/* ─── Code snippet ─── */
const codeSnippet = `curl -X POST https://api.freemailsend.dev/send \\
  -H "x-api-key: fms_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "hello@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
  }'`;

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Glow */}
        <div className="hero-glow pointer-events-none absolute inset-0" />
        {/* Grid */}
        <div className="hero-grid pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 border border-canvas-border bg-canvas-raised px-4 py-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Open source &middot; Self-hosted &middot; Free forever
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Reach every inbox,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-accent to-brand-400 bg-clip-text text-transparent">
              not the spam folder
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl">
            Deliver transactional and marketing emails for free.
            Open source email sending platform with SMTP relay, REST API, and real-time delivery tracking.
          </p>

          {/* CTA */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Get started
            </Link>
            <a
              href="https://github.com/maskedes/email-resending-service"
              target="_blank"
              rel="noopener"
              className="border border-canvas-border bg-canvas-raised px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-brand/60 hover:text-white"
            >
              View on GitHub
            </a>
          </div>

          {/* Interactive Language Tabs */}
          <HeroLanguageTabs />
        </div>
      </section>

      {/* ══════════ EMAIL PREVIEW CARD ══════════ */}
      <section className="relative pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="animate-float gradient-border bg-canvas-raised p-1 shadow-2xl shadow-brand/5">
            <div className="bg-canvas-raised p-6">
              {/* Window dots */}
              <div className="mb-4 flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
              </div>
              {/* Email fields */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 border-b border-canvas-border pb-3">
                  <span className="w-16 text-slate-500">To</span>
                  <span className="text-slate-300">alex@example.com</span>
                </div>
                <div className="flex items-center gap-3 border-b border-canvas-border pb-3">
                  <span className="w-16 text-slate-500">From</span>
                  <span className="text-slate-300">noreply@yourdomain.com</span>
                </div>
                <div className="flex items-center gap-3 border-b border-canvas-border pb-3">
                  <span className="w-16 text-slate-500">Subject</span>
                  <span className="font-medium text-white">Welcome to E-NVOY 🎉</span>
                </div>
                <div className="pt-2 text-slate-400">
                  <p>Hi Alex,</p>
                  <p className="mt-2">Your account is all set up. You can now send emails using our simple REST API or connect your own SMTP server.</p>
                  <p className="mt-2">Happy sending! 🚀</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CODE SECTION ══════════ */}
      <section id="code" className="relative pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Ship in minutes</h2>
            <p className="mt-3 text-slate-400">A clean REST API that speaks your language. One curl command and your email is on its way.</p>
          </div>

          <div className="code-block mt-10 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-2 border-b border-canvas-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-slate-500">Terminal</span>
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
              <code>
                {codeSnippet.split('\n').map((line, i) => (
                  <span key={i} className="block">
                    <span className="select-none text-slate-600">{String(i + 1).padStart(2, ' ')}</span>
                    <span className="ml-4">
                      {line.startsWith('curl') ? (
                        <>
                          <span className="text-emerald-400">curl</span>
                          <span className="text-slate-300"> -X </span>
                          <span className="text-yellow-400">POST</span>
                          <span className="text-blue-400"> https://api.freemailsend.dev/send</span>
                          <span className="text-slate-500"> \\</span>
                        </>
                      ) : line.includes('-H') ? (
                        <>
                          <span className="text-emerald-400">  -H</span>
                          <span className="text-orange-300"> &quot;{line.split('-H ')[1]?.replace(/\\$/, '').trim()}&quot;</span>
                          {line.endsWith('\\') && <span className="text-slate-500"> \</span>}
                        </>
                      ) : line.includes('-d') ? (
                        <>
                          <span className="text-emerald-400">  -d</span>
                          <span className="text-orange-300"> &apos;{'{'}</span>
                        </>
                      ) : line.trim().startsWith('"') ? (
                        <span className="text-slate-300">      {line.trim()}</span>
                      ) : (
                        <span className="text-slate-400">{line}</span>
                      )}
                    </span>
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="relative pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Everything you need</h2>
            <p className="mt-3 text-slate-400">Built for developers who want full control over their email infrastructure.</p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <span className="material-symbols-outlined text-brand">speed</span>, title: 'REST API', desc: 'Simple JSON API to send emails. Works with any language or framework.' },
              { icon: <span className="material-symbols-outlined text-brand">mail</span>, title: 'SMTP Relay', desc: 'Connect via SMTP using your own Postfix or any relay service.' },
              { icon: <span className="material-symbols-outlined text-brand">key</span>, title: 'API Key Auth', desc: 'HMAC-signed API keys with full CRUD management from the dashboard.' },
              { icon: <span className="material-symbols-outlined text-brand">monitoring</span>, title: 'Delivery Tracking', desc: 'Real-time queue status, delivery logs, and success/failure stats.' },
              { icon: <span className="material-symbols-outlined text-brand">sync_alt</span>, title: 'BullMQ Queue', desc: 'Reliable email queue with Redis-backed workers and automatic retries.' },
              { icon: <span className="material-symbols-outlined text-brand">dns</span>, title: 'Self-Hosted', desc: 'Run on your own server. Your data never leaves your infrastructure.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="feature-card group">
                <div className="mb-3 flex h-10 w-10 items-center justify-center bg-brand/10 transition group-hover:bg-brand/20">
                  {icon}
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="relative pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Simple pricing</h2>
            <p className="mt-3 text-slate-400">No hidden fees. No usage limits. It&apos;s free because it&apos;s yours.</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* Free tier */}
            <div className="feature-card relative overflow-hidden">
              <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-brand-300">Free &amp; Open Source</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-slate-500">/forever</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">Self-host on your own infrastructure. Full access to every feature.</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Unlimited emails</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> REST API + SMTP relay</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> API key management</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Real-time delivery tracking</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Web dashboard</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> BullMQ queue workers</li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 flex w-full items-center justify-center border border-canvas-border bg-canvas-border py-3 text-sm font-semibold text-white transition hover:border-brand/60 hover:bg-canvas-border"
              >
                Get started
              </Link>
            </div>

            {/* Managed tier */}
            <div className="feature-card relative overflow-hidden border-brand/20">
              <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-brand-300">Managed (Coming Soon)</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-bold">—</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">We host it for you. Zero setup, zero maintenance.</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2"><span className="text-brand-300">★</span> Everything in Free</li>
                <li className="flex items-center gap-2"><span className="text-brand-300">★</span> Managed SMTP relay</li>
                <li className="flex items-center gap-2"><span className="text-brand-300">★</span> Automatic scaling</li>
                <li className="flex items-center gap-2"><span className="text-brand-300">★</span> Priority support</li>
                <li className="flex items-center gap-2"><span className="text-brand-300">★</span> Custom domain setup</li>
                <li className="flex items-center gap-2 opacity-40"><span className="text-slate-600">○</span> <em>Waitlist open</em></li>
              </ul>
              <button
                disabled
                className="mt-8 flex w-full items-center justify-center border border-canvas-border bg-canvas-raised py-3 text-sm font-semibold text-slate-600 cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ BOTTOM CTA ══════════ */}
      <section className="relative pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="hero-glow border border-canvas-border/60 bg-canvas-raised px-8 py-16 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Ready to send?</h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-400">
              Set up in minutes. No credit card. No usage limits. Just your own email server.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Get started for free
              </Link>
              <a
                href="https://github.com/maskedes/email-resending-service"
                target="_blank"
                rel="noopener"
                className="border border-canvas-border px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-brand/60 hover:text-white"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-canvas-border/50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            {/* Left: brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white md:justify-start">
                <img src="/logo-icon.svg" alt="E-NVOY" className="h-7 w-7" />
                <span>E-NVOY</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">By <span className="text-slate-400">Ink E-socialz Inc</span></p>
            </div>

            {/* Center: links */}
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#code" className="transition hover:text-white">API</a>
              <a href="#pricing" className="transition hover:text-white">Pricing</a>
              <Link href="/login" className="transition hover:text-white">Sign in</Link>
            </div>

            {/* Right: socials */}
            <div className="flex items-center gap-3">
              <a href="https://github.com/maskedes/email-resending-service" target="_blank" rel="noopener" aria-label="GitHub" className="flex h-9 w-9 items-center justify-center rounded-full border border-canvas-border text-slate-500 transition hover:border-brand/60 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter / X" className="flex h-9 w-9 items-center justify-center rounded-full border border-canvas-border text-slate-500 transition hover:border-brand/60 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-canvas-border text-slate-500 transition hover:border-brand/60 hover:text-white">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full border border-canvas-border text-slate-500 transition hover:border-brand/60 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          {/* Bottom line */}
          <div className="mt-8 border-t border-canvas-border/50 pt-6 text-center text-xs text-slate-600">
            © 2026 Ink E-socialz Inc. E-NVOY is open source.
          </div>
        </div>
      </footer>
    </div>
  );
}
