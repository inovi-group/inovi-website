# INOVI Group — Corporate Website

Public website for INOVI Group Ltd (inovigroup.co.uk). Built with Next.js 15,
Tailwind CSS 4, and framer-motion. Static export — no server required.

## Pages

| Route | Audience register |
|-------|------------------|
| `/` | Corporate — vision + concrete proofs |
| `/isale` | Clients — pragmatic, ROI-focused |
| `/agro` | Agritech partners — field impact |
| `/firma` | Technical — sober, measurable |
| `/about` | Company, team, contact |

## Development

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build    # static export to out/
```

## Deployment

Deployed on Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `out`
- Custom domain: `inovigroup.co.uk`
