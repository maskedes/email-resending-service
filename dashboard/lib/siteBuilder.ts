/**
 * Visual section model for the Sites builder.
 *
 * The editor edits a JSON section model; publishing renders that model to a
 * complete HTML document, so users never see code while the database still
 * stores a single self-contained `html` column (no migration needed).
 *
 * Round-tripping: the model is embedded inside the published HTML as a
 * `<!-- ENVOY-SITES:v1 <base64 json> -->` comment before </body>. Sites saved
 * by older versions have no marker and parse to a single "Custom HTML"
 * section so existing content is never lost.
 */

export const SITES_MARKER = 'ENVOY-SITES:v1';
const MARKER_RE = /<!--\s*ENVOY-SITES:v1\s+([A-Za-z0-9+/=]+)\s*-->/;

export type NavLink = { label: string; url: string };

export type Section =
  | { id: string; type: 'nav'; brand: string; links: NavLink[] }
  | {
      id: string;
      type: 'hero';
      eyebrow: string;
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaUrl: string;
      cta2Label: string;
      cta2Url: string;
      center: boolean;
    }
  | { id: string; type: 'text'; title: string; body: string; center: boolean }
  | { id: string; type: 'images'; title: string; images: { url: string; caption: string }[] }
  | {
      id: string;
      type: 'features';
      title: string;
      subtitle: string;
      items: { icon: string; title: string; body: string }[];
    }
  | { id: string; type: 'testimonials'; title: string; items: { quote: string; name: string; role: string }[] }
  | { id: string; type: 'contact'; title: string; subtitle: string; email: string; buttonLabel: string }
  | { id: string; type: 'links'; title: string; note: string; links: NavLink[] }
  | { id: string; type: 'footer'; brand: string; note: string; links: NavLink[] }
  | { id: string; type: 'legacy'; html: string };

export type SectionType = Exclude<Section['type'], 'legacy'>;

export type SiteTheme = { accent: string; mode: 'dark' | 'light' };

export type SiteModel = {
  theme: SiteTheme;
  sections: Section[];
};

export type SectionMeta = { label: string; hint: string };

export const SECTION_META: Record<SectionType | 'legacy', SectionMeta> = {
  nav: { label: 'Navigation', hint: 'Brand + menu links' },
  hero: { label: 'Hero section', hint: 'Big headline + buttons' },
  text: { label: 'Text and headings', hint: 'Paragraph of content' },
  images: { label: 'Images and gallery', hint: 'Grid of pictures' },
  features: { label: 'Features and services', hint: 'Cards with icons' },
  testimonials: { label: 'Testimonials', hint: 'Quotes from customers' },
  contact: { label: 'Contact section', hint: 'Email button' },
  links: { label: 'Link buttons', hint: 'Link-in-bio buttons' },
  footer: { label: 'Footer', hint: 'Copyright + links' },
  legacy: { label: 'Custom HTML (imported)', hint: 'Original page content' },
};

/** Section types shown in the ADD A SECTION palette (footer counts separately). */
export const PALETTE: SectionType[] = [
  'hero',
  'text',
  'images',
  'features',
  'testimonials',
  'contact',
  'links',
  'nav',
  'footer',
];

const nid = () => `s${Math.random().toString(36).slice(2, 9)}`;

/** Blank settings for a brand-new section of the given type. */
export function newSection(type: SectionType): Section {
  switch (type) {
    case 'nav':
      return {
        id: nid(),
        type: 'nav',
        brand: 'My site',
        links: [
          { label: 'Features', url: '#features' },
          { label: 'Contact', url: '#contact' },
        ],
      };
    case 'hero':
      return {
        id: nid(),
        type: 'hero',
        eyebrow: '',
        title: 'Build something amazing.',
        subtitle: 'Tell visitors about your business, products, or services.',
        ctaLabel: 'Get Started',
        ctaUrl: '#contact',
        cta2Label: '',
        cta2Url: '',
        center: true,
      };
    case 'text':
      return {
        id: nid(),
        type: 'text',
        title: 'About us',
        body: 'Your content and services appear here. Click to edit this text and make it yours.',
        center: false,
      };
    case 'images':
      return { id: nid(), type: 'images', title: 'Gallery', images: [] };
    case 'features':
      return {
        id: nid(),
        type: 'features',
        title: 'What we offer',
        subtitle: '',
        items: [
          { icon: '🚀', title: 'Fast', body: 'Quick to set up, quick to ship.' },
          { icon: '🤝', title: 'Simple', body: 'No code, no complexity.' },
          { icon: '💚', title: 'Yours', body: 'Your content, your brand.' },
        ],
      };
    case 'testimonials':
      return {
        id: nid(),
        type: 'testimonials',
        title: 'What people say',
        items: [
          { quote: 'Absolutely loved it. Highly recommended!', name: 'Alex P.', role: 'Customer' },
          { quote: 'Saved us hours every single week.', name: 'Sam K.', role: 'Founder' },
        ],
      };
    case 'contact':
      return {
        id: nid(),
        type: 'contact',
        title: 'Get in touch',
        subtitle: 'Questions or feedback? We reply fast.',
        email: 'you@example.com',
        buttonLabel: 'Email us',
      };
    case 'links':
      return {
        id: nid(),
        type: 'links',
        title: 'My site',
        note: 'All my links, one place.',
        links: [
          { label: 'My website', url: 'https://example.com' },
          { label: 'Follow us', url: 'https://example.com' },
        ],
      };
    case 'footer':
      return { id: nid(), type: 'footer', brand: 'My site', note: '© 2026', links: [] };
  }
}

/* ──────────────────────────── templates → section presets ─────────────── */

type Preset = { title: string; model: SiteModel };

const clone = (s: Section): Section => JSON.parse(JSON.stringify(s));

export function templateModel(templateId: string): Preset {
  const base = () => ({ theme: { accent: '#22d3ee', mode: 'dark' as const }, sections: [] as Section[] });

  if (templateId === 'coming-soon') {
    const hero = newSection('hero');
    Object.assign(hero, {
      eyebrow: 'Coming soon',
      title: 'Something great is on the way.',
      subtitle: 'Leave your email and be the first to know when we launch.',
      ctaLabel: 'Notify me',
      ctaUrl: '#contact',
      cta2Label: '',
      cta2Url: '',
    });
    const contact = Object.assign(newSection('contact'), {
      title: 'Stay in the loop',
      subtitle: '',
      email: 'you@example.com',
      buttonLabel: 'Notify me',
    });
    return {
      title: 'Coming soon',
      model: { theme: base().theme, sections: [hero, contact, newSection('footer')] },
    };
  }

  if (templateId === 'linkinbio') {
    const links = newSection('links');
    return { title: 'My links', model: { theme: { accent: '#a78bfa', mode: 'dark' }, sections: [links] } };
  }

  if (templateId === 'portfolio') {
    const hero = Object.assign(newSection('hero'), {
      eyebrow: 'Portfolio',
      title: 'Work that speaks for itself.',
      subtitle: 'A selection of recent projects and collaborations.',
      ctaLabel: 'View work',
      ctaUrl: '#gallery',
      cta2Label: '',
    });
    const images = Object.assign(newSection('images'), {
      id: 'gallery',
      title: 'Selected work',
      images: [
        { url: '', caption: 'Project one' },
        { url: '', caption: 'Project two' },
        { url: '', caption: 'Project three' },
      ],
    });
    const text = Object.assign(newSection('text'), { title: 'About me', body: 'Short bio goes here — who you are, what you do, and why you love it.' });
    return { title: 'My portfolio', model: { theme: { accent: '#34d399', mode: 'dark' }, sections: [newSection('nav'), hero, images, text, newSection('contact'), newSection('footer')] } };
  }

  if (templateId === 'product') {
    const hero = Object.assign(newSection('hero'), {
      eyebrow: 'New product',
      title: 'Meet the product your customers will love.',
      subtitle: 'Highlight what makes it special and send people to buy or learn more.',
      ctaLabel: 'Buy now',
      ctaUrl: '#contact',
      cta2Label: 'Details',
    });
    const features = Object.assign(newSection('features'), {
      title: 'Why customers pick it',
      subtitle: '',
      items: [
        { icon: '⭐', title: 'Better', body: 'What sets it apart from alternatives.' },
        { icon: '⚡', title: 'Faster', body: 'Results in minutes, not days.' },
        { icon: '🛟', title: 'Supported', body: 'Real humans answer your questions.' },
      ],
    });
    const images = Object.assign(newSection('images'), { title: 'See it in action', images: [{ url: '', caption: 'Front view' }, { url: '', caption: 'In use' }] });
    return { title: 'My product', model: { theme: base().theme, sections: [newSection('nav'), hero, features, images, newSection('contact'), newSection('footer')] } };
  }

  if (templateId === 'landing') {
    const hero = Object.assign(newSection('hero'), {
      eyebrow: '',
      title: 'Build something people love.',
      subtitle: 'A fast, modern landing page for your product. Edit every section without writing code.',
      ctaLabel: 'Get started',
      ctaUrl: '#contact',
      cta2Label: 'Learn more',
      cta2Url: '#features',
    });
    const features = Object.assign(newSection('features'), {
      title: 'Everything you need',
      subtitle: 'And nothing you don\u2019t.',
      items: [
        { icon: '⚡', title: 'Fast', body: 'Optimized for speed out of the box.' },
        { icon: '🧩', title: 'Flexible', body: 'Reorder sections anytime.' },
        { icon: '📱', title: 'Responsive', body: 'Looks great on every screen.' },
        { icon: '🔒', title: 'Yours', body: 'Own your domain and content.' },
      ],
    });
    return {
      title: 'Landing page',
      model: { theme: base().theme, sections: [newSection('nav'), hero, features, newSection('testimonials'), newSection('contact'), newSection('footer')] },
    };
  }

  // blank
  return { title: '', model: { theme: base().theme, sections: [Object.assign(newSection('hero'), { ctaLabel: 'Get Started', ctaUrl: '#contact' }), newSection('footer')] } };
}

/* ────────────────────────────── serialize / parse ─────────────────────── */

const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

const esc = (v: string) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Text color on top of an accent background (accent used for buttons). */
function onColor(hex: string): string {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.padEnd(6, '0');
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? '#0f172a' : '#ffffff';
}

function anchorHref(url: string): string {
  const u = url.trim();
  if (!u) return '#';
  if (u.startsWith('#') || u.startsWith('http') || u.startsWith('mailto:')) return esc(u);
  return esc(`https://${u}`);
}

function themeVars(t: SiteTheme): string {
  if (t.mode === 'light') {
    return `--acc:${t.accent};--accfg:${onColor(t.accent)};--bg:#ffffff;--fg:#0f172a;--muted:#475569;--card:#f8fafc;--bd:rgba(15,23,42,.1)`;
  }
  return `--acc:${t.accent};--accfg:${onColor(t.accent)};--bg:#0b0d12;--fg:#e6e8ee;--muted:#9aa3b2;--card:#10131b;--bd:rgba(255,255,255,.1)`;
}

const BASE_CSS = `
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:${FONT};line-height:1.6}
  .wrap{max-width:64rem;margin:0 auto;padding:0 1.5rem}
  section{padding:3.5rem 0}
  section:last-of-type{padding-bottom:2rem}
  h1,h2{line-height:1.15;letter-spacing:-.02em;margin:0 0 .6rem}
  h1{font-size:clamp(2rem,5.5vw,3.2rem)}
  h2{font-size:clamp(1.4rem,3vw,1.7rem)}
  h3{font-size:1.05rem;margin:.8rem 0 .4rem}
  p{margin:0 0 .8rem;color:var(--muted)}
  a{color:var(--acc)}
  .center{text-align:center}
  .center p{margin-inline:auto}
  .btn{display:inline-block;padding:.8rem 1.4rem;border-radius:12px;background:var(--acc);color:var(--accfg);font-weight:800;text-decoration:none;cursor:pointer;border:0;font-size:.95rem}
  .btn+.btn{margin-left:.6rem}
  .btn.ghost{background:none;border:1px solid var(--bd);color:var(--fg);font-weight:600}
  .sub{color:var(--muted);max-width:38rem}
  .center .sub{margin-inline:auto}
  .eyebrow{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--acc);border:1px solid var(--acc);border-radius:999px;padding:.3rem .85rem;display:inline-block;margin-bottom:1rem}
  header.nav{padding:1.1rem 0;display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--bd)}
  header.nav .logo{font-weight:800;letter-spacing:-.02em;font-size:1.02rem}
  header.nav nav{display:flex;gap:1.1rem;flex-wrap:wrap}
  header.nav nav a{color:var(--muted);text-decoration:none;font-size:.92rem}
  header.nav nav a:hover{color:var(--fg)}
  .grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .card{border:1px solid var(--bd);background:var(--card);border-radius:16px;padding:1.3rem}
  .card p{margin:0}
  .dot{width:2.2rem;height:2.2rem;border-radius:10px;background:var(--acc);color:var(--accfg);display:grid;place-items:center;font-size:1rem;font-weight:900}
  .imgs{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
  .imgs img{width:100%;height:180px;object-fit:cover;border-radius:14px;border:1px solid var(--bd);display:block;margin-bottom:.35rem}
  .ph{height:180px;border-radius:14px;border:1px dashed var(--bd);background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.01));display:grid;place-items:center;color:var(--muted);font-size:1.6rem;margin-bottom:.35rem}
  .cap{font-size:.82rem;color:var(--muted);text-align:center}
  .quote{font-size:1rem;color:var(--fg)}
  .who{margin-top:.7rem;font-size:.85rem;color:var(--muted)}
  .who b{color:var(--fg);display:block}
  footer.ft{border-top:1px solid var(--bd);padding:1.6rem 0;color:var(--muted);font-size:.85rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center}
  footer.ft nav{display:flex;gap:1rem;flex-wrap:wrap}
  footer.ft a{color:var(--muted);text-decoration:none}
  .links-page{min-height:100vh;display:grid;place-items:center;text-align:center;padding:3rem 0}
  .links-page .avatar{width:4.5rem;height:4.5rem;border-radius:999px;background:var(--acc);color:var(--accfg);display:grid;place-items:center;font-weight:900;font-size:1.8rem;margin:0 auto 1rem}
  .links-page .btn{display:block;width:100%;max-width:22rem;margin:0 0 .7rem}
  @media(max-width:600px){header.nav nav{display:none}section{padding:2.5rem 0}}
`;

function renderSection(s: Section): string {
  switch (s.type) {
    case 'nav': {
      const links = s.links
        .filter((l) => l.label.trim())
        .map((l) => `<a href="${anchorHref(l.url)}">${esc(l.label)}</a>`)
        .join('');
      return `<header class="nav"><span class="logo">${esc(s.brand || 'My site')}</span><nav>${links}</nav></header>`;
    }
    case 'hero': {
      const eyebrow = s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span><br>` : '';
      const cta = s.ctaLabel
        ? `<a class="btn" href="${anchorHref(s.ctaUrl || '#contact')}">${esc(s.ctaLabel)}</a>`
        : '';
      const cta2 = s.cta2Label
        ? `<a class="btn ghost" href="${anchorHref(s.cta2Url || '#')}">${esc(s.cta2Label)}</a>`
        : '';
      return [
        `<section class="${s.center ? 'center' : ''}" style="padding:4.5rem 0">`,
        eyebrow,
        `<h1>${esc(s.title)}</h1>`,
        s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : '',
        cta || cta2 ? `<div style="margin-top:1.4rem">${cta}${cta2}</div>` : '',
        '</section>',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'text': {
      const paras = s.body
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p) => `<p>${esc(p)}</p>`)
        .join('\n');
      return [
        `<section class="${s.center ? 'center' : ''}">`,
        s.title ? `<h2>${esc(s.title)}</h2>` : '',
        paras,
        '</section>',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'images': {
      const blocks = s.images.map((im) =>
        im.url.trim()
          ? `<figure style="margin:0"><img src="${esc(im.url)}" alt="${esc(im.caption)}" loading="lazy">${im.caption ? `<figcaption class="cap">${esc(im.caption)}</figcaption>` : ''}</figure>`
          : `<figure style="margin:0"><div class="ph">🖼️</div>${im.caption ? `<figcaption class="cap">${esc(im.caption)}</figcaption>` : ''}</figure>`
      );
      return [
        `<section id="gallery" class="${s.title ? '' : 'center'}">`,
        s.title ? `<h2>${esc(s.title)}</h2>` : '',
        `<div class="imgs">${blocks.join('\n') || '<div class="ph">🖼️</div>'}</div>`,
        '</section>',
      ].join('\n');
    }
    case 'features':
      return [
        `<section id="features" class="${s.subtitle ? '' : ''}">`,
        s.title ? `<h2>${esc(s.title)}</h2>` : '',
        s.subtitle ? `<p class="sub" style="margin-bottom:1.6rem">${esc(s.subtitle)}</p>` : '',
        `<div class="grid">${s.items
          .map(
            (it) =>
              `<div class="card"><div class="dot">${esc(it.icon || '•')}</div><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`
          )
          .join('\n')}${s.items.length === 0 ? '<div class="card"><h3>Add a feature</h3></div>' : ''}</div>`,
        '</section>',
      ].join('\n');
    case 'testimonials':
      return [
        `<section>`,
        s.title ? `<h2>${esc(s.title)}</h2>` : '',
        `<div class="grid">${s.items
          .map(
            (it) =>
              `<div class="card"><p class="quote">&ldquo;${esc(it.quote)}&rdquo;</p><p class="who"><b>${esc(it.name)}</b>${esc(it.role)}</p></div>`
          )
          .join('\n')}${s.items.length === 0 ? '<div class="card"><p>Add a testimonial</p></div>' : ''}</div>`,
        '</section>',
      ].join('\n');
    case 'contact':
      return [
        `<section id="contact" class="center">`,
        `<h2>${esc(s.title || 'Get in touch')}</h2>`,
        s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : '',
        `<div style="margin-top:1.4rem"><a class="btn" href="mailto:${esc(s.email || 'you@example.com')}">${esc(s.buttonLabel || 'Email us')}</a></div>`,
        `<p style="margin-bottom:0">${esc(s.email)}</p>`,
        '</section>',
      ].join('\n');
    case 'links':
      return [
        `<div class="links-page">`,
        `<div>`,
        `<div class="avatar">${esc((s.title || 'M').trim().charAt(0).toUpperCase())}</div>`,
        `<h1 style="font-size:1.5rem">${esc(s.title)}</h1>`,
        s.note ? `<p style="margin-bottom:1.6rem">${esc(s.note)}</p>` : '<div style="height:.8rem"></div>',
        `<div style="padding:0 1.5rem">`,
        s.links
          .map((l) => `<a class="btn" href="${anchorHref(l.url)}">${esc(l.label)}</a>`)
          .join('\n'),
        `</div></div></div>`,
      ].join('\n');
    case 'footer': {
      const links = s.links
        .filter((l) => l.label.trim())
        .map((l) => `<a href="${anchorHref(l.url)}">${esc(l.label)}</a>`)
        .join('');
      return `<footer class="ft"><span>${esc(s.brand || '')} ${esc(s.note || '')}</span><nav>${links}</nav></footer>`;
    }
    case 'legacy':
      return '<section id="custom-html"></section>';
  }
}

/** Pull the body inner HTML + inline <style> blocks out of a legacy document. */
function legacyInner(html: string): string {
  const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]).join('\n');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return `${styles}\n${body ? body[1] : html}`;
}

export function encodeModel(model: SiteModel): string {
  return btoa(encodeURIComponent(JSON.stringify(model)));
}

export function decodeModel(b64: string): SiteModel | null {
  try {
    const raw = JSON.parse(decodeURIComponent(atob(b64)));
    if (!raw || !Array.isArray(raw.sections)) return null;
    return { theme: raw.theme || { accent: '#22d3ee', mode: 'dark' }, sections: raw.sections as Section[] };
  } catch {
    return null;
  }
}

/**
 * Parse a stored site HTML back into a section model. Sites without the
 * builder marker become a single Custom HTML section (nothing is lost).
 */
export function parseModel(html: string): SiteModel {
  const m = html.match(MARKER_RE);
  if (m) {
    const model = decodeModel(m[1]);
    if (model) return model;
  }
  return {
    theme: { accent: '#22d3ee', mode: 'dark' },
    sections: [{ id: nid(), type: 'legacy', html }],
  };
}

/**
 * Render a model to the full published HTML document with the marker
 * embedded so the page round-trips into the editor.
 */
export function renderModel(model: SiteModel, title: string): string {
  // Pure legacy page (imported site, editor not yet touched): keep the
  // original document byte-for-byte and just append the marker.
  if (model.sections.length === 1 && model.sections[0].type === 'legacy') {
    const doc = model.sections[0].html;
    const marker = `<!-- ${SITES_MARKER} ${encodeModel(model)} -->`;
    return /<\/body>/i.test(doc)
      ? doc.replace(/<\/body>/i, `${marker}\n</body>`)
      : doc + marker;
  }

  const parts: string[] = [];
  for (const s of model.sections) {
    if (s.type === 'legacy') parts.push(legacyInner(s.html));
    else parts.push(renderSection(s));
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || 'My site')}</title>
<style>:root{${themeVars(model.theme)}}${BASE_CSS}</style>
</head>
<body>
${parts.join('\n')}
<!-- ${SITES_MARKER} ${encodeModel(model)} -->
</body>
</html>`;
}

/** True when a model contains only the imported-HTML section (visual list is empty). */
export function isOnlyLegacy(model: SiteModel): boolean {
  return model.sections.length === 1 && model.sections[0].type === 'legacy';
}
