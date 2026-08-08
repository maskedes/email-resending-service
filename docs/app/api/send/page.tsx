import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Send Email — API — E-NVOY Docs' };

export default function APISend() {
  return (
    <div className="prose">
      <h1>Send Email</h1>
      <p>Send an email via the REST API.</p>

      <h2>Endpoint</h2>
      <pre><code>{`POST /api/emails/send`}</code></pre>

      <h2>Headers</h2>
      <table>
        <thead>
          <tr><th>Header</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>x-api-key</code></td><td>Yes</td><td>Your API key</td></tr>
          <tr><td><code>x-edge-proxy-secret</code></td><td>Conditional</td><td>Required if EDGE_PROXY_SECRET is set</td></tr>
          <tr><td><code>Content-Type</code></td><td>Yes</td><td><code>application/json</code></td></tr>
        </tbody>
      </table>

      <h2>Request Body</h2>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>to</code></td><td>string</td><td>Yes</td><td>Recipient email address</td></tr>
          <tr><td><code>subject</code></td><td>string</td><td>No</td><td>Email subject (defaults to &quot;(no subject)&quot;)</td></tr>
          <tr><td><code>html</code></td><td>string</td><td>Conditional*</td><td>HTML body</td></tr>
          <tr><td><code>text</code></td><td>string</td><td>Conditional*</td><td>Plain text body</td></tr>
          <tr><td><code>from</code></td><td>string</td><td>No</td><td>Sender address (uses default if not set)</td></tr>
          <tr><td><code>reply_to</code></td><td>string</td><td>No</td><td>Reply-To address</td></tr>
          <tr><td><code>tags</code></td><td>object</td><td>No</td><td>Key-value metadata</td></tr>
          <tr><td><code>scheduleInMs</code></td><td>number</td><td>No</td><td>Delay in milliseconds</td></tr>
        </tbody>
      </table>
      <p>*At least one of <code>html</code> or <code>text</code> is required.</p>

      <h2>Example</h2>
      <pre><code>{`curl -X POST https://your-server/api/emails/send \\
  -H "x-api-key: fms_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "user@example.com",
    "from": "hello@yourdomain.com",
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>",
    "tags": { "campaign": "welcome" }
  }'`}</code></pre>

      <h2>Response</h2>
      <pre><code>{`{
  "id": "uuid",
  "from": "hello@yourdomain.com",
  "to": "user@example.com",
  "subject": "Welcome aboard!",
  "status": "queued",
  "created_at": "2026-08-08T12:00:00.000Z"
}`}</code></pre>

      <h2>Node.js</h2>
      <pre><code>{`const res = await fetch('https://your-server/api/emails/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'fms_YOUR_API_KEY',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome!',
    html: '<h1>Hello!</h1>',
  }),
});

const data = await res.json();
console.log(data.id); // queued message id`}</code></pre>

      <h2>Python</h2>
      <pre><code>{`import requests

res = requests.post(
    'https://your-server/api/emails/send',
    headers={
        'x-api-key': 'fms_YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'to': 'user@example.com',
        'subject': 'Welcome!',
        'html': '<h1>Hello!</h1>',
    },
)

print(res.json()['id'])`}</code></pre>

      <h2>Error Responses</h2>
      <table>
        <thead>
          <tr><th>Status</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>400</code></td><td>validation_error</td><td>Missing or invalid fields</td></tr>
          <tr><td><code>401</code></td><td>authentication_required</td><td>API key missing</td></tr>
          <tr><td><code>401</code></td><td>invalid_api_key</td><td>Invalid or deactivated key</td></tr>
          <tr><td><code>403</code></td><td>forbidden</td><td>Edge proxy secret mismatch</td></tr>
          <tr><td><code>429</code></td><td>rate_limit_exceeded</td><td>Too many requests</td></tr>
        </tbody>
      </table>
    </div>
  );
}
