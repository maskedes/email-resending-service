import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quickstart — E-NVOY Docs' };

export default function Quickstart() {
  return (
    <div className="prose">
      <h1>Quickstart</h1>
      <p>Send your first email in under 2 minutes.</p>

      <h2>1. Install the CLI</h2>
      <pre><code>{`npm install -g @maskedes/envoy-cli`}</code></pre>
      <p>Or run without installing:</p>
      <pre><code>{`npx @maskedes/envoy-cli`}</code></pre>

      <h2>2. Configure your API key</h2>
      <pre><code>{`envoy init`}</code></pre>
      <p>Enter your API key, host URL, and edge proxy secret when prompted.</p>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Get your API key from the dashboard at <code>http://your-server/overview/api-keys</code>
      </div>

      <h2>3. Send an email</h2>
      <pre><code>{`envoy send \\
  --to user@example.com \\
  --subject "Hello from E-NVOY" \\
  --html "<h1>Welcome!</h1><p>Your account is ready.</p>"`}</code></pre>

      <h2>4. Check delivery status</h2>
      <pre><code>{`envoy stats`}</code></pre>
      <p>Output:</p>
      <pre><code>{`📊  Email Delivery Stats

  Total:    1
  Sent:     1
  Queued:   0
  Failed:   0
  Success:  100.0%`}</code></pre>

      <hr />

      <h2>Alternative: REST API</h2>
      <p>If you prefer using curl or an HTTP client directly:</p>
      <pre><code>{`curl -X POST https://your-server/api/emails/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: fms_YOUR_API_KEY" \\
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "html": "<p>It works!</p>"
  }'`}</code></pre>

      <h2>Alternative: SDK</h2>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-canvas-border bg-canvas-raised p-4">
          <div className="mb-2 font-semibold text-white">Node.js</div>
          <pre className="text-xs"><code>{`npm install @envoy/sdk`}</code></pre>
        </div>
        <div className="rounded-lg border border-canvas-border bg-canvas-raised p-4">
          <div className="mb-2 font-semibold text-white">Python</div>
          <pre className="text-xs"><code>{`pip install envoy`}</code></pre>
        </div>
        <div className="rounded-lg border border-canvas-border bg-canvas-raised p-4">
          <div className="mb-2 font-semibold text-white">Go</div>
          <pre className="text-xs"><code>{`go get github.com/maskedes/envoy-go`}</code></pre>
        </div>
      </div>
    </div>
  );
}
