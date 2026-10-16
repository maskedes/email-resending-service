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
    description: 'Hero, feature grid and footer.',
    accent: '#22d3ee',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landing</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#0b0d12;color:#e6e8ee;font-family:${FONT};line-height:1.6}
  .wrap{max-width:64rem;margin:0 auto;padding:0 1.5rem}
  header{padding:1.2rem 0;display:flex;align-items:center;justify-content:space-between}
  .logo{font-weight:800;letter-spacing:-.02em}
  a.btn{text-decoration:none}
  .hero{padding:5rem 0 3rem;text-align:center}
  .hero h1{font-size:clamp(2.2rem,6vw,3.6rem);line-height:1.05;margin:0 0 1rem;letter-spacing:-.02em}
  .hero p{color:#9aa3b2;max-width:38rem;margin:0 auto 2rem}
  .cta{display:inline-block;padding:.85rem 1.5rem;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#04121a;font-weight:800}
  .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));padding:2rem 0 5rem}
  .card{border:1px solid #1e2331;background:#10131b;border-radius:16px;padding:1.4rem}
  .card h3{margin:.2rem 0 .5rem;font-size:1.05rem}
  .card p{color:#8b93a7;margin:0;font-size:.92rem}
  .dot{width:2rem;height:2rem;border-radius:9px;background:linear-gradient(135deg,#22d3ee,#3b82f6);display:grid;place-items:center;color:#04121a;font-weight:900}
  footer{border-top:1px solid #1a1f2b;color:#6b7280;font-size:.85rem;padding:1.5rem 0}
</style>
</head>
<body>
  <div class="wrap">
    <header><span class="logo">YourBrand</span><a class="btn" href="#">Sign in</a></header>
    <section class="hero">
      <h1>Build something people love.</h1>
      <p>A fast, modern starting point for your product. Replace this copy with your own and ship in minutes.</p>
      <a class="cta" href="#">Get started free</a>
    </section>
    <section class="grid">
      <div class="card"><div class="dot">1</div><h3>Fast</h3><p>Optimized for speed out of the box.</p></div>
      <div class="card"><div class="dot">2</div><h3>Simple</h3><p>No build tools. Just edit and publish.</p></div>
      <div class="card"><div class="dot">3</div><h3>Yours</h3><p>Own your domain and your content.</p></div>
    </section>
    <footer>&copy; 2026 YourBrand. All rights reserved.</footer>
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
