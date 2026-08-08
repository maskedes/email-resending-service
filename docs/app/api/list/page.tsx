import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'List Emails — API — E-NVOY Docs' };

export default function APIList() {
  return (
    <div className="prose">
      <h1>List Emails</h1>
      <p>Retrieve a paginated list of emails.</p>

      <h2>Endpoint</h2>
      <pre><code>{`GET /api/emails`}</code></pre>

      <h2>Headers</h2>
      <table>
        <thead>
          <tr><th>Header</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>x-api-key</code></td><td>Yes</td><td>Your API key</td></tr>
          <tr><td><code>x-edge-proxy-secret</code></td><td>Conditional</td><td>Required if EDGE_PROXY_SECRET is set</td></tr>
        </tbody>
      </table>

      <h2>Query Parameters</h2>
      <table>
        <thead>
          <tr><th>Param</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>limit</code></td><td>50</td><td>Max results per page</td></tr>
          <tr><td><code>offset</code></td><td>0</td><td>Number of results to skip</td></tr>
        </tbody>
      </table>

      <h2>Example</h2>
      <pre><code>{`curl -X GET "https://your-server/api/emails?limit=10&offset=0" \\
  -H "x-api-key: fms_YOUR_API_KEY"`}</code></pre>

      <h2>Response</h2>
      <pre><code>{`{
  "data": [
    {
      "id": "uuid",
      "from": "hello@yourdomain.com",
      "to": "user@example.com",
      "subject": "Welcome aboard!",
      "status": "sent",
      "created_at": "2026-08-08T12:00:00.000Z",
      "sent_at": "2026-08-08T12:00:01.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}`}</code></pre>
    </div>
  );
}
