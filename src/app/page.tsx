import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  PlayCircle,
  Sprout,
  FileCheck2,
  Zap,
  ShieldCheck,
  Lock,
  Scale,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ChainCanvas } from "@/components/ChainCanvas";
import { JsonLd } from "@/components/JsonLd";
import { Stamp } from "@/components/Stamp";

export const metadata: Metadata = {
  title: "INOVI Group — System-First AI Governance",
  description:
    "Zero-latency (<50ms) inline governance proxy for real-time model verification and EU AI Act compliance. Open cryptographic audit-trail specification. London, UK.",
  alternates: { canonical: "https://inovigroup.co.uk" },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "INOVI Group Ltd",
  url: "https://inovigroup.co.uk",
  location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
  sameAs: ["https://github.com/inovi-group"],
};

const pillars = [
  {
    href: "/firma",
    external: false,
    name: "FIRMA TS",
    tagline: "Audit & integrity",
    description:
      "Cryptographic audit trails & decision integrity — SHA3-512 hash chains with Ed25519-signed records.",
    icon: FileCheck2,
    color: "text-firma",
    soft: "bg-firma-soft",
    cta: "Learn more",
  },
  {
    href: "/agro",
    external: false,
    name: "AGRO TS",
    tagline: "Factual verification",
    description:
      "Domain-specific factual verification for agricultural AI systems.",
    icon: Sprout,
    color: "text-agro",
    soft: "bg-agro-soft",
    cta: "Learn more",
  },
  {
    href: "mailto:contact@inovigroup.co.uk?subject=ENERGY%20TS",
    external: true,
    name: "ENERGY TS",
    tagline: "Compliance guardrails",
    description:
      "High-throughput compliance & safety guardrails for industrial energy grids.",
    icon: Zap,
    color: "text-isale",
    soft: "bg-isale-soft",
    cta: "Get in touch",
  },
];

const proofs = [
  { label: "Open specification", value: "FIRMA v2.0", detail: "published under GPL-3.0" },
  { label: "Reference implementation", value: "16/16 tests", detail: "Python validators, public" },
  { label: "Working prototype", value: "End-to-end", detail: "traced LLM pipeline, live" },
  { label: "Company", value: "London, UK", detail: "INOVI Group Ltd" },
];

const principles = [
  {
    icon: ShieldCheck,
    title: "Verifiable by design",
    text: "Every AI decision our systems process is hashed, signed, and chained. Tampering is mathematically detectable — not policed by convention, but prevented by construction.",
  },
  {
    icon: Lock,
    title: "Proof before promise",
    text: "We publish our specification in the open, ship reference implementations, and measure our prototypes on real cases. Claims on this site are measurable or absent.",
  },
  {
    icon: Scale,
    title: "Built for accountability",
    text: "As AI agents take decisions with real-world consequences, capital and regulators need infrastructure that shows what happened — and proves it hasn't been rewritten.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={orgSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-20 sm:pt-28">
          <Reveal>
            <Stamp>Trust infrastructure — London, UK</Stamp>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-6xl">
              INOVI Group — System-First AI&nbsp;Governance
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Zero-latency (&lt;50ms) inline governance proxy for real-time
              model verification and EU AI Act compliance.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="https://inovi-group.github.io/firma-spec/demo/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <PlayCircle size={16} /> Launch the live demo
              </a>
              <a
                href="https://github.com/inovi-group/firma-spec"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent"
              >
                <Github size={16} /> Open-source spec
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.3}>
          <div className="relative mx-auto max-w-6xl px-5 pb-14">
            <ChainCanvas />
          </div>
        </Reveal>
      </section>

      {/* Proof bar */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4">
          {proofs.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.06}>
              <div className="px-3 py-2">
                <div className="text-xs uppercase tracking-[0.1em] text-dim">{p.label}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-text">{p.value}</div>
                <div className="text-xs text-muted">{p.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Product pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Three trust systems. One governance layer.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Each product stands on its own commercial merit — and each one runs
            on the same verifiable governance infrastructure.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => {
            const inner = (
              <>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${p.soft}`}>
                  <p.icon size={19} className={p.color} />
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-text">{p.name}</span>
                  <span className="text-xs uppercase tracking-[0.1em] text-dim">{p.tagline}</span>
                </div>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{p.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  {p.cta}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </>
            );
            const cls =
              "group flex h-full flex-col rounded-card border border-line bg-card p-6 transition-colors hover:border-accent";
            return (
              <Reveal key={p.name} delay={i * 0.08}>
                {p.external ? (
                  <a href={p.href} className={cls}>{inner}</a>
                ) : (
                  <Link href={p.href} className={cls}>{inner}</Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Why verifiability matters now
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div>
                  <p.icon size={20} className="text-accent" />
                  <h3 className="mt-4 text-base font-semibold text-text">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <div className="rounded-card border border-line bg-card px-8 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Building with verifiable AI?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              We work with commercial teams, agritech partners, and technical
              programmes. Try the live demo or get in touch.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://inovi-group.github.io/firma-spec/demo/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Launch the live demo
              </a>
              <a
                href="mailto:contact@inovigroup.co.uk"
                className="rounded-lg border border-line px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent"
              >
                Get in touch
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
