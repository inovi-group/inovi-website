import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  Plug,
  TrendingDown,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { FirmaSeal } from "@/components/firma/FirmaSeal";

export const metadata: Metadata = {
  title: "iSale — Detect Hidden Deal Risks Before Signature",
  description:
    "iSale detects the hidden risks in your commercial deals before signature. CRM-native risk scoring, ROI in 30 days, 15–30% reduction in bad deals.",
  alternates: { canonical: "https://inovigroup.co.uk/isale" },
};

const stats = [
  { value: "15–30%", label: "reduction in bad deals" },
  { value: "30 days", label: "to measurable ROI" },
  { value: "CRM-native", label: "works with your pipeline" },
];

const signals = [
  {
    icon: Clock,
    title: "Stage-duration drift",
    text: "A deal stuck 45 days in Negotiation is telling you something. iSale flags stagnation patterns before they cost you the quarter.",
  },
  {
    icon: TrendingDown,
    title: "Discount pressure",
    text: "Rising discount requests correlate with weak positioning. iSale tracks concession patterns across your pipeline.",
  },
  {
    icon: Users,
    title: "Champion mapping",
    text: "No identified champion means no internal advocate. iSale surfaces deals that are flying blind before you commit resources.",
  },
  {
    icon: Gauge,
    title: "Reality scoring",
    text: "Every deal gets a risk score built from observable signals — not gut feel. Your forecast stops being a wish list.",
  },
];

const steps = [
  { n: "01", title: "Connect", text: "Plug iSale into your existing CRM. No migration, no new workflow for your reps." },
  { n: "02", title: "Analyze", text: "iSale reads the observable signals in every open deal: stage history, discount patterns, stakeholder coverage." },
  { n: "03", title: "Act", text: "Risk alerts land where your team already works. Kill bad deals early, double down on real ones." },
];

export default function ISalePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal>
            <Stamp tone="isale">iSale — Revenue intelligence</Stamp>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
              Stop signing bad deals.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              iSale detects the hidden risks in your deals before signature.
              It reads the signals already sitting in your CRM — and tells you
              which deals are real, which are stalling, and which will burn your
              quarter.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <a
              href="https://www.isale-ts.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-9 inline-flex items-center gap-2 rounded-lg bg-isale px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Request a demo <ArrowRight size={16} />
            </a>
            <div><FirmaSeal className="mt-6" /></div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px px-5 py-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="px-3 py-2 text-center sm:text-left">
                <div className="font-mono text-2xl font-bold text-isale">{s.value}</div>
                <div className="mt-1 text-sm text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            The signals your pipeline is already sending
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Bad deals leave traces long before they close — or collapse. iSale
            reads them systematically.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {signals.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="h-full rounded-card border border-line bg-card p-6">
                <s.icon size={20} className="text-isale" />
                <h3 className="mt-4 text-base font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              How it works
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div>
                  <div className="font-mono text-sm font-semibold text-isale">{s.n}</div>
                  <h3 className="mt-2 text-base font-semibold text-text">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FirmaLayer what="Every risk score iSale puts on a deal, and the signals it was built from, is written to FIRMA." />

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <div className="rounded-card border border-line bg-card px-8 py-12 text-center">
            <AlertTriangle size={22} className="mx-auto text-isale" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-text sm:text-3xl">
              How many deals in your pipeline are already dead?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Find out in 30 days. iSale plugs into your CRM and starts scoring
              your open deals from day one.
            </p>
            <a
              href="https://www.isale-ts.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-isale px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Request a demo <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
