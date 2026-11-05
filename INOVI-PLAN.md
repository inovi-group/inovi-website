# Inovi website: deployment, discoverability and page restructure (Phase A plan)

Branch: `inovi-ramble-1105` (local only, from `feature/firma-envelope` @ 6b38ed0). Nothing pushed or deployed.
Source of the request: `Omar Ramblings/Inovi.md`. Date: 2026-11-05.

**Status:** this is a plan only. No site code has changed yet. Phase B starts when you say go.

---

## 1. How the site is deployed today

### Facts I checked (repo + public DNS/HTTP, no logins)

| What | Finding | How I know |
|---|---|---|
| Hosting | **Vercel** (not Cloudflare Pages) | Live responses carry `server: Vercel`, `x-vercel-id: cdg1::…` (Paris edge), `x-vercel-cache: HIT` |
| Apex DNS | `inovigroup.co.uk A 76.76.21.21` (Vercel's anycast IP) | DNS lookup |
| `www` | `CNAME cname.vercel-dns.com` | DNS lookup |
| DNS provider / registrar | Nameservers `dns1/dns2.registrar-servers.com`, which is **Namecheap** BasicDNS | NS lookup |
| Email | Google Workspace (`MX 1 smtp.google.com`, SPF `include:_spf.google.com`) | DNS lookup |
| Google Search Console | A `google-site-verification=…` TXT record exists, so someone verified the domain | TXT lookup |
| TLS | Let's Encrypt cert for **`inovigroup.co.uk` only** (valid until 2026-12-18) | openssl |
| HTTP → HTTPS | `308` to `https://inovigroup.co.uk/` | curl |
| `www` → apex | `307` (temporary) redirect, **and the cert has no `www` name**, so `https://www.inovigroup.co.uk` shows a certificate warning in browsers | curl / openssl |
| Trailing slashes | `/isale` → `308` → `/isale/` (from `trailingSlash: true`) | curl |
| Build | Next.js 15, `output: "export"` (static HTML to `out/`), Tailwind 4, three.js scenes | `next.config.ts`, `package.json` |
| What's live | **`main` (fef347f, 2026-08-03)**: the old 2D site, iSale linking out to `isale-ts.uk`. Live `/trust-sensor/`, `/fides/` and `/llms.txt` return 404. The 3D pages on the feature branches are **not live**. | Live HTML and sitemap match `main` |
| CI/CD in the repo | None: no `.github/workflows`, no `vercel.json`, no Dockerfile | repo tree |
| Git remote | `github.com/inovi-group/inovi-website` | `git remote -v` |

### My best guesses (not verified)

- Vercel's GitHub integration builds the `main` branch of `inovi-group/inovi-website` automatically on push. There's no deploy config in the repo, and the live site matches `main`. **Guess, but a strong one.**
- The Vercel project runs `next build` with the default settings and serves the static export.
- The README says "Deployed on Cloudflare Pages". That's **out of date**, or it was the plan and nobody did it. Fix the README in Phase B.
- `isale-ts.uk` (the iSale app) is a separate host (`192.64.119.164`, a Namecheap-range IP). It isn't part of this site.

### What you need to replace the hosting later

1. **Output.** The site is plain static files (`npm run build` produces `out/`), so any static host works: Cloudflare Pages, Netlify, S3+CloudFront, nginx, GitHub Pages.
2. **Behaviour Vercel gives us for free that a new host must copy:**
   - HTTPS, plus HTTP→HTTPS 308
   - `www` → apex as a **301/308**, with a cert that covers `www` (today it doesn't)
   - Trailing-slash redirects (`/isale` → `/isale/`), or serve `isale/index.html` for `/isale`
   - A custom 404 page (`out/404.html`)
   - Long cache on `/_next/static/*` (immutable) and short cache on HTML
3. **Real server redirects.** Today moved pages use a meta-refresh page (`src/components/Redirect.tsx`), because a static export can't send 301s. A new host should send real **301s** for `/fides/`, `/trust-sensor/` and `/firma/experience/` (Cloudflare `_redirects`, Netlify `_redirects`, or `vercel.json` if we stay). I'll add a host-neutral `_redirects` file in Phase B.
4. **DNS cut-over at Namecheap.**
   - Change the apex A record and the `www` CNAME.
   - Leave the **MX/SPF/Google verification TXT untouched** (email runs on Google).
   - Lower the TTL a day before the switch.
5. **Access we need from the owner** (I didn't and won't log in):
   - the Vercel account/team
   - the Namecheap account
   - Search Console, so we can resubmit the sitemap after the move
6. **Quick fix you can do today, without moving.** In Vercel, add `www.inovigroup.co.uk` to the project's domains and set it to redirect permanently to the apex. That issues the `www` cert and fixes the 307.

---

## 2. Discoverability plan (search + AI)

Audit of this branch's build (`out/`) and of the live site:

| Item | Now | Gap |
|---|---|---|
| `<title>` / meta description | Set per page, good | Home description still pitches a "<50ms governance proxy", which doesn't match the products. Rewrite it for iSale / AGRO / FIRMA |
| Canonical | Set per page | Home canonical has no trailing slash while the rest do. Sitemap URLs have **no trailing slash**, but the site 308-redirects to the slash versions, so the sitemap points at redirects. Make them consistent |
| Open Graph / Twitter | Title, description and site_name only | **No `og:image` on any page**, so link previews in LinkedIn/Slack/WhatsApp are blank. Add one 1200×630 image per page, plus `twitter:card=summary_large_image` |
| Favicon / app icons | **None** (`/favicon.ico` is 404) | Add `icon.svg`, `apple-icon.png` and a web manifest |
| `robots.txt` | `Allow: /` + sitemap | Add explicit AI-crawler rules (below) |
| Sitemap | Lists `/trust-sensor`, a fixed `lastModified` of 2026-07-20, no FR | Rebuild for the new line-up, with trailing slashes, real dates and FR alternates (`xhtml:link`) |
| `hreflang` / French | **The site has no French pages at all** (no `/fr`, `lang="en"` only) | Build FR versions (§3), add `hreflang` en-GB / fr / x-default on every page, set `<html lang>` per locale |
| Structured data (JSON-LD) | Home only: a minimal `Organization` | Add a full `Organization` (logo, email, address, `founder`, `sameAs` GitHub/LinkedIn), plus `WebSite`, a `SoftwareApplication` for iSale, AGRO and FIRMA, and `BreadcrumbList`. FIRMA can also get `SoftwareSourceCode` pointing to the spec repo |
| Crawlable text | Good: the 3D pages render their story as real HTML (Trust Sensor 1,541 words, AGRO 813, iSale 566, FIRMA 490, About 232). No content is image-only | Keep it that way. Check that every heading carries meaning on its own, and add a short factual "What it is / who it's for / what it does" paragraph near the top of each product page (good for AI answers) |
| Headings | One `h1` per page, sensible `h2`s | Fine |
| Moved pages | Meta-refresh + `noindex,follow` + canonical to the new page | Fine for a static host. Add real 301s via host config (§1) |
| Performance | Home loads 289 kB of JS (three.js ring), product pages ~118–127 kB, all statically prerendered | Lazy-load the 3D scene after first paint. Keep the text in the first HTML. Respect `prefers-reduced-motion` (check what already does). Measure with Lighthouse in Phase B |
| Accessibility | `aria-labelledby` on sections, labelled menu button | Run axe/Lighthouse. Check contrast on the dark scenes, focus states, and a skip link. Make sure the canvas is `aria-hidden` |
| `www` cert | Broken (§1) | Fix in Vercel: it hurts trust and crawling |
| Search Console / Bing | GSC verified (TXT); Bing unknown | Submit the new sitemap to both after launch |

### AI discoverability

1. **`/llms.txt`** (currently 404): a plain-Markdown summary of the company and each product, with links to the product pages and the FIRMA spec. Optionally add **`/llms-full.txt`** with the full product text.
2. **AI crawler rules in `robots.txt`.** Explicitly allow, assuming the goal is to be found and cited: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot-Extended`, `CCBot`. *Decision for you:* allow training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended) or only search/answer crawlers?
3. **Factual product pages.** Each product page states plainly:
   - what it is
   - who it's for
   - what it does (a bullet list)
   - what it connects to
   - status (live / pilot)
   - how to contact

   Use consistent names everywhere: **iSale**, **AGRO**, **FIRMA**, INOVI Group Ltd. Don't keep the old names in visible copy; mention them once as "formerly…" so old links and searches still resolve.
4. **`Organization` and `SoftwareApplication` JSON-LD** (above). AI answer engines lean on these.
5. **One short FAQ block per product page.** The text is visible, with `FAQPage` JSON-LD. This is the form AI answers quote most often.
6. **Off-site consistency.** Matching descriptions on GitHub (`inovi-group`), LinkedIn and Companies House, linked through `sameAs`. You'll need to supply the LinkedIn URL.

### Priority

- **P0 (do with the restructure):**
  - new sitemap and canonicals with trailing slashes
  - redirects from old URLs to iSale
  - `og:image` and favicon
  - the full `Organization` + `SoftwareApplication` JSON-LD
  - `llms.txt`
  - robots AI rules
  - fix the home meta description
  - FR pages with hreflang
- **P1:**
  - FAQ blocks
  - a host `_redirects` file
  - Lighthouse/axe pass and fixes
  - lazy-load the 3D scene
  - README deploy section corrected
- **Outside the repo (owner):**
  - add `www` to Vercel, which fixes the cert and the 307
  - submit the sitemap to GSC and Bing
  - align LinkedIn and Companies House descriptions

---

## 3. Page restructure

### New line-up

| Route | Page | Built from |
|---|---|---|
| `/` | Home: three products, iSale · AGRO · FIRMA | Current home ring |
| `/isale/` | **iSale**: sales strategy, deal checks, reports | **The envelope page** (today's `/trust-sensor/`, `firma-experience/`) |
| `/agro/` | AGRO: unchanged | As is |
| `/firma/` | **FIRMA**: the engine inside iSale and AGRO | Current static `/firma/` page, reworked |
| `/about/` | About | As is (product mentions updated) |
| `/fr/…` | French versions of all of the above | New |

### Redirects (meta-refresh + `noindex` now, real 301s via host config)

| Old URL | Goes to |
|---|---|
| `/trust-sensor/` | `/isale/` |
| `/fides/` | `/isale/` (direct, no double hop) |
| `/firma/experience/` | `/isale/` |

`/isale/` keeps its URL. Its old pipeline-scene page is replaced by the envelope page.

### iSale (`/isale/`, uses the envelope page)

**Key message:** iSale keeps your sales team on strategy. It checks every deal and customer before it's closed, learns from your past sales, and writes the reports, all on a tamper-proof record (FIRMA).

| Section | Content | Reused / new |
|---|---|---|
| Hero | "Every deal, on strategy." (draft). Short factual lede and CTAs: try iSale (`isale-ts.uk`), contact | Envelope hero scene reused. Copy new |
| Story 01: Strategy in | Administrators set the global strategy (target segments, margins, risk limits). iSale holds it as sealed policy | Scene step reused (the "Policy" record already exists in the chain). Copy new |
| Story 02: Before you pick up a customer | A rep picks up a customer. iSale warns if the profile looks like customers that went bad | Envelope arriving / scores reused, relabelled as customer-risk signals. Copy new |
| Story 03: Before the deal closes | Each deal is checked against the strategy, and ones that don't fit are flagged before signature | Scores + verdict ✓/✕ visuals reused. Copy new |
| Story 04: Learns from past sales | iSale goes over older sales, finds patterns, and proposes them as **new strategy for admins to approve** | Month-end grid reused as the "past sales" view. Copy new |
| Story 05: Reports | Month-end report written for you, sealed | Reused (month report scene) |
| Story 06: On the record | Everything sealed in FIRMA, tamper-evident, auditor-verifiable | Reused (audit / tamper steps), shortened |
| Features grid | Strategy alignment · Bad-customer early warning · Pre-close flags · Pattern mining → strategy suggestions · Reports · Drift / accuracy (from Trust Sensor) | `trustFeatures.ts` reused + new cards |
| What iSale reads | Stage drift, discount pressure, champion mapping… | Lifted from the current iSale `SIGNALS` |
| Secured by FIRMA | Existing `FirmaLayer` band | Reused |
| FAQ + close CTA | New | New |

Stats such as "15–30% fewer bad deals" and "ROI in 30 days" come from the current iSale page. Keep them only if they're still claims you can stand behind (see open questions).

### AGRO (`/agro/`): no change

Only: product-name mentions in shared bands (FirmaLayer text, footer), JSON-LD, the FR version, and an `og:image`.

### FIRMA (`/firma/`): the engine

**Key message:** FIRMA is the engine inside iSale and AGRO. It takes what a product sees and decides, checks it against rules, and keeps a tamper-proof, verifiable record of it.

| Section | Content | Reused / new |
|---|---|---|
| Hero | "The engine inside iSale and AGRO." Plain explanation of what it does | Copy new. Possibly the wax-seal visual |
| What it does (3–4 blocks) | Records (sealed, chained); checks against policy/strategy; finds patterns over time; proves it to auditors | Mostly new, partly from the `properties` list |
| Where it runs | iSale card + AGRO card, showing what each writes to and gets from FIRMA | `securedProducts` reused, now **two** products |
| Open specification | Facts strip (v2.0, SHA3-512, Ed25519, 16/16), formula, spec / demo / validator links | Reused |
| Pilot CTA | Reused | Reused |

### Home, nav, footer, shared

- **Ring:** three objects, in order iSale (the golden envelope, moved from Trust Sensor), AGRO, FIRMA.
  - FIRMA needs an object: the crimson wax seal is the obvious candidate.
  - The current iSale pipeline object goes away.
- **Product cards, copy and JSON-LD:** iSale, AGRO, FIRMA. The "Three products. One trust layer." heading becomes something like "Two products. One engine." **Decide which line-up the home page tells.**
- **Header nav:** iSale · AGRO · FIRMA · About. **Footer:** the same.
- **`FirmaLayer` band text:** "the engine under iSale and AGRO".
- **About page:** the "Applied" paragraph already names iSale and AGRO, so only minor edits.
- **Code tidy-up (optional):** the envelope page lives in `components/firma-experience/` and is called "Trust Sensor" in comments. Rename to `isale-experience/` and drop or keep the old pipeline scene. I'd keep the old `pipelineScene.ts` in git history only.

### French versions

There are no French pages today, so they're all new. Proposed approach:

- `/fr/`, `/fr/isale/`, `/fr/agro/`, `/fr/firma/`, `/fr/a-propos/` (or `/fr/about/`)
- page copy moved into `en` / `fr` dictionaries next to each `content.ts`
- the same components and scenes for both languages
- `<html lang="fr">`, hreflang pairs, an EN/FR switch in the header, FR in the sitemap

Static export handles this without middleware.

---

## Open questions for you

1. **French copy:** who writes it? I can draft the French translations myself, but someone should proofread them before launch. And which pages: all of them, or products first?
2. **FIRMA, "engine":** is FIRMA now more than the record layer? For example, does it do the strategy checks and pattern-finding that iSale uses? Or is it still the tamper-proof record + open spec? This decides the FIRMA page's message.
3. **Is FIRMA the third product,** or the platform under two products? This affects the home heading, the ring and the nav.
4. **iSale claims:** keep "15–30% fewer bad deals" and "ROI in 30 days"? Is there evidence for them?
5. **Trust Sensor features:** keep all of them (drift, calibration, provider accuracy) on the iSale page, or slim them down to "reports + on the record"?
6. **CTAs:** does iSale's main CTA still go to `https://www.isale-ts.uk`? Is that the live iSale app?
7. **ENERGY TS** line on home: keep it?
8. **Brand casing:** AGRO or Agro, FIRMA or Firma? The site uses capitals; the ramble doesn't.
9. **AI crawlers:** allow training crawlers too, or only search/answer bots?
10. **LinkedIn / other profiles** for `sameAs`, and a logo file for JSON-LD and `og:image`?
11. **Which branch does this land on?** `main` is what's live and is far behind (no 3D pages). Does this branch, `feature/firma-envelope` + changes, become the next `main`?

---

## Phase B: what was done (2026-11-05, branch `inovi-ramble-1105`, not merged, pushed or deployed)

Decisions from the developer: FIRMA is the platform under two products (not a third product); FIRMA does data science on the customer's own data; French written and proofread by Claude; no numeric claims; AI search/answer bots allowed, training-only crawlers blocked.

- **Pages:** iSale now uses the envelope page at `/isale/` with new copy (strategy from administrators, bad-customer warnings, pre-close flags, patterns from past sales proposed as strategy, reports). The old iSale pipeline page is removed. AGRO keeps its page. FIRMA is the platform explainer. The home ring shows two products around FIRMA's seal. Nav is iSale · AGRO | FIRMA (platform) · About.
- **French:** `/fr/`, `/fr/isale/`, `/fr/agro/`, `/fr/firma/`, `/fr/a-propos/`, including the words drawn inside the 3D scenes. EN/FR switch in the header.
- **Redirects:** `/trust-sensor/`, `/fides/` and `/firma/experience/` go to `/isale/` (meta refresh + noindex), plus real 301s in `vercel.json` and `public/_redirects`.
- **Removed figures:** "15–30% fewer bad deals", "ROI in 30 days", "35–50% water savings", "<50ms", "72% accuracy", "a third of the world's food", "16/16 tests".
- **Discoverability:** per-page metadata with hreflang, an OG image per page and language, favicon/icons/manifest, JSON-LD graph per page, FAQ blocks, sitemap with alternates, robots.txt AI rules, `llms.txt`, a proper 404, and a skip link. Home JS went from 289 kB to 122 kB.
- **Still for the owner:** add `www` in Vercel (fixes the cert and the 307); submit the sitemap to Search Console and Bing once it's live; supply LinkedIn and other profiles for `sameAs`; a real logo for JSON-LD.
