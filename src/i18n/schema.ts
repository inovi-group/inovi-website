import { abs, GITHUB, MAIL, ROUTES, SITE, SPEC, type Lang, type PageKey } from ".";

/** schema.org JSON-LD, shared by the pages. Ids let the pages point at one Organization and one WebSite. */
export const ORG_ID = `${SITE}/#organization`;
export const SITE_ID = `${SITE}/#website`;
const IN_LANG: Record<Lang, string> = { en: "en-GB", fr: "fr" };

export function organization(lang: Lang) {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "INOVI Group",
    legalName: "INOVI Group Ltd",
    url: SITE,
    logo: abs("/icon-512.png"),
    email: MAIL,
    description: lang === "fr"
      ? "INOVI Group conçoit iSale (la vente alignée sur la stratégie) et AGRO (l’irrigation intelligente), deux produits construits sur FIRMA, sa plateforme d’analyse de données et de registre infalsifiable."
      : "INOVI Group builds iSale (sales kept on strategy) and AGRO (smart irrigation), two products built on FIRMA, its platform for data analysis and tamper-proof records.",
    address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
    founder: { "@type": "Person", name: "Bachir Bouabdellah Belbia" },
    contactPoint: { "@type": "ContactPoint", contactType: "sales", email: MAIL, availableLanguage: ["English", "French"] },
    sameAs: [GITHUB, SPEC],
  };
}

export function website(lang: Lang) {
  return { "@type": "WebSite", "@id": SITE_ID, url: SITE, name: "INOVI Group", inLanguage: IN_LANG[lang], publisher: { "@id": ORG_ID } };
}

export function webPage(lang: Lang, key: PageKey, name: string, description: string) {
  return { "@type": "WebPage", "@id": `${abs(ROUTES[key][lang])}#webpage`, url: abs(ROUTES[key][lang]), name, description, inLanguage: IN_LANG[lang], isPartOf: { "@id": SITE_ID }, about: { "@id": ORG_ID } };
}

export function breadcrumbs(lang: Lang, key: PageKey, name: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: lang === "fr" ? "Accueil" : "Home", item: abs(ROUTES.home[lang]) },
      { "@type": "ListItem", position: 2, name, item: abs(ROUTES[key][lang]) },
    ],
  };
}

export function faqPage(items: [q: string, a: string][]) {
  return { "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}

/** One JSON-LD graph per page. */
export const graph = (...nodes: object[]) => ({ "@context": "https://schema.org", "@graph": nodes });
