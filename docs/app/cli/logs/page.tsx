import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Logs & Stats — CLI — E-NVOY Docs' };

export default function CLILogs() {
  return (
    <div className="prose">
      <h1>Logs &amp; Stats</h1>
      <p>Monitor email delivery and view history from the terminal.</p>

      <h2>View Logs</h2>
      <pre><code>{`envoy logs`}</code></pre>
      <p>Output:</p>
      <pre><code>{`  08/08/2026, 10:45:09  sent      Welcome aboard!
                        → user@example.com
  08/08/2026, 10:44:32  failed    Notification
                        → bad@example.com
  08/08/2026, 10:43:15  sent      Your order is ready
                        → customer@example.com

  Showing 3 emails (offset: 0)`}</code></pre>

      <h3>Options</h3>
      <table>
        <thead>
          <tr><th>Option</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--limit &lt;n&gt;</code></td><td>20</td><td>Max number of emails to show</td></tr>
          <tr><td><code>--offset &lt;n&gt;</code></td><td>0</td><td>Skip the first N emails</td></tr>
        </tbody>
      </table>

      <h3>Paginate</h3>
      <pre><code>{`# Show the next 10
envoy logs --limit 10 --offset 10

# Show the latest 50
envoy logs --limit 50`}</code></pre>

      <h3>JSON output</h3>
      <pre><code>{`envoy logs --json --limit 5`}</code></pre>
      <p>Output:</p>
      <pre><code>{`[
  {
    "id": "uuid",
    "from": "hello@yourdomain.com",
    "to": "user@example.com",
    "subject": "Welcome aboard!",
    "status": "sent",
    "created_at": "2026-08-08T10:45:09.000Z"
  }
]`}</code></pre>

      <hr />

      <h2>View Stats</h2>
      <pre><code>{`envoy stats`}</code></pre>
      <p>Output:</p>
      <pre><code>{`📊  Email Delivery Stats

  Total:    150
  Sent:     120
  Queued:   25
  Failed:   5
  Success:  80.0%`}</code></pre>

      <h3>JSON output</h3>
      <pre><code>{`envoy stats --json`}</code></pre>
      <pre><code>{`{
  "total": 150,
  "sent": 120,
  "failed": 5,
  "queued": 25
}`}</code></pre>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Combine with <code>--json</code> to pipe into <code>jq</code> or other tools:
        <br />
        <code>envoy stats --json | jq .sent</code>
      </div>
    </div>
  );
}
