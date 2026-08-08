import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Send Email — CLI — E-NVOY Docs' };

export default function CLISend() {
  return (
    <div className="prose">
      <h1>Send Email</h1>
      <p>Send an email from the command line.</p>

      <h2>Usage</h2>
      <pre><code>{`envoy send [options]`}</code></pre>

      <h2>Options</h2>
      <table>
        <thead>
          <tr><th>Option</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--to &lt;email&gt;</code></td><td>Yes</td><td>Recipient email address</td></tr>
          <tr><td><code>--from &lt;email&gt;</code></td><td>No</td><td>Sender email (uses default if not set)</td></tr>
          <tr><td><code>--subject &lt;text&gt;</code></td><td>No</td><td>Email subject (defaults to &quot;(no subject)&quot;)</td></tr>
          <tr><td><code>--text &lt;body&gt;</code></td><td>Conditional*</td><td>Plain text body</td></tr>
          <tr><td><code>--html &lt;body&gt;</code></td><td>Conditional*</td><td>HTML body</td></tr>
          <tr><td><code>--file &lt;path&gt;</code></td><td>Conditional*</td><td>Read HTML body from a file</td></tr>
          <tr><td><code>--tag &lt;key=value&gt;</code></td><td>No</td><td>Add a tag (repeatable)</td></tr>
          <tr><td><code>--schedule &lt;ms&gt;</code></td><td>No</td><td>Delay in milliseconds before sending</td></tr>
        </tbody>
      </table>
      <p>*At least one of <code>--text</code>, <code>--html</code>, or <code>--file</code> is required.</p>

      <h2>Examples</h2>

      <h3>HTML email</h3>
      <pre><code>{`envoy send \\
  --to user@example.com \\
  --from hello@yourdomain.com \\
  --subject "Welcome aboard!" \\
  --html "<h1>Hello!</h1><p>Your account is ready.</p>"`}</code></pre>

      <h3>Plain text</h3>
      <pre><code>{`envoy send \\
  --to user@example.com \\
  --subject "Notification" \\
  --text "You have a new message."`}</code></pre>

      <h3>From file</h3>
      <pre><code>{`envoy send \\
  --to user@example.com \\
  --subject "Monthly Newsletter" \\
  --file ./emails/newsletter.html`}</code></pre>

      <h3>With tags</h3>
      <pre><code>{`envoy send \\
  --to user@example.com \\
  --subject "Alert" \\
  --text "Server CPU > 90%" \\
  --tag "env=production" \\
  --tag "severity=critical"`}</code></pre>

      <h3>Scheduled send</h3>
      <pre><code>{`# Send 60 seconds from now
envoy send \\
  --to user@example.com \\
  --subject "Reminder" \\
  --text "Your meeting starts in 5 minutes." \\
  --schedule 60000`}</code></pre>

      <h3>JSON output</h3>
      <pre><code>{`envoy send --to user@example.com --subject "Test" --html "<p>Hi</p>" --json`}</code></pre>
      <p>Output:</p>
      <pre><code>{`{
  "id": "a8979374-faaa-4230-af79-5480323c88a4",
  "from": "hello@yourdomain.com",
  "to": "user@example.com",
  "subject": "Test",
  "status": "queued",
  "created_at": "2026-08-08T12:00:00.000Z"
}`}</code></pre>
    </div>
  );
}
