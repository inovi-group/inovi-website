import type { Lang } from "@/i18n";
import { abs, ISALE_APP, ROUTES } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { breadcrumbs, graph, ORG_ID, webPage } from "@/i18n/schema";
import { JsonLd } from "@/components/JsonLd";
import { copyFor } from "./copy";
import { IsaleExperience } from "./IsaleExperience";

export const isaleMeta = (lang: Lang) => pageMeta(lang, "isale", copyFor(lang).metaTitle, copyFor(lang).metaDescription);

/** /isale/ and /fr/isale/: the page, with its JSON-LD (the product as a SoftwareApplication). */
export function IsalePage({ lang }: { lang: Lang }) {
  const t = copyFor(lang);
  const app = {
    "@type": "SoftwareApplication",
    "@id": `${abs(ROUTES.isale.en)}#software`,
    name: "iSale",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: abs(ROUTES.isale[lang]),
    description: t.metaDescription,
    featureList: t.values.map(([v]) => v),
    publisher: { "@id": ORG_ID },
    sameAs: [ISALE_APP],
  };
  return (
    <>
      <JsonLd data={graph(webPage(lang, "isale", t.metaTitle, t.metaDescription), breadcrumbs(lang, "isale", "iSale"), app)} />
      <IsaleExperience lang={lang} />
    </>
  );
}
