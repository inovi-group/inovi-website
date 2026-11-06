// Renders the site's share images (public/og/<page>-<lang>.png, 1200×630) and app icons (public/*.png) with
// Playwright's Chromium. Run after changing a page's title: node scripts/make-og.mjs
// (or, with a Chrome already listening for DevTools, CDP=http://localhost:9333 node scripts/make-og.mjs)
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const root = new URL("../public/", import.meta.url);
mkdirSync(new URL("og/", root), { recursive: true });

const GOLD = "#d9a34a", GREEN = "#46b876", BLUE = "#4593ff";
const PAGES = {
  home: { accent: BLUE,
    en: ["INOVI Group", "Two products. One platform you can verify.", "iSale and AGRO, built on FIRMA"],
    fr: ["INOVI Group", "Deux produits. Une plateforme vérifiable.", "iSale et AGRO, construits sur FIRMA"] },
  isale: { accent: GOLD,
    en: ["iSale · Sales on strategy", "Every deal, on strategy.", "Warnings before bad customers, flags before off-strategy deals close, reports written for you."],
    fr: ["iSale · La vente alignée", "Chaque affaire, alignée sur votre stratégie.", "Alertes avant les mauvais clients, signalements avant la clôture, rapports rédigés pour vous."] },
  agro: { accent: GREEN,
    en: ["AGRO · Smart irrigation", "Smart irrigation for the farmers the industry forgot.", "Sensors in the root zone, advice on any phone."],
    fr: ["AGRO · Irrigation intelligente", "L’irrigation intelligente pour les agriculteurs oubliés.", "Des capteurs dans la zone racinaire, des conseils sur n’importe quel téléphone."] },
  firma: { accent: GOLD,
    en: ["FIRMA · The platform", "The platform under iSale and AGRO.", "Patterns in your data, checks against your rules, a record anyone can verify."],
    fr: ["FIRMA · La plateforme", "La plateforme d’iSale et d’AGRO.", "Des tendances dans vos données, des règles vérifiées, un registre vérifiable par tous."] },
  about: { accent: BLUE,
    en: ["About INOVI Group", "We build systems that prove what happened.", "London, United Kingdom"],
    fr: ["À propos d’INOVI Group", "Des systèmes qui prouvent ce qui s’est passé.", "Londres, Royaume-Uni"] },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const card = (accent, [kicker, title, sub]) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #0a0d13; color: #e7eaf0; font-family: Inter, "Segoe UI", system-ui, sans-serif; position: relative; overflow: hidden; }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(#1f2735 1px, transparent 1px), linear-gradient(90deg, #1f2735 1px, transparent 1px);
    background-size: 44px 44px; opacity: .55; -webkit-mask-image: radial-gradient(ellipse 80% 70% at 70% 30%, #000 20%, transparent 75%); }
  .glow { position: absolute; right: -160px; top: -200px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(${accent}55, transparent 65%); }
  .wrap { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; }
  .kicker { display: inline-flex; align-items: center; gap: 14px; font: 600 22px/1 "JetBrains Mono", Consolas, monospace; letter-spacing: .06em; color: #94a0b4; }
  .kicker i { width: 12px; height: 12px; background: ${accent}; }
  h1 { margin-top: 44px; font-size: 68px; line-height: 1.06; letter-spacing: -.03em; font-weight: 800; max-width: 980px; }
  p { margin-top: 26px; font-size: 28px; line-height: 1.4; color: #b4bdcc; max-width: 900px; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: baseline; font-size: 24px; color: #5c6678; }
  .foot b { color: #e7eaf0; font-size: 30px; letter-spacing: -.01em; } .foot b span { font-size: 16px; letter-spacing: .2em; color: #94a0b4; margin-left: 8px; }
  .bar { position: absolute; left: 0; bottom: 0; height: 8px; width: 100%; background: ${accent}; }
</style></head><body><div class="grid"></div><div class="glow"></div><div class="wrap">
  <div class="kicker"><i></i>${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p>
  <div class="foot"><b>INOVI<span>GROUP</span></b><span>inovigroup.co.uk</span></div></div><div class="bar"></div></body></html>`;

const browser = process.env.CDP ? await chromium.connectOverCDP(process.env.CDP) : await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
for (const [key, p] of Object.entries(PAGES)) {
  for (const lang of ["en", "fr"]) {
    await page.setContent(card(p.accent, p[lang]));
    await page.screenshot({ path: new URL(`og/${key}-${lang}.png`, root).pathname });
  }
}
// app icons from the SVG favicon
const svg = readFileSync(new URL("favicon.svg", root), "utf8");
for (const [file, size] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: new URL(file, root).pathname, omitBackground: true });
  await p.close();
}
await ctx.close();
await browser.close();
console.log("share images and icons written to public/");
