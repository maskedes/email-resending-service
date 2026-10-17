import Link from 'next/link';
import Navbar from '../components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How E-NVOY collects, uses, stores and protects information when you use our email and SMS sending service, dashboard and APIs.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: '1. Who we are',
    body: [
      'E-NVOY ("the Service", "we", "us") is an email and SMS delivery platform operated by an independent software provider. You can reach our team at support@mailenvoy.qd.je. This Privacy Policy explains what information we collect when you visit mailenvoy.qd.je, create an account, use the dashboard, or send messages through our REST API, SMTP relay or SMS gateway — and how we handle that information.',
      'This policy applies to the hosted service at mailenvoy.qd.je. If you self-host E-NVOY using our open-source release, you are the data controller for the data your installation processes, and this policy does not apply to your installation.',
    ],
  },
  {
    title: '2. Information we collect',
    body: [
      'Account information. When you register, we collect your email address, your display name, and a hashed password. If you sign in with a third-party provider such as Google, we receive your name, email address and profile picture from that provider. We never receive or store your third-party password.',
      'Message content and metadata. When you send email or SMS through the Service, we process the recipient address or phone number, the message subject and body, any attachments, and delivery metadata such as timestamps, queue status, bounce and complaint reports. This is processed solely to deliver your messages and to show you delivery statistics.',
      'API keys and configuration. We store the API keys you create, the sender domains you verify, the DNS records you configure, webhook endpoints you register, and template content you save.',
      'Usage and diagnostic data. We record request logs, IP addresses, user-agent strings, API request rates, error traces and delivery metrics. These are used for abuse prevention, rate limiting, security monitoring and improving deliverability.',
      'Device and cookie data. We use strictly necessary cookies to keep you signed in and to protect your session. Optional analytics cookies are only set with your consent, and you can decline them without losing access to the Service.',
    ],
  },
  {
    title: '3. How we use your information',
    body: [
      'To provide the Service: routing, queuing and delivering the email and SMS you submit; authenticating you and your API keys; displaying dashboards, delivery logs and statistics.',
      'To keep the Service safe: detecting spam, phishing and abuse; enforcing rate limits; investigating security incidents and preventing unauthorized access.',
      'To support you: answering support requests you open, and sending transactional notices about your account such as verification emails, password resets and service notices.',
      'To improve the Service: aggregate, de-identified analysis of reliability and deliverability. We do not sell your personal information, and we do not use your message content to train machine-learning models or to advertise to you.',
    ],
  },
  {
    title: '4. Sign in with Google',
    body: [
      'When you choose "Continue with Google", Google shares your name, email address and profile picture with us so we can create and secure your account. We use this data only for authentication and account provisioning.',
      'E-NVOY does not receive your Google password. We do not use the data received from Google to contact users outside of the Service, to advertise, or to share it with third parties. You can disconnect Google sign-in at any time from your account settings, and you can revoke our access through your Google Account permissions page at https://myaccount.google.com/permissions.',
    ],
  },
  {
    title: '5. Legal bases for processing',
    body: [
      'Where the GDPR or similar law applies, we process: account and message data to perform our contract with you; security, abuse-prevention and diagnostic data for our legitimate interests in running a safe and reliable service; consent-based data (such as optional analytics cookies) only where you have given consent, which you may withdraw at any time.',
    ],
  },
  {
    title: '6. Sharing and subprocessors',
    body: [
      'We share data only with the infrastructure providers required to operate the Service, under agreements that require them to protect it: our hosting and compute providers, our managed PostgreSQL and Redis providers, our transactional email and SMS carriers (which necessarily receive the recipient address or phone number and message content in order to deliver), and our error-monitoring provider.',
      'We may disclose information if required by law, or where necessary to protect the rights, safety or property of our users or the public. Delivery statistics we publish are aggregate and do not identify individual recipients.',
    ],
  },
  {
    title: '7. Data retention',
    body: [
      'Account data is retained while your account is active. Message content and delivery logs are retained for the period shown in your dashboard settings so that you can review delivery history, then deleted or aggregated. When you delete an API key, template, domain or webhook, the configuration is removed promptly and logs tied solely to it age out on the normal schedule.',
      'You can request full deletion of your account and associated personal data at any time by contacting support@mailenvoy.qd.je. We honour such requests within 30 days, subject to any records we are legally required to keep.',
    ],
  },
  {
    title: '8. Security',
    body: [
      'We protect data with encryption in transit (TLS), encryption at rest for our primary datastores, hashed and salted passwords, scoped API keys with server-side validation, role-based access control for team members, and network isolation for database and queue access. No system is perfectly secure; if we become aware of a breach affecting your personal data, we will notify you and the relevant authorities as required by law.',
    ],
  },
  {
    title: '9. Your rights',
    body: [
      'Depending on your location, you may have the right to access, correct, export or delete your personal data; to object to or restrict certain processing; and to lodge a complaint with your supervisory authority. You can exercise most of these rights directly from your account settings, or by emailing support@mailenvoy.qd.je. We will not discriminate against you for exercising any privacy right.',
    ],
  },
  {
    title: '10. International transfers',
    body: [
      'Our servers and subprocessors may process data in countries other than your own. Where we transfer personal data internationally, we rely on appropriate safeguards such as Standard Contractual Clauses to ensure your data continues to receive an adequate level of protection.',
    ],
  },
  {
    title: '11. Children’s privacy',
    body: [
      'The Service is a business tool and is not directed at children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, contact us and we will delete it.',
    ],
  },
  {
    title: '12. Changes to this policy',
    body: [
      'We may update this Privacy Policy as the Service evolves. The "Last updated" date below shows when it last changed. Material changes will be announced on the dashboard or by email before they take effect.',
    ],
  },
  {
    title: '13. Contact',
    body: [
      'Questions about this Privacy Policy or about your data can be sent to support@mailenvoy.qd.je, or through the contact options on our support page. We respond to all privacy enquiries within 30 days.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: 17 October 2026</p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-slate-400">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 border border-canvas-border bg-canvas-raised p-5">
          <p className="text-sm leading-relaxed text-slate-400">
            E-NVOY is an open-source email and SMS delivery service. This policy covers the
            hosted service at mailenvoy.qd.je, the dashboard, the REST API, the SMTP relay and
            the SMS gateway.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/support"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Contact support
          </Link>
          <Link
            href="/contacts"
            className="border border-canvas-border bg-canvas-raised px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Get in touch
          </Link>
        </div>
      </main>
    </div>
  );
}
