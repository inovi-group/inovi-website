import type { MetadataRoute } from "next";
import { abs, LANGS, ROUTES, type PageKey } from "@/i18n";
import { alternatesOf } from "@/i18n/meta";

export const dynamic = "force-static";

// Bump when a page's content changes. Every URL carries its other-language version (hreflang in the sitemap).
const UPDATED = new Date("2026-11-05");
const PRIORITY: Record<PageKey, number> = { home: 1, isale: 0.9, agro: 0.9, firma: 0.8, about: 0.5 };

export default function sitemap(): MetadataRoute.Sitemap {
  return (Object.keys(ROUTES) as PageKey[]).flatMap((key) =>
    LANGS.map((lang) => ({
      url: abs(ROUTES[key][lang]),
      lastModified: UPDATED,
      changeFrequency: "monthly" as const,
      priority: lang === "en" ? PRIORITY[key] : Math.round(PRIORITY[key] * 9) / 10,
      alternates: { languages: alternatesOf(key) },
    })),
  );
}
