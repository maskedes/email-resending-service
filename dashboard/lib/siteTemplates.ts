/**
 * Starter templates for user sites. Each is a complete, self-contained HTML
 * document (inline CSS, no external assets) so it renders anywhere — in the
 * live editor preview and on the published subdomain.
 */

export type SiteTemplate = {
  id: string;
  name: string;
  description: string;
  /** Small inline SVG-ish swatch shown on the template card. */
  accent: string;
  html: string;
};

const FONT =
  'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'A clean empty canvas to start from.',
    accent: '#6b7280',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My site</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e6e8ee;font-family:${FONT}}
  main{max-width:40rem;padding:3rem;text-align:center}
  .badge{display:inline-block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#8b93a7;border:1px solid #232838;border-radius:999px;padding:.3rem .8rem}
  h1{font-size:1.8rem;margin:1.1rem 0 .5rem}
  p{color:#9aa3b2;line-height:1.65;margin:0}
</style>
</head>
<body>
  <main>
    <span class="badge">New site</span>
    <h1>Your new page</h1>
    <p>Edit the HTML on the left — the preview updates live.</p>
  </main>
</body>
</html>`,
  },
  {
    id: 'coming-soon',
    name: 'Coming soon',
    description: 'Centered launch page with an email signup.',
    accent: '#8b5cf6',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coming soon</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;
    background:radial-gradient(1200px 600px at 50% -10%,#2a1e5c 0%,#0b0d12 55%);color:#eef1f7;font-family:${FONT};padding:2rem}
  .badge{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:#b9a8ff;border:1px solid #39306a;border-radius:999px;padding:.35rem .9rem}
  h1{font-size:clamp(2rem,6vw,3.4rem);margin:1.2rem 0 .6rem;line-height:1.05}
  p{color:#a9b1c4;max-width:34rem;margin:0 auto 1.8rem;line-height:1.6}
  form{display:flex;gap:.5rem;max-width:26rem;margin:0 auto;flex-wrap:wrap;justify-content:center}
  input{flex:1;min-width:14rem;padding:.8rem 1rem;border-radius:10px;border:1px solid #2b3145;background:#12151d;color:#fff;font-size:.95rem}
  button{padding:.8rem 1.3rem;border:0;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-weight:700;cursor:pointer}
  .fine{margin-top:1rem;color:#6b7280;font-size:.8rem}
</style>
</head>
<body>
  <div>
    <span class="badge">Launching soon</span>
    <h1>Something great is&nbsp;coming.</h1>
    <p>Be the first to know when we go live. Drop your email and we&rsquo;ll keep you posted.</p>
    <form onsubmit="event.preventDefault();this.querySelector('button').textContent='Thanks!'">
      <input type="email" placeholder="you@example.com" required>
      <button type="submit">Notify me</button>
    </form>
  </div>
</body>
</html>`,
  },
  {
    id: 'landing',
    name: 'Landing page',
    description: 'Envoy homepage: hero, features, developer docs, pricing and footer.',
    accent: '#22d3ee',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E-NVOY — Free Open Source Email Sending Service</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#07080d;color:#e6e8ee;font-family:${FONT};line-height:1.6}
  .wrap{max-width:64rem;margin:0 auto;padding:0 1.5rem}
  header{padding:1.2rem 0;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .logo{font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:.5rem}
  .logo span{font-size:1.05rem}
  nav a{color:#9aa3b2;text-decoration:none;font-size:.92rem;margin-left:1.2rem}
  nav a:hover{color:#e6e8ee}
  a.btn{text-decoration:none}
  .ghost{border:1px solid #2a3141;border-radius:10px;padding:.55rem 1.05rem;color:#c8cedb;font-weight:600}
  .ghost:hover{border-color:#3b82f6;color:#fff}
  .cta{display:inline-block;padding:.85rem 1.5rem;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#04121a;font-weight:800}
  .cta.ghosted{background:none;border:1px solid #2a3141;color:#c8cedb;font-weight:600}
  .cta.ghosted:hover{border-color:#3b82f6}
  .hero{padding:5rem 0 3rem;text-align:center}
  .eyebrow{font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:#7ee7f5;border:1px solid #123b4a;border-radius:999px;padding:.35rem .9rem;display:inline-block}
  .hero h1{font-size:clamp(2.2rem,6vw,3.6rem);line-height:1.05;margin:1.2rem 0 1rem;letter-spacing:-.02em}
  .hero h1 em{font-style:normal;background:linear-gradient(135deg,#22d3ee,#818cf8);-webkit-background-clip:text;background-clip:text;color:transparent}
  .hero p{color:#9aa3b2;max-width:40rem;margin:0 auto 2rem}
  .buttons{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap}
  .pane{border:1px solid #1e2331;background:#0c0f16;border-radius:14px;max-width:36rem;margin:2.5rem auto 0;padding:1.1rem 1.2rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.85rem;color:#9aa3b2;text-align:left}
  .pane .g{color:#34d399}
  .pane .c{color:#22d3ee}
  h2{font-size:1.7rem;letter-spacing:-.02em;margin:0 0 .4rem}
  .sub{color:#8b93a7;margin:0 0 2rem}
  .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));padding:.5rem 0 4rem}
  .card{border:1px solid #1e2331;background:#10131b;border-radius:16px;padding:1.4rem}
  .card h3{margin:.8rem 0 .5rem;font-size:1.05rem}
  .card p{color:#8b93a7;margin:0;font-size:.92rem}
  .dot{width:2.2rem;height:2.2rem;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#3b82f6);display:grid;place-items:center;color:#04121a;font-weight:900;font-size:1rem}
  .dev{border:1px solid #1e2331;background:#10131b;border-radius:16px;padding:1.6rem;display:grid;gap:1.4rem;margin-bottom:4rem}
  @media(min-width:760px){.dev{grid-template-columns:1fr 1fr;align-items:center}}
  .dev ul{color:#8b93a7;padding-left:1.1rem;margin:.8rem 0 0}
  .dev li{margin:.3rem 0}
  .price{border:1px solid #1e3a4a;background:linear-gradient(180deg,#0d1420,#10131b);border-radius:16px;padding:1.8rem;max-width:26rem;margin:0 auto 4rem;text-align:center}
  .price .amount{font-size:2.4rem;font-weight:900;letter-spacing:-.03em}
  .price .per{color:#6b7280;font-size:.9rem}
  .price ul{list-style:none;padding:0;margin:1.2rem 0 1.6rem;color:#9aa3b2;font-size:.95rem}
  .price li{margin:.45rem 0}
  .price .free{display:inline-block;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#34d399;border:1px solid #14532d;border-radius:999px;padding:.3rem .8rem;margin-bottom:.8rem}
  footer{border-top:1px solid #1a1f2b;padding:2rem 0;color:#6b7280;font-size:.85rem}
  .cols{display:flex;justify-content:space-between;gap:1.5rem;flex-wrap:wrap}
  footer a{color:#8b93a7;text-decoration:none;margin-left:.1rem}
  footer a:hover{color:#22d3ee}
  .links{display:flex;gap:1.2rem;flex-wrap:wrap}
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <span class="logo">&#9993;&#65039; <span>E-NVOY</span></span>
      <nav><a href="#features">Features</a><a href="#developers">Developers</a><a href="#pricing">Pricing</a></nav>
      <a class="btn ghost" href="https://mailenvoy.qd.je/login">Sign in</a>
    </header>

    <section class="hero">
      <span class="eyebrow">Open source &middot; Free forever</span>
      <h1>Envoy &mdash; <em>email infrastructure</em> for&nbsp;developers.</h1>
      <p>Send transactional emails, marketing campaigns and templated notifications with a single API &mdash; then track every send, delivery and bounce in real time.</p>
      <div class="buttons">
        <a class="cta" href="https://mailenvoy.qd.je/signup">Get Started</a>
        <a class="cta ghosted" href="https://mailenvoy.qd.je/documentation">View Documentation</a>
      </div>
      <div class="pane">
        curl -X POST https://api.mailenvoy.qd.je/emails/send<br>
        &nbsp;&nbsp;-H <span class="c">"x-api-key: YOUR_API_KEY"</span> \\<br>
        &nbsp;&nbsp;-d <span class="g">'{"to":"user@example.com","subject":"Hello","text":"Welcome!"}'</span>
      </div>
    </section>

    <section id="features">
      <h2>Everything email, one platform.</h2>
      <p class="sub">Built for makers who ship.</p>
      <div class="grid">
        <div class="card"><div class="dot">&#128640;</div><h3>Transactional Emails</h3><p>Welcome, verification, password resets and receipts &mdash; delivered with one reliable send API.</p></div>
        <div class="card"><div class="dot">&#128200;</div><h3>Marketing Campaigns</h3><p>Newsletters and promotional templates with placeholders for personalization at scale.</p></div>
        <div class="card"><div class="dot">&#128196;</div><h3>Templates</h3><p>30+ production-ready templates with &#123;&#123;variables&#125;&#125; &mdash; reuse them instantly or create your own.</p></div>
        <div class="card"><div class="dot">&#128225;</div><h3>Delivery Tracking</h3><p>Live logs with queued, sent, delivered, failed and bounced states on every single send.</p></div>
      </div>
    </section>

    <section id="developers" class="dev">
      <div>
        <h2>Made for developers.</h2>
        <p style="color:#8b93a7;margin:.4rem 0 0">A clean REST API with keys you control &mdash; roll, revoke and scope them freely.</p>
        <ul>
          <li>REST API with well-documented endpoints</li>
          <li>Per-key rate limits and device-gateway SMS</li>
          <li>Webhooks for delivery events</li>
          <li>Self-hosted image &mdash; your infra, your data</li>
        </ul>
        <p style="margin-top:1.2rem"><a class="btn" href="https://mailenvoy.qd.je/documentation" style="color:#22d3ee;font-weight:700">Read the API docs &rarr;</a></p>
      </div>
      <div class="pane" style="margin:0">
        <span class="g">import</span> requests<br><br>
        r = requests.post(<span class="c">"https://api.mailenvoy.qd.je/emails/send"</span>,<br>
        &nbsp;&nbsp;json={<span class="c">"to"</span>: <span class="c">"user@example.com"</span>,<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="c">"subject"</span>: <span class="c">"Hello"</span>,
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="c">"text"</span>: <span class="c">"Welcome!"</span>},<br>
        &nbsp;&nbsp;headers={<span class="c">"x-api-key"</span>: KEY})<br><br>
        <span style="color:#6b7280"># 200 OK &mdash; queued in ms</span>
      </div>
    </section>

    <section id="pricing">
      <h2>Pricing that respects builders.</h2>
      <p class="sub">No billing, no tiers, no meters.</p>
      <div class="price">
        <span class="free">Free forever</span>
        <div class="amount">$0</div>
        <span class="per">no credit card required</span>
        <ul>
          <li>&#10003; Unlimited templates</li>
          <li>&#10003; Full API access</li>
          <li>&#10003; Delivery tracking &amp; logs</li>
          <li>&#10003; Domains, webhooks &amp; SMS gateway</li>
        </ul>
        <a class="cta" href="https://mailenvoy.qd.je/signup">Start Free</a>
      </div>
    </section>

    <footer>
      <div class="cols">
        <div>&copy; 2026 E-NVOY. Free, open-source email sending.</div>
        <div class="links">
          <a href="mailto:support@mailenvoy.qd.je">support@mailenvoy.qd.je</a>
          <a href="https://mailenvoy.qd.je/privacy">Privacy Policy</a>
          <a href="https://mailenvoy.qd.je/privacy">Terms</a>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Personal profile with project list.',
    accent: '#f59e0b',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#faf7f2;color:#1c1917;font-family:${FONT}}
  .wrap{max-width:56rem;margin:0 auto;padding:4rem 1.5rem}
  .avatar{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);display:grid;place-items:center;color:#fff;font-weight:900;font-size:1.5rem}
  h1{font-size:2.2rem;margin:1.2rem 0 .3rem;letter-spacing:-.02em}
  .sub{color:#78716c;margin:0 0 2.5rem}
  .project{display:flex;justify-content:space-between;gap:1rem;padding:1.2rem 0;border-top:1px solid #e7e2d9;text-decoration:none;color:inherit}
  .project:hover{background:#f3eee6}
  .project h3{margin:0 0 .25rem;font-size:1.05rem}
  .project p{margin:0;color:#78716c;font-size:.9rem}
  .year{color:#a8a29e;font-variant-numeric:tabular-nums}
</style>
</head>
<body>
  <div class="wrap">
    <div class="avatar">ME</div>
    <h1>Your Name</h1>
    <p class="sub">Designer &amp; developer building calm, useful products.</p>
    <a class="project" href="#"><span><h3>Project One</h3><p>A short description of the work and your role.</p></span><span class="year">2025</span></a>
    <a class="project" href="#"><span><h3>Project Two</h3><p>Another selected piece from your portfolio.</p></span><span class="year">2024</span></a>
    <a class="project" href="#"><span><h3>Project Three</h3><p>Case study, experiment or client work.</p></span><span class="year">2023</span></a>
  </div>
</body>
</html>`,
  },
  {
    id: 'links',
    name: 'Link in bio',
    description: 'Stacked buttons for all your links.',
    accent: '#ec4899',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Links</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:linear-gradient(180deg,#170b1f,#0b0d12);color:#fff;font-family:${FONT};display:flex;justify-content:center;padding:3rem 1.2rem}
  .stack{width:100%;max-width:26rem;text-align:center}
  .avatar{width:84px;height:84px;border-radius:50%;margin:0 auto 1rem;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:grid;place-items:center;font-size:2rem}
  h1{font-size:1.3rem;margin:0 0 .3rem}
  .bio{color:#c4b5d4;margin:0 0 1.8rem;font-size:.95rem}
  a.link{display:block;padding:.95rem 1rem;margin-bottom:.7rem;border-radius:14px;border:1px solid #ffffff1a;background:#ffffff0d;color:#fff;text-decoration:none;font-weight:600;transition:transform .12s ease,background .12s ease}
  a.link:hover{background:#ffffff1a;transform:translateY(-1px)}
</style>
</head>
<body>
  <div class="stack">
    <div class="avatar">&#128248;</div>
    <h1>@yourhandle</h1>
    <p class="bio">Creator &middot; building things on the internet.</p>
    <a class="link" href="#">&#128279; My website</a>
    <a class="link" href="#">&#127925; Latest release</a>
    <a class="link" href="#">&#128221; Newsletter</a>
    <a class="link" href="#">&#128188; Work with me</a>
  </div>
</body>
</html>`,
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Feature page with pricing card.',
    accent: '#10b981',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Product</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f8fafc;color:#0f172a;font-family:${FONT}}
  .wrap{max-width:62rem;margin:0 auto;padding:4rem 1.5rem}
  .top{display:grid;gap:2.5rem;grid-template-columns:1.1fr .9fr;align-items:center}
  @media(max-width:760px){.top{grid-template-columns:1fr}}
  .kicker{color:#10b981;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem}
  h1{font-size:clamp(2rem,5vw,3rem);line-height:1.05;margin:.6rem 0 1rem;letter-spacing:-.02em}
  p.lead{color:#475569;font-size:1.05rem;margin:0 0 1.5rem}
  .btn{display:inline-block;padding:.8rem 1.4rem;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}
  .price{border:1px solid #e2e8f0;border-radius:20px;padding:2rem;background:#fff;box-shadow:0 20px 40px -24px #0f172a33}
  .price .amt{font-size:2.6rem;font-weight:900}
  .price ul{list-style:none;padding:0;margin:1rem 0 1.5rem;color:#475569}
  .price li{padding:.35rem 0}
  .price li::before{content:"\\2713";color:#10b981;font-weight:900;margin-right:.5rem}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <span class="kicker">New release</span>
        <h1>The simplest way to ship your site.</h1>
        <p class="lead">Everything you need to launch, in one place. No servers, no setup — just your page, live in seconds.</p>
        <a class="btn" href="#">Start free</a>
      </div>
      <div class="price">
        <div class="amt">$0</div>
        <div style="color:#64748b">forever</div>
        <ul><li>Custom subdomain</li><li>Unlimited edits</li><li>Instant publishing</li></ul>
        <a class="btn" href="#" style="display:block;text-align:center">Get started</a>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
];

export const DEFAULT_TEMPLATE = SITE_TEMPLATES[0];
