# INOVI Group: Corporate Website

Public website for INOVI Group Ltd (inovigroup.co.uk). Next.js 15 static export, Tailwind CSS 4, three.js
scenes. No server required. English at the root, French under `/fr/`.

## Pages

Two products, iSale and AGRO, built on one platform, FIRMA.

| English | French | What it is |
|---------|--------|-----------|
| `/` | `/fr/` | Home: the two products on a ring around FIRMA |
| `/isale/` | `/fr/isale/` | iSale: sales kept on strategy (the envelope scene) |
| `/agro/` | `/fr/agro/` | AGRO: smart irrigation (the soil scene) |
| `/firma/` | `/fr/firma/` | FIRMA: the platform under both |
| `/about/` | `/fr/a-propos/` | Company, team, contact |

`/trust-sensor/`, `/fides/` and `/firma/experience/` are earlier addresses of the deal product; they redirect to `/isale/`.

Copy lives next to each page, in English and French side by side: `src/components/*/copy.ts` or `content.ts`,
`src/components/firma/firmaCopy.ts`, shared strings in `src/i18n/ui.ts`. Paths, hreflang and the sitemap all come
from `ROUTES` in `src/i18n/index.ts`. Review switches: `?tune=1` (scene tuning), `?review=1` on iSale (layout /
scroll / outcome toggle).

## Development

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build and preview

```bash
npm run build                                  # static export to out/
python3 -m http.server 4321 --directory out    # then open http://localhost:4321/
```

Share images and icons in `public/` are generated: `node scripts/make-og.mjs`.

## Discoverability

- Per-page title, description, canonical, hreflang (en-GB / fr / x-default), Open Graph and Twitter cards with an image per page and language
- JSON-LD: Organization + WebSite (home), WebPage + BreadcrumbList on every page, SoftwareApplication (iSale, FIRMA), Product (AGRO), FAQPage (product pages)
- `sitemap.xml` with language alternates, `robots.txt`, `public/llms.txt`
- AI crawlers: search and answer bots are allowed, training-only crawlers are blocked. To change it, move bots between the two lists in `src/app/robots.ts`.

## Deployment

The live site is served by **Vercel** (response headers `server: Vercel`), apex `A 76.76.21.21`, `www` CNAME
`cname.vercel-dns.com`; DNS at Namecheap; email on Google Workspace (keep the MX/SPF/TXT records when moving).
Build command `npm run build`, output directory `out`. Real 301 redirects: `vercel.json` (Vercel) and
`public/_redirects` (Cloudflare Pages / Netlify). See `INOVI-PLAN.md` for the full deployment notes.
