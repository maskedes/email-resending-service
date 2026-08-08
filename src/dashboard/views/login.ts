export const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-NVOY - Sign in</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 16px; padding: 40px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo h1 { font-size: 26px; color: #fff; }
    .logo h1 span { color: #7c3aed; }
    .logo p { color: #888; font-size: 13px; margin-top: 6px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-size: 13px; color: #888; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 12px 14px; background: #0f0f23; border: 1px solid #2a2a4a; border-radius: 8px; color: #e0e0e0; font-size: 14px; }
    .form-group input:focus { outline: none; border-color: #7c3aed; }
    .btn { width: 100%; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-size: 15px; font-weight: 600; background: #7c3aed; color: #fff; transition: background 0.2s; }
    .btn:hover { background: #6d28d9; }
    .error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .hint { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">
      <h1>📬 Free<span>Mail</span>Send</h1>
      <p>Sign in to your dashboard</p>
    </div>
    <form method="POST" action="/login">
      <div class="form-group">
        <label>Username</label>
        <input type="text" name="username" placeholder="admin" required autofocus>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn">Sign In</button>
    </form>
    <p class="hint">Default credentials are set in your <code>.env</code> file.</p>
  </div>
</body>
</html>`;
