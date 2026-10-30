# Dashboard design tokens — Brevo-inspired

> Extracted from a render scan of app.brevo.com (logged-in shell) as design cues.
> These are observations we rebuild with our own CSS — no proprietary styles copied.

## Palette

| Token | Value | Use |
|---|---|---|
| `--brand-header-bg` | `#E8FEDF` (rgb 232,254,223) | pale mint top bar |
| `--brand-primary` | Brevo green (logo) | logo/CTA accents — pick our own green, e.g. `#0B996E` |
| `--text-primary` | `#1B1B1B` (rgb 27,27,27) | headings, body |
| `--bg-page` | `#FFFFFF` | page background |
| `--shadow-soft` | `0 1px 2px rgba(28,28,28,0.08)` | cards, pill buttons |

## Typography

- Font stack: `Inter`, fallback `Arial, ui-sans-serif, system-ui`
- Load via `next/font` (`next/font/google` → Inter, weights 400/500/600/700)
- Header text 16px; pill button labels ~13–14px medium

## Shape & components

- **Pill buttons**: border-radius `16px`, no heavy borders, soft shadow, white bg
- **Header**: full-width flat bar, 0px radius, no shadow — flat mint strip by default
- **Nav pattern**: top bar + primary sections (Home / CRM / Marketing / Automations / Transactional / Conversations / Commerce / Library / Analytics) — a flat top-nav, not a sidebar
- **Dark-on-light minimalism**: no gradient chrome; hierarchy via spacing + weight

## Mapping to E-NVOY dashboard

| Brevo area | Our page |
|---|---|
| Home | `/overview` |
| Transactional (stats + log table) | `/overview/logs` — LIVE badge realtime table |
| API keys mgmt | `/overview/keys` |
| Domains | `/overview/domains` |

## Suggested `globals.css` variables

```css
:root {
  --brand-header-bg: #e8fedf;
  --text-primary: #1b1b1b;
  --bg-page: #ffffff;
  --shadow-soft: 0 1px 2px rgba(28, 28, 28, 0.08);
  --radius-pill: 16px;
  --radius-card: 12px;
}
body {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-inter, Inter), Arial, ui-sans-serif, system-ui, sans-serif;
}
.header-bar { background: var(--brand-header-bg); }
.btn-pill {
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-soft);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
}
.card {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: 20px;
}
```
