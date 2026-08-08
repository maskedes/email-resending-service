interface OverviewData {
  apiKeys: Array<Record<string, any>>;
  emails: Array<Record<string, any>>;
  stats: { total: number; sent: number; failed: number; queued: number };
}

export function renderOverview({ apiKeys, emails, stats }: OverviewData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-NVOY - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e0e0e0; }
    .header { background: linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%); padding: 20px 40px; border-bottom: 1px solid #333; }
    .header h1 { font-size: 24px; color: #fff; }
    .header h1 span { color: #7c3aed; }
    .container { max-width: 1200px; margin: 0 auto; padding: 30px 40px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
    .stat-card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 24px; }
    .stat-card h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .stat-card .value { font-size: 36px; font-weight: 700; }
    .stat-card.sent .value { color: #10b981; }
    .stat-card.failed .value { color: #ef4444; }
    .stat-card.queued .value { color: #f59e0b; }
    .stat-card.total .value { color: #7c3aed; }
    .section { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
    .section h2 { font-size: 18px; margin-bottom: 20px; color: #fff; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 1px solid #2a2a4a; }
    td { padding: 12px 16px; border-bottom: 1px solid #1f1f3a; font-size: 14px; }
    tr:hover { background: #1f1f3a; }
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-sent { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-failed { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-queued { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .btn-primary { background: #7c3aed; color: #fff; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .key-display { background: #0f0f23; padding: 10px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #10b981; border: 1px solid #2a2a4a; margin-top: 10px; word-break: break-all; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; color: #888; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 10px 14px; background: #0f0f23; border: 1px solid #2a2a4a; border-radius: 8px; color: #e0e0e0; font-size: 14px; }
    .form-group input:focus { outline: none; border-color: #7c3aed; }
    .inline-form { display: flex; gap: 16px; align-items: flex-end; }
    .inline-form .form-group { flex: 1; margin-bottom: 0; }
    .code-block { background: #0f0f23; padding: 20px; border-radius: 8px; border: 1px solid #2a2a4a; margin-top: 16px; }
    .code-block pre { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #a5b4fc; white-space: pre-wrap; }
    .code-block code { color: #e0e0e0; }
    .empty { text-align: center; padding: 40px; color: #666; }
    .api-docs h3 { margin: 20px 0 10px; color: #a5b4fc; font-size: 15px; }
    .api-docs p { color: #aaa; font-size: 14px; line-height: 1.6; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 8px; }
    .method-post { background: #10b981; color: #000; }
    .method-get { background: #3b82f6; color: #fff; }
    .method-delete { background: #ef4444; color: #fff; }
    .header-inner { display: flex; align-items: center; justify-content: space-between; }
    .logout { background: transparent; border: 1px solid #3a3a5a; color: #bbb; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
    .logout:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #fca5a5; }
    .copy-btn { margin-left: 8px; padding: 8px 14px; background: #1f2937; border: 1px solid #2a2a4a; color: #a5b4fc; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .copy-btn:hover { border-color: #7c3aed; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #10b981; color: #000; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 100; }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <h1>📬 Free<span>Mail</span>Send</h1>
      <form method="POST" action="/logout">
        <button type="submit" class="logout">Log out</button>
      </form>
    </div>
  </div>
  <div class="toast" id="toast">Copied!</div>
  <div class="container">
    <div class="stats">
      <div class="stat-card total"><h3>Total Emails</h3><div class="value">${stats?.total || 0}</div></div>
      <div class="stat-card sent"><h3>Delivered</h3><div class="value">${stats?.sent || 0}</div></div>
      <div class="stat-card failed"><h3>Failed</h3><div class="value">${stats?.failed || 0}</div></div>
      <div class="stat-card queued"><h3>Queued</h3><div class="value">${stats?.queued || 0}</div></div>
    </div>

    <div class="section">
      <h2>🔑 Generate Token</h2>
      <form id="createKeyForm" class="inline-form">
        <div class="form-group"><label>Name</label><input type="text" id="keyName" placeholder="My App" required></div>
        <div class="form-group"><label>Email</label><input type="email" id="keyEmail" placeholder="you@example.com" required></div>
        <button type="submit" class="btn btn-primary">Generate Token</button>
      </form>
      <div id="newKeyDisplay" style="display:none; margin-top:16px;">
        <p style="color:#10b981; font-size:13px; margin-bottom:6px;">✅ Token generated! Copy it now - it won't be shown again:</p>
        <div class="key-display" id="newKeyValue" style="display:inline-block;"></div>
        <button class="copy-btn" id="copyKeyBtn">📋 Copy</button>
      </div>
    </div>

    <div class="section">
      <h2>📋 API Keys</h2>
      ${apiKeys.length === 0 ? '<p class="empty">No API keys yet. Create one above.</p>' : `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Emails Sent</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>
          ${apiKeys.map(k => `
          <tr>
            <td>${k.name}</td>
            <td>${k.email}</td>
            <td><span class="badge ${k.is_active ? 'badge-sent' : 'badge-failed'}">${k.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${k.total_emails_sent}</td>
            <td>${new Date(k.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deactivateKey('${k.id}')">Revoke</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="section">
      <h2>📨 Recent Emails</h2>
      ${emails.length === 0 ? '<p class="empty">No emails sent yet.</p>' : `
      <table>
        <thead><tr><th>From</th><th>To</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${emails.slice(0, 20).map(e => `
          <tr>
            <td>${e.from_email}</td>
            <td>${e.to_email}</td>
            <td>${e.subject}</td>
            <td><span class="badge badge-${e.status}">${e.status}</span></td>
            <td>${new Date(e.created_at).toLocaleDateString()}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="section api-docs">
      <h2>📖 API Documentation</h2>
      <p>Use these endpoints to send emails programmatically.</p>

      <h3><span class="method method-post">POST</span> /api/emails/send</h3>
      <div class="code-block"><pre>curl -X POST http://localhost:3000/api/emails/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "from": "Your Name &lt;noreply@yourdomain.com&gt;",
    "to": "recipient@example.com",
    "subject": "Hello from E-NVOY",
    "html": "&lt;h1&gt;Welcome!&lt;/h1&gt;&lt;p&gt;This is your first email.&lt;/p&gt;",
    "text": "Welcome! This is your first email."
  }'</pre></div>

      <h3><span class="method method-get">GET</span> /api/emails</h3>
      <p>List all emails sent with your API key. Supports <code>?limit=50&offset=0</code> query params.</p>

      <h3><span class="method method-get">GET</span> /api/emails/:id</h3>
      <p>Get details and delivery events for a specific email.</p>

      <h3><span class="method method-get">GET</span> /api/emails/stats</h3>
      <p>Get sending statistics for your API key.</p>

      <h3><span class="method method-post">POST</span> /api/apikeys</h3>
      <div class="code-block"><pre>curl -X POST http://localhost:3000/api/apikeys \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My App", "email": "you@example.com"}'</pre></div>
    </div>
  </div>

  <script>
    const toast = document.getElementById('toast');
    function showToast(msg) {
      toast.textContent = msg || 'Copied!';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied!');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!');
      }
    }

    document.getElementById('createKeyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('keyName').value;
      const email = document.getElementById('keyEmail').value;
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, email})
      });
      const data = await res.json();
      if (data.key) {
        document.getElementById('newKeyValue').textContent = data.key;
        document.getElementById('newKeyDisplay').style.display = 'block';
        document.getElementById('keyName').value = '';
        document.getElementById('keyEmail').value = '';
        setTimeout(() => location.reload(), 2500);
      } else {
        alert(data.error?.message || 'Failed to create key');
      }
    });

    document.getElementById('copyKeyBtn').addEventListener('click', () => {
      const key = document.getElementById('newKeyValue').textContent;
      if (key) copyText(key);
    });

    async function deactivateKey(id) {
      if (!confirm('Are you sure you want to revoke this API key?')) return;
      await fetch('/api/apikeys/' + id, { method: 'DELETE' });
      location.reload();
    }
  </script>
</body>
</html>`;
}
