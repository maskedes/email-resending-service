import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Authentication — E-NVOY Docs' };

export default function Authentication() {
  return (
    <div className="prose">
      <h1>Authentication</h1>
      <p>All API requests require an API key passed via the <code>x-api-key</code> header.</p>

      <h2>Creating an API Key</h2>
      <p>You can create API keys from the dashboard or the CLI:</p>

      <h3>Via Dashboard</h3>
      <ol>
        <li>Go to <strong>Overview → API Keys</strong></li>
        <li>Click <strong>Create API Key</strong></li>
        <li>Enter a name and email address</li>
        <li>Copy the key — <strong>it won&apos;t be shown again</strong></li>
      </ol>

      <h3>Via CLI</h3>
      <pre><code>{`envoy key-create "My App" --email dev@example.com`}</code></pre>

      <h2>Using the Key</h2>
      <p>Pass the key in the <code>x-api-key</code> header on every request:</p>

      <pre><code>{`curl -X POST https://your-server/api/emails/send \\
  -H "x-api-key: fms_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "user@example.com", "subject": "Hi", "html": "<p>Hello</p>" }'`}</code></pre>

      <h2>Configuring the CLI</h2>
      <p>Store your key locally so you don&apos;t have to pass it every time:</p>
      <pre><code>{`envoy init`}</code></pre>
      <p>This saves the key in <code>~/.config/envoy-cli/config.json</code>.</p>

      <p>You can also override per command:</p>
      <pre><code>{`envoy send --api-key fms_OTHER_KEY --to user@example.com --subject "Hi" --html "<p>Hello</p>"`}</code></pre>

      <h2>Environment Variables</h2>
      <pre><code>{`export ENVOY_API_KEY="fms_YOUR_API_KEY"
export ENVOY_HOST="https://your-server"
export ENVOY_EDGE_PROXY_SECRET="your-secret"`}</code></pre>

      <h2>Key Format</h2>
      <p>API keys follow the format:</p>
      <pre><code>{`fms_[48 random alphanumeric characters]
e.g. fms_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd`}</code></pre>

      <div className="callout callout-warning">
        <strong>Security:</strong> Your API key is shown only once at creation time. Store it securely — it cannot be retrieved later.
      </div>

      <h2>Rate Limits</h2>
      <p>All API endpoints are rate-limited to <strong>100 requests per 15-minute window</strong> per API key.</p>

      <h2>Edge Proxy</h2>
      <p>
        The <code>/api/emails/*</code> routes have an additional edge proxy guard. If your server has
        <code>EDGE_PROXY_SECRET</code> configured, you must also send the <code>x-edge-proxy-secret</code> header:
      </p>
      <pre><code>{`curl -X POST https://your-server/api/emails/send \\
  -H "x-api-key: fms_YOUR_API_KEY" \\
  -H "x-edge-proxy-secret: YOUR_EDGE_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "user@example.com", "subject": "Hi", "html": "<p>Hello</p>" }'`}</code></pre>

      <div className="callout callout-info">
        <strong>Note:</strong> The edge proxy secret is optional. If not set on the server, this header is not required.
      </div>
    </div>
  );
}
