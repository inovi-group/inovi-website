import { JsonLd } from "./JsonLd";
import { faqPage, graph } from "@/i18n/schema";

/**
 * Plain questions and answers near the end of a page: visible text (crawlable, quotable by AI answer engines)
 * and the matching FAQPage JSON-LD. `className` lets a scroll page style it like its other sections.
 */
export function Faq({ title, items, tone = "accent", className = "" }: { title: string; items: [string, string][]; tone?: "accent" | "isale" | "agro" | "firma"; className?: string }) {
  const marker = { accent: "text-accent", isale: "text-isale", agro: "text-agro", firma: "text-firma" }[tone];
  return (
    <section className={`faq relative z-[2] ${className}`} aria-labelledby="faq-h">
      <JsonLd data={graph(faqPage(items))} />
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h2 id="faq-h" className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h2>
        <dl className="mt-8 divide-y divide-line border-y border-line">
          {items.map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="flex gap-3 text-base font-semibold text-text"><span className={`font-mono ${marker}`} aria-hidden="true">Q</span>{q}</dt>
              <dd className="mt-2 pl-7 text-[15px] leading-relaxed text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
