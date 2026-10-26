import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://inovigroup.co.uk";
  return ["", "/trust-sensor", "/agro", "/isale", "/firma", "/about"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date("2026-07-20"),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
