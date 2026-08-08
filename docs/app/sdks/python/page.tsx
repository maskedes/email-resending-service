import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Python SDK — E-NVOY Docs' };

export default function SDKPython() {
  return (
    <div className="prose">
      <h1>Python SDK</h1>
      <p>Send emails from Python applications.</p>

      <h2>Install</h2>
      <pre><code>{`pip install envoy-sdk`}</code></pre>

      <h2>Quick Start</h2>
      <pre><code>{`from envoy_sdk import ENovoy

envoy = ENovoy(api_key="fms_YOUR_API_KEY")

result = envoy.emails.send(
    to="user@example.com",
    from_address="hello@yourdomain.com",
    subject="Welcome!",
    html="<h1>Hello!</h1><p>Your account is ready.</p>",
)

print(result.id)  # queued message id`}</code></pre>

      <h2>Flask Integration</h2>
      <pre><code>{`from flask import Flask, request, jsonify
from envoy_sdk import ENovoy

app = Flask(__name__)
envoy = ENovoy(api_key="fms_YOUR_API_KEY")

@app.route('/send-welcome', methods=['POST'])
def send_welcome():
    data = request.json
    result = envoy.emails.send(
        to=data['email'],
        subject='Welcome!',
        html='<h1>Welcome!</h1>',
    )
    return jsonify({'id': result.id})`}</code></pre>

      <h2>Tags &amp; Scheduling</h2>
      <pre><code>{`result = envoy.emails.send(
    to="user@example.com",
    subject="Scheduled Report",
    html="<p>Your weekly report is ready.</p>",
    tags={"campaign": "weekly-report", "user_id": "123"},
    schedule_ms=3600000,  # 1 hour from now
)`}</code></pre>

      <h2>With Custom Host</h2>
      <pre><code>{`envoy = ENovoy(
    api_key="fms_YOUR_API_KEY",
    host="https://your-server.com",
)`}</code></pre>

      <div className="callout callout-tip">
        <strong>Tip:</strong> Use <code>python-dotenv</code> to load your API key from a <code>.env</code> file.
      </div>
    </div>
  );
}
