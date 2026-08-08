import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'CLI Overview — E-NVOY Docs' };

export default function CLIOverview() {
  return (
    <div className="prose">
      <h1>CLI Overview</h1>
      <p>
        The E-NVOY CLI lets you send emails, manage domains, and monitor delivery — all from your terminal.
        It&apos;s a single binary with no external dependencies.
      </p>

      <h2>Installation</h2>
      <pre><code>{`# Install globally
npm install -g @maskedes/envoy-cli

# Or run directly
npx @maskedes/envoy-cli`}</code></pre>

      <h2>Setup</h2>
      <pre><code>{`envoy init`}</code></pre>
      <p>Follow the prompts to configure your API key, host, and edge proxy secret.</p>

      <h2>Commands</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>envoy init</code></td><td>Configure API key, host, edge secret</td></tr>
          <tr><td><code>envoy send</code></td><td>Send an email</td></tr>
          <tr><td><code>envoy domains</code></td><td>List all domains</td></tr>
          <tr><td><code>envoy domain-add &lt;name&gt;</code></td><td>Register a new domain</td></tr>
          <tr><td><code>envoy domain-verify &lt;id&gt;</code></td><td>Trigger DNS verification</td></tr>
          <tr><td><code>envoy domain-delete &lt;id&gt;</code></td><td>Delete a domain</td></tr>
          <tr><td><code>envoy keys</code></td><td>List all API keys</td></tr>
          <tr><td><code>envoy key-create &lt;name&gt;</code></td><td>Create a new API key</td></tr>
          <tr><td><code>envoy key-delete &lt;id&gt;</code></td><td>Delete an API key</td></tr>
          <tr><td><code>envoy logs</code></td><td>View email logs</td></tr>
          <tr><td><code>envoy stats</code></td><td>View delivery statistics</td></tr>
        </tbody>
      </table>

      <h2>Global Options</h2>
      <p>These work with every command:</p>
      <table>
        <thead>
          <tr><th>Option</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--api-key &lt;key&gt;</code></td><td>Override the stored API key</td></tr>
          <tr><td><code>--host &lt;url&gt;</code></td><td>Override the API host</td></tr>
          <tr><td><code>--edge-secret &lt;secret&gt;</code></td><td>Edge proxy secret for email routes</td></tr>
          <tr><td><code>--json</code></td><td>Output raw JSON instead of formatted text</td></tr>
        </tbody>
      </table>

      <h2>Environment Variables</h2>
      <pre><code>{`ENVOY_API_KEY=fms_YOUR_API_KEY
ENVOY_HOST=https://your-server
ENVOY_EDGE_PROXY_SECRET=your-secret`}</code></pre>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Environment variables take precedence over stored config. Use them in CI/CD pipelines.
      </div>

      <h2>Examples</h2>
      <pre><code>{`# Send an HTML email
envoy send --to user@example.com --subject "Welcome" --html "<h1>Hi!</h1>"

# Send with tags
envoy send --to user@example.com --subject "Alert" --text "Server is down" --tag "env=prod" --tag "severity=high"

# Read HTML from file
envoy send --to user@example.com --subject "Newsletter" --file ./newsletter.html

# View logs in JSON
envoy logs --json --limit 10

# Create and list domains
envoy domain-add example.com
envoy domains`}</code></pre>
    </div>
  );
}
