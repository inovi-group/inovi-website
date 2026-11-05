import { abs, ROUTES, type Lang } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { breadcrumbs, graph, ORG_ID, webPage } from "@/i18n/schema";
import { JsonLd } from "@/components/JsonLd";
import { agroCopy } from "./content";
import { AgroExperience } from "./AgroExperience";

export const agroMeta = (lang: Lang) => pageMeta(lang, "agro", agroCopy(lang).metaTitle, agroCopy(lang).metaDescription);

/** /agro/ and /fr/agro/: the page, with its JSON-LD (AGRO as a Product: sensors plus advice). */
export function AgroPage({ lang }: { lang: Lang }) {
  const t = agroCopy(lang);
  const product = {
    "@type": "Product",
    "@id": `${abs(ROUTES.agro.en)}#product`,
    name: "AGRO",
    category: lang === "fr" ? "Irrigation intelligente" : "Smart irrigation",
    url: abs(ROUTES.agro[lang]),
    description: t.metaDescription,
    brand: { "@id": ORG_ID },
    manufacturer: { "@id": ORG_ID },
  };
  return (
    <>
      <JsonLd data={graph(webPage(lang, "agro", t.metaTitle, t.metaDescription), breadcrumbs(lang, "agro", "AGRO"), product)} />
      <AgroExperience lang={lang} />
    </>
  );
}
