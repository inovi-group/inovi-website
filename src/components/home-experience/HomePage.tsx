import type { Lang } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { graph, organization, webPage, website } from "@/i18n/schema";
import { JsonLd } from "@/components/JsonLd";
import { homeCopy } from "./content";
import { HomeExperience } from "./HomeExperience";

export const homeMeta = (lang: Lang) => pageMeta(lang, "home", homeCopy(lang).metaTitle, homeCopy(lang).metaDescription, { absoluteTitle: true });

/** / and /fr/: the home page, with the Organization and WebSite JSON-LD the other pages point to. */
export function HomePage({ lang }: { lang: Lang }) {
  const c = homeCopy(lang);
  return (
    <>
      <JsonLd data={graph(organization(lang), website(lang), webPage(lang, "home", c.metaTitle, c.metaDescription))} />
      <HomeExperience lang={lang} />
    </>
  );
}
