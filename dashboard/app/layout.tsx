import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import CookieConsent from './components/CookieConsent';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://mailenvoy.qd.je'),
  title: {
    default: 'E-NVOY — Free Open Source Email Sending Service',
    template: '%s — E-NVOY',
  },
  description:
    'E-NVOY by Ink E-socialz Inc. Free open source email platform with SMTP relay, REST API, and real-time delivery tracking for transactional and marketing emails.',
  alternates: { canonical: '/' },
  icons: { icon: '/logo-icon.svg' },
  // ─── Search-engine webmaster verification ───────────────────────────────
  verification: {
    yandex: 'cb958d22a2a5e391',
    other: {
      'msvalidate.01': '<BING_WEBMASTER_CODE>',
      'google-site-verification': '<GOOGLE_SEARCH_CONSOLE_CODE>',
    },
  },
  // ─── Open Graph (Facebook, LinkedIn, TikTok, WhatsApp, iMessage) ────────
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mailenvoy.qd.je',
    siteName: 'E-NVOY',
    title: 'E-NVOY — Free Open Source Email Sending Service',
    description:
      'Send transactional and marketing emails for free. Open source email platform with SMTP relay, REST API, and real-time delivery tracking.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'E-NVOY — Free Open Source Email Sending Service',
        type: 'image/png',
      },
    ],
  },
  // ─── Twitter / X Cards ──────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    site: '@enovoy',
    creator: '@enovoy',
    title: 'E-NVOY — Free Open Source Email Sending Service',
    description:
      'Send transactional and marketing emails for free. Open source email platform with SMTP relay, REST API, and real-time delivery tracking.',
    images: ['/og-image.png'],
  },
  // ─── Bluesky / AT Protocol ──────────────────────────────────────────────
  // Bluesky reads standard Open Graph + Twitter Card tags. Extra keys:
  other: {
    'og:type': 'website',
    'og:locale': 'en_US',
  },
  category: 'technology',
  keywords: [
    'email sending service',
    'transactional email',
    'SMTP relay',
    'REST API email',
    'open source email',
    'E-NVOY',
    'email delivery',
    'marketing email',
  ],
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
        {/* ─── TikTok / Facebook / LinkedIn Open Graph meta tags ──────────── */}
        <meta property="og:title" content="E-NVOY — Free Open Source Email Sending Service" />
        <meta property="og:description" content="Send transactional and marketing emails for free. Open source email platform with SMTP relay, REST API, and real-time delivery tracking." />
        <meta property="og:url" content="https://mailenvoy.qd.je" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="E-NVOY" />
        <meta property="og:image" content="https://mailenvoy.qd.je/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        {/* Twitter / X Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@enovoy" />
        <meta name="twitter:creator" content="@enovoy" />
        <meta name="twitter:title" content="E-NVOY — Free Open Source Email Sending Service" />
        <meta name="twitter:description" content="Send transactional and marketing emails for free." />
        <meta name="twitter:image" content="https://mailenvoy.qd.je/og-image.png" />
        {/* Bluesky AT Protocol – reads standard OG + Twitter tags */}
        <meta name="bluesky:handle" content="@enovoy.bsky.social" />
        <meta property="bluesky:title" content="E-NVOY — Free Open Source Email Sending Service" />
        <meta property="bluesky:description" content="Send transactional and marketing emails for free." />
        <meta property="bluesky:image" content="https://mailenvoy.qd.je/og-image.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'E-NVOY',
              url: 'https://mailenvoy.qd.je',
              logo: 'https://mailenvoy.qd.je/logo.svg',
              description:
                'Free open source email sending service with SMTP relay, REST API, and real-time delivery tracking.',
              sameAs: [
                'https://github.com/maskedes/email-resending-service',
                'https://twitter.com/enovoy',
                'https://linkedin.com/company/enovoy',
                'https://bsky.app/profile/enovoy.bsky.social',
                'https://www.tiktok.com/@enovoy',
                'https://www.facebook.com/enovoy',
              ],
            }),
          }}
        />
      </head>
      <body>
        {/* Yandex.Metrika counter */}
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=111997333','ym');ym(111997333,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/111997333" style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
        {/* Apply cached theme before paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('envoy-theme');var root=document.documentElement;if(t==='light'){root.classList.add('light');root.style.colorScheme='light';}else{root.style.colorScheme='dark';}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
