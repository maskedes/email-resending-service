import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'API Keys — CLI — E-NVOY Docs' };

export default function CLIKeys() {
  return (
    <div className="prose">
      <h1>API Keys</h1>
      <p>Create and manage API keys from the terminal.</p>

      <h2>List Keys</h2>
      <pre><code>{`envoy keys`}</code></pre>
      <p>Output:</p>
      <pre><code>{`  My App  active
    ID:     abc-123
    Email:  dev@example.com
    Emails: 42
    Last used: 8/8/2026, 2:00:00 PM

  CI Pipeline  active
    ID:     def-456
    Email:  ci@example.com
    Emails: 156`}</code></pre>

      <h2>Create a Key</h2>
      <pre><code>{`envoy key-create "My App"`}</code></pre>
      <p>With an associated email:</p>
      <pre><code>{`envoy key-create "CI Pipeline" --email ci@example.com`}</code></pre>
      <p>Output:</p>
      <pre><code>{`  API key created!

  Name:  CI Pipeline
  ID:    ghi-789

  ⚠ Save this key now — it won't be shown again:

  fms_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd

  Set it with: envoy init`}</code></pre>

      <div className="callout callout-warning">
        <strong>Security:</strong> The API key is shown only once at creation. Store it immediately — it cannot be retrieved later.
      </div>

      <h2>Delete a Key</h2>
      <pre><code>{`envoy key-delete <key-id>`}</code></pre>
      <p>This permanently deletes the key and all associated data (emails, domains, webhooks).</p>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Use <code>envoy keys</code> first to find the key ID, then delete it.
      </div>
    </div>
  );
}
