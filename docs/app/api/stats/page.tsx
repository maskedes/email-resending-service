import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Email Stats — API — E-NVOY Docs' };

export default function APIStats() {
  return (
    <div className="prose">
      <h1>Email Statistics</h1>
      <p>Get delivery statistics for your API key.</p>

      <h2>Endpoint</h2>
      <pre><code>{`GET /api/emails/stats`}</code></pre>

      <h2>Headers</h2>
      <table>
        <thead>
          <tr><th>Header</th><th>Required</th></tr>
        </thead>
        <tbody>
          <tr><td><code>x-api-key</code></td><td>Yes</td></tr>
          <tr><td><code>x-edge-proxy-secret</code></td><td>Conditional</td></tr>
        </tbody>
      </table>

      <h2>Example</h2>
      <pre><code>{`curl -X GET https://your-server/api/emails/stats \\
  -H "x-api-key: fms_YOUR_API_KEY"`}</code></pre>

      <h2>Response</h2>
      <pre><code>{`{
  "total": 150,
  "sent": 120,
  "failed": 5,
  "queued": 25
}`}</code></pre>

      <h2>Fields</h2>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>total</code></td><td>number</td><td>Total emails sent with this key</td></tr>
          <tr><td><code>sent</code></td><td>number</td><td>Successfully delivered</td></tr>
          <tr><td><code>failed</code></td><td>number</td><td>Failed to deliver</td></tr>
          <tr><td><code>queued</code></td><td>number</td><td>Currently in queue</td></tr>
        </tbody>
      </table>
    </div>
  );
}
