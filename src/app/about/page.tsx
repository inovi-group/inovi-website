import type { Metadata } from "next";
import { ArrowRight, Github, MapPin } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "INOVI Group Ltd is a London-based company building trust infrastructure for the AI economy: open specifications, verifiable systems, applied field products.",
  alternates: { canonical: "https://inovigroup.co.uk/about" },
};

const team = [
  { name: "Bachir Bouabdellah Belbia", role: "CEO & Founder" },
  { name: "Samir Founou", role: "Chief Technology Officer" },
  { name: "Diana Jarche", role: "Chief Operating Officer" },
  { name: "Mohamed Bouabdelli", role: "Director of Communications" },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium tracking-wide text-muted">
              <MapPin size={12} className="text-accent" />
              LONDON, UNITED KINGDOM
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
              We build systems that prove what happened.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              INOVI Group Ltd builds trust infrastructure for an economy where
              AI agents make consequential decisions. Our approach is
              deliberately concrete: publish the specification in the open,
              ship a working implementation, and prove it on commercial
              products with measurable outcomes.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <Reveal>
            <h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
              How we work
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <Reveal delay={0.05}>
              <div>
                <div className="font-mono text-sm font-semibold text-accent">01 — Open</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The FIRMA specification is public under GPL-3.0, with a
                  reference implementation anyone can run. Verifiability starts
                  with being verifiable ourselves.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <div className="font-mono text-sm font-semibold text-accent">02 — Measured</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Every claim we make externally is measurable: detection
                  accuracy, water savings, deal-risk reduction. If we
                  can&apos;t measure it, we don&apos;t say it.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div>
                <div className="font-mono text-sm font-semibold text-accent">03 — Applied</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Infrastructure earns trust in the field. iSale and AGRO are
                  commercial products first — and living proof of the trust
                  layer underneath them.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
            Leadership
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.06}>
              <div className="rounded-card border border-line bg-card p-6">
                <div className="text-base font-semibold text-text">{m.name}</div>
                <div className="mt-1 text-sm text-muted">{m.role}</div>
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
                Talk to us
              </h2>
              <p className="mt-3 text-muted">
                Commercial teams, agritech partners, technical programmes,
                investors — we answer email.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="mailto:contact@inovigroup.co.uk"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  contact@inovigroup.co.uk <ArrowRight size={16} />
                </a>
                <a
                  href="https://github.com/inovi-group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent"
                >
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
