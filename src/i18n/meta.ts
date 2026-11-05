import type { Metadata } from "next";
import { abs, ROUTES, type Lang, type PageKey } from ".";

const OG_LOCALE: Record<Lang, string> = { en: "en_GB", fr: "fr_FR" };

/** hreflang alternates for a page: en-GB, fr and x-default (English). */
export function alternatesOf(key: PageKey) {
  return { "en-GB": abs(ROUTES[key].en), fr: abs(ROUTES[key].fr), "x-default": abs(ROUTES[key].en) };
}

/**
 * A page's metadata: title, description, canonical, hreflang, Open Graph and Twitter, with the page's
 * share image (public/og/<key>-<lang>.png, made by scripts/make-og.mjs).
 */
export function pageMeta(lang: Lang, key: PageKey, title: string, description: string, opts: { absoluteTitle?: boolean } = {}): Metadata {
  const url = abs(ROUTES[key][lang]);
  const image = { url: abs(`/og/${key}-${lang}.png`), width: 1200, height: 630, alt: title };
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: alternatesOf(key) },
    openGraph: {
      type: "website", siteName: "INOVI Group", url, title, description, images: [image],
      locale: OG_LOCALE[lang], alternateLocale: [OG_LOCALE[lang === "en" ? "fr" : "en"]],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

/** A moved page: not indexed, canonical to where it went. */
export function movedMeta(lang: Lang, key: PageKey, title: string): Metadata {
  return { title: { absolute: title }, alternates: { canonical: abs(ROUTES[key][lang]) }, robots: { index: false, follow: true } };
}
