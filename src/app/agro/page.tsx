import type { Metadata } from "next";
import {
  ArrowRight,
  Droplets,
  MessageSquare,
  Sprout,
  SunMedium,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Stamp } from "@/components/Stamp";

export const metadata: Metadata = {
  title: "AGRO — Smart Irrigation for Smallholder Farmers",
  description:
    "AGRO lets smallholder farmers irrigate intelligently — no smartphone required. 35–50% water savings, built for the field.",
  alternates: { canonical: "https://inovigroup.co.uk/agro" },
};

const stats = [
  { value: "35–50%", label: "water savings" },
  { value: "No smartphone", label: "required to use it" },
  { value: "Field-first", label: "designed with farmers" },
];

const features = [
  {
    icon: SunMedium,
    title: "Reads the field, not the cloud dashboard",
    text: "Soil moisture, weather patterns, crop stage — AGRO turns field conditions into one clear answer: irrigate now, or wait.",
  },
  {
    icon: MessageSquare,
    title: "Advice on any phone",
    text: "Recommendations arrive as simple messages on the phones farmers already own. No app to install, no data plan to afford, no training course.",
  },
  {
    icon: Droplets,
    title: "Every drop accounted for",
    text: "Water is the most expensive input a smallholder has. AGRO cuts consumption by 35–50% while protecting yield — measured in the field, not the lab.",
  },
  {
    icon: Sprout,
    title: "Built for small farms",
    text: "Not a scaled-down enterprise product. AGRO is designed for one-hectare plots, family labour, and real budget constraints from day one.",
  },
];

export default function AgroPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal>
            <Stamp tone="agro">AGRO — Smart irrigation</Stamp>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
              Smart irrigation for the farmers the industry forgot.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              AGRO lets smallholder farmers irrigate intelligently — no
              smartphone required. Because the families who grow a third of the
              world&apos;s food shouldn&apos;t need a data plan to save water.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <a
              href="mailto:contact@inovigroup.co.uk?subject=AGRO%20pilot%20partnership"
              className="mt-9 inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Partner on a pilot <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px px-5 py-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="px-3 py-2 text-center sm:text-left">
                <div className="font-mono text-2xl font-bold text-agro">{s.value}</div>
                <div className="mt-1 text-sm text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Technology that meets farmers where they are
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Most agritech assumes a smartphone, a stable connection, and time to
            learn a dashboard. AGRO assumes none of that.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="h-full rounded-card border border-line bg-card p-6">
                <f.icon size={20} className="text-agro" />
                <h3 className="mt-4 text-base font-semibold text-text">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
                Working on water, food security, or climate resilience?
              </h2>
              <p className="mt-3 text-muted">
                We partner with agritech organisations, cooperatives, and impact
                programmes to bring AGRO to the field. Pilots are designed
                around real farms and measured on real outcomes.
              </p>
              <a
                href="mailto:contact@inovigroup.co.uk?subject=AGRO%20pilot%20partnership"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Start the conversation <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
