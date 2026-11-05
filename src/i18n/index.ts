/**
 * The site's two languages. English lives at the root (/isale/), French under /fr/ (/fr/isale/).
 * Every page has a key; ROUTES gives its path in each language, so links, the language switch, hreflang and the
 * sitemap all come from one table.
 */
export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];
export const SITE = "https://inovigroup.co.uk";

export type PageKey = "home" | "isale" | "agro" | "firma" | "about";
export const ROUTES: Record<PageKey, Record<Lang, string>> = {
  home: { en: "/", fr: "/fr/" },
  isale: { en: "/isale/", fr: "/fr/isale/" },
  agro: { en: "/agro/", fr: "/fr/agro/" },
  firma: { en: "/firma/", fr: "/fr/firma/" },
  about: { en: "/about/", fr: "/fr/a-propos/" },
};

export const href = (lang: Lang, key: PageKey) => ROUTES[key][lang];
export const abs = (path: string) => `${SITE}${path}`;

/** Which page a pathname is, and in which language (for the language switch). */
export function pageOf(pathname: string): { key: PageKey; lang: Lang } | null {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  for (const key of Object.keys(ROUTES) as PageKey[]) {
    for (const lang of LANGS) if (ROUTES[key][lang] === p) return { key, lang };
  }
  return null;
}

export const langOfPath = (pathname: string): Lang => (pathname === "/fr" || pathname.startsWith("/fr/") ? "fr" : "en");

export const MAIL = "contact@inovigroup.co.uk";
export const ISALE_APP = "https://www.isale-ts.uk";
export const SPEC = "https://github.com/inovi-group/firma-spec";
export const DEMO = "https://inovi-group.github.io/firma-spec/demo/";
export const GITHUB = "https://github.com/inovi-group";
