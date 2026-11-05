import { ArrowRight, Github } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Stamp } from "@/components/Stamp";
import { JsonLd } from "@/components/JsonLd";
import { GITHUB, MAIL, type Lang } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { breadcrumbs, graph, webPage } from "@/i18n/schema";

const TEAM: [name: string, en: string, fr: string][] = [
  ["Bachir Bouabdellah Belbia", "CEO & Founder", "PDG et fondateur"],
  ["Samir Founou", "Chief Technology Officer", "Directeur technique"],
  ["Diana Jarche", "Chief Operating Officer", "Directrice des opérations"],
  ["Mohamed Bouabdelli", "Director of Communications", "Directeur de la communication"],
];

const COPY = {
  en: {
    metaTitle: "About INOVI Group",
    metaDescription: "INOVI Group Ltd is a London company building iSale and AGRO on FIRMA, its platform for data analysis and tamper-proof records: open specifications, verifiable systems, applied products.",
    crumb: "About",
    stamp: "London, United Kingdom",
    h1: "We build systems that prove what happened.",
    lede: "INOVI Group Ltd builds products on one platform: iSale for sales teams and AGRO for smallholder farms, both on FIRMA, which finds patterns in the data and keeps a tamper-proof record of every decision. Our approach is deliberately concrete: publish the specification in the open, ship a working implementation, and prove it in real use.",
    howTitle: "How we work",
    how: [
      ["01 · Open", "The FIRMA specification is public under GPL-3.0, with a reference implementation anyone can run. Verifiability starts with being verifiable ourselves."],
      ["02 · Measured", "What we say about our products should be something you can check: detection, water use, deal outcomes. If we can't measure it, we don't claim it."],
      ["03 · Applied", "A platform earns trust in use. iSale and AGRO are products first, and both run on FIRMA."],
    ] as [string, string][],
    teamTitle: "Leadership",
    talkTitle: "Talk to us",
    talkText: "Commercial teams, agritech partners, technical programmes, investors: we answer email.",
  },
  fr: {
    metaTitle: "À propos d’INOVI Group",
    metaDescription: "INOVI Group Ltd est une société londonienne qui conçoit iSale et AGRO sur FIRMA, sa plateforme d’analyse de données et de registre infalsifiable : spécifications ouvertes, systèmes vérifiables, produits concrets.",
    crumb: "À propos",
    stamp: "Londres, Royaume-Uni",
    h1: "Nous concevons des systèmes qui prouvent ce qui s’est passé.",
    lede: "INOVI Group Ltd conçoit ses produits sur une seule plateforme : iSale pour les équipes commerciales et AGRO pour les petites exploitations agricoles, tous deux sur FIRMA, qui repère les tendances dans les données et tient un registre infalsifiable de chaque décision. Notre démarche est volontairement concrète : publier la spécification en accès libre, livrer une implémentation qui fonctionne, et la mettre à l’épreuve en conditions réelles.",
    howTitle: "Notre façon de travailler",
    how: [
      ["01 · Ouvert", "La spécification FIRMA est publique sous licence GPL-3.0, avec une implémentation de référence que chacun peut exécuter. La vérifiabilité commence par la nôtre."],
      ["02 · Mesuré", "Ce que nous disons de nos produits doit pouvoir se vérifier : détection, consommation d’eau, issue des affaires. Ce que nous ne pouvons pas mesurer, nous ne l’affirmons pas."],
      ["03 · Concret", "Une plateforme gagne la confiance à l’usage. iSale et AGRO sont avant tout des produits, et tous deux reposent sur FIRMA."],
    ] as [string, string][],
    teamTitle: "Direction",
    talkTitle: "Parlons-en",
    talkText: "Équipes commerciales, partenaires agritech, programmes techniques, investisseurs : nous répondons aux e-mails.",
  },
};

export const aboutMeta = (lang: Lang) => pageMeta(lang, "about", COPY[lang].metaTitle, COPY[lang].metaDescription, { absoluteTitle: true });

/** /about/ and /fr/a-propos/. */
export function AboutPage({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  return (
    <>
      <JsonLd data={graph(webPage(lang, "about", t.metaTitle, t.metaDescription), breadcrumbs(lang, "about", t.crumb))} />
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal><Stamp>{t.stamp}</Stamp></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">{t.h1}</h1>
          </Reveal>
          <Reveal delay={0.16}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{t.lede}</p></Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Reveal><h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">{t.howTitle}</h2></Reveal>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {t.how.map(([head, text], i) => (
              <Reveal key={head} delay={0.05 * (i + 1)}>
                <div>
                  <div className="font-mono text-sm font-semibold text-accent">{head}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal><h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">{t.teamTitle}</h2></Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map(([name, en, fr], i) => (
            <Reveal key={name} delay={i * 0.06}>
              <div className="rounded-card border border-line bg-card p-6">
                <div className="text-base font-semibold text-text">{name}</div>
                <div className="mt-1 text-sm text-muted">{lang === "fr" ? fr : en}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.talkTitle}</h2>
              <p className="mt-3 text-muted">{t.talkText}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a href={`mailto:${MAIL}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  {MAIL} <ArrowRight size={16} />
                </a>
                <a href={GITHUB} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
                  <Github size={16} /> github.com/inovi-group
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
