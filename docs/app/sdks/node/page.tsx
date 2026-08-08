import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Node.js SDK — E-NVOY Docs' };

export default function SDKNode() {
  return (
    <div className="prose">
      <h1>Node.js SDK</h1>
      <p>Send emails from Node.js and TypeScript projects.</p>

      <h2>Install</h2>
      <pre><code>{`npm install @envoy/sdk`}</code></pre>

      <h2>Quick Start</h2>
      <pre><code>{`import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: 'fms_YOUR_API_KEY' });

const result = await envoy.emails.send({
  from: 'hello@yourdomain.com',
  to: ['user@example.com'],
  subject: 'Welcome!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
});

console.log(result.id); // queued message id`}</code></pre>

      <h2>With Custom Host</h2>
      <pre><code>{`const envoy = new ENovoy({
  apiKey: 'fms_YOUR_API_KEY',
  host: 'https://your-server.com',
});`}</code></pre>

      <h2>Express Integration</h2>
      <pre><code>{`import express from 'express';
import { ENovoy } from '@envoy/sdk';

const app = express();
const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY });

app.post('/send-welcome', async (req, res) => {
  const result = await envoy.emails.send({
    to: req.body.email,
    subject: 'Welcome!',
    html: '<h1>Welcome to our platform!</h1>',
  });

  res.json({ id: result.id });
});

app.listen(3000);`}</code></pre>

      <h2>Next.js API Route</h2>
      <pre><code>{`// app/api/send/route.ts
import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY! });

export async function POST(req: Request) {
  const { to, subject, html } = await req.json();

  const result = await envoy.emails.send({ to, subject, html });

  return Response.json({ id: result.id });
}`}</code></pre>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Store your API key in environment variables, never hardcode it.
      </div>
    </div>
  );
}
