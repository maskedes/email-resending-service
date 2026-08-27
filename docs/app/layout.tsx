import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://envoy-docs-liart.vercel.app'),
  title: 'E-NVOY Docs',
  description: 'Documentation for E-NVOY — the open source email sending platform and CLI.',
  // Yandex Webmaster verification (replace with your real code if regenerated)
  verification: {
    yandex: '5c9f21a135bcf1ec',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
