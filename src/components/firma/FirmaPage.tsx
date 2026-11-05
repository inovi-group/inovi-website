import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, Fingerprint, Github, Link2, ListChecks, PlayCircle, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Stamp } from "@/components/Stamp";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { abs, DEMO, href, MAIL, ROUTES, SPEC, type Lang } from "@/i18n";
import { pageMeta } from "@/i18n/meta";
import { breadcrumbs, graph, ORG_ID, webPage } from "@/i18n/schema";
import { ui } from "@/i18n/ui";
import { firmaCopy } from "./firmaCopy";

export const firmaMeta = (lang: Lang) => pageMeta(lang, "firma", firmaCopy(lang).metaTitle, firmaCopy(lang).metaDescription);

const DOES_ICONS = [BrainCircuit, ListChecks, Fingerprint, ShieldCheck];
const RESOURCE_LINKS = [{ icon: BookOpen, href: SPEC }, { icon: PlayCircle, href: DEMO }, { icon: Github, href: SPEC }];

/** /firma/ and /fr/firma/: what the platform under iSale and AGRO does. */
export function FirmaPage({ lang }: { lang: Lang }) {
  const t = firmaCopy(lang);
  const schema = graph(
    webPage(lang, "firma", t.metaTitle, t.metaDescription),
    breadcrumbs(lang, "firma", "FIRMA"),
    {
      "@type": "SoftwareApplication", "@id": `${abs(ROUTES.firma.en)}#software`, name: "FIRMA", applicationCategory: "DeveloperApplication",
      operatingSystem: "Any", url: abs(ROUTES.firma[lang]), description: t.metaDescription, publisher: { "@id": ORG_ID },
      license: "https://www.gnu.org/licenses/gpl-3.0.html",
    },
    { "@type": "SoftwareSourceCode", name: "FIRMA specification", codeRepository: SPEC, programmingLanguage: "Python", license: "https://www.gnu.org/licenses/gpl-3.0.html", author: { "@id": ORG_ID } },
  );
  const products = (["isale", "agro"] as const).map((k) => ({ k, tone: k === "isale" ? "text-firma" : "text-agro", c: t.products[k] }));

  return (
    <>
      <JsonLd data={schema} />
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal><Stamp tone="firma">{t.stamp}</Stamp></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">{t.h1}</h1>
          </Reveal>
          <Reveal delay={0.16}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{t.lede}</p></Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href={SPEC} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                <Github size={16} /> {t.ctaSpec}
              </a>
              <a href={DEMO} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-firma">
                <PlayCircle size={16} /> {t.ctaDemo}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4">
          {t.facts.map(([label, value, detail], i) => (
            <Reveal key={label} delay={i * 0.06}>
              <div className="px-3 py-2">
                <div className="text-xs uppercase tracking-[0.1em] text-dim">{label}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-firma">{value}</div>
                <div className="text-xs text-muted">{detail}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What it does */}
      <section className="mx-auto max-w-6xl px-5 pt-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.doesTitle}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t.doesLede}</p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {t.does.map(([title, text], i) => {
            const Icon = DOES_ICONS[i];
            return (
              <Reveal key={title} delay={i * 0.06}>
                <div className="h-full rounded-card border border-line bg-card p-6">
                  <Icon size={20} className="text-firma" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* The two products built on it */}
      <section className="mx-auto max-w-6xl px-5 pt-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.productsTitle}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t.productsLede}</p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {products.map(({ k, tone, c: [tagline, name, text, cta] }, i) => (
            <Reveal key={k} delay={i * 0.08}>
              <Link href={href(lang, k)} className="group flex h-full flex-col rounded-card border border-line bg-card p-6 transition-colors hover:border-firma">
                <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone}`}>{tagline}</span>
                <span className="mt-3 text-lg font-bold text-text">{name}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-firma">
                  {cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Hash formula */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.formulaTitle}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t.formulaLede}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 overflow-x-auto rounded-card border border-line bg-card p-6">
            <pre className="font-mono text-sm leading-relaxed text-muted">
              <code>{`record_hash = SHA3-512(
    firma_id ‖ record_type ‖ version ‖ actor_id
    ‖ canonical_json(content) ‖ timestamp_utc ‖ predecessor_hash
)

signature = Ed25519_sign(record_hash, node_key)`}</code>
            </pre>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {t.properties.map(([title, text], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className="h-full rounded-card border border-line bg-card p-6">
                <ShieldCheck size={20} className="text-firma" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal><h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.publicTitle}</h2></Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {t.resources.map(([title, text, cta], i) => {
              const r = RESOURCE_LINKS[i];
              return (
                <Reveal key={title} delay={i * 0.08}>
                  <a href={r.href} target="_blank" rel="noopener noreferrer"
                    className="group flex h-full flex-col rounded-card border border-line bg-card p-6 transition-colors hover:border-firma">
                    <r.icon size={20} className="text-firma" aria-hidden="true" />
                    <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-firma"><Link2 size={12} aria-hidden="true" /> {cta}</span>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Faq title={ui(lang).faq} items={t.faq} tone="firma" />

      {/* Pilot CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Reveal>
          <div className="rounded-card border border-line bg-card px-8 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{t.pilotTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.pilotText}</p>
            <a href={`mailto:${MAIL}?subject=${encodeURIComponent(t.pilotSubject)}`}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              {t.pilotCta} <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
