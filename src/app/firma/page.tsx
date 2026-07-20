import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Github,
  Link2,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "FIRMA — Open Specification for Cryptographic Audit Trails",
  description:
    "FIRMA v2.0: an open specification for tamper-evident records in multi-agent systems. SHA3-512 hash chains, Ed25519 signatures, GPL-3.0.",
  alternates: { canonical: "https://inovigroup.co.uk/firma" },
};

const facts = [
  { label: "Specification", value: "v2.0", detail: "stable, GPL-3.0" },
  { label: "Hash algorithm", value: "SHA3-512", detail: "128-char digests" },
  { label: "Signatures", value: "Ed25519", detail: "per-record signing" },
  { label: "Reference tests", value: "16/16", detail: "Python implementation" },
];

const properties = [
  {
    title: "Append-only by construction",
    text: "Each record embeds the hash of its predecessor. Altering any historical record invalidates every subsequent hash — falsification is detectable by recomputation, without trusting the storage layer.",
  },
  {
    title: "Independently verifiable",
    text: "Verification requires only the record set and the published algorithm. No proprietary tooling, no vendor account, no network access. The reference validator is open source.",
  },
  {
    title: "Storage-agnostic",
    text: "The specification defines record structure, canonical serialization, and hash computation. It runs on PostgreSQL with write-once triggers today, and is portable to any append-capable store.",
  },
  {
    title: "Measured, not promised",
    text: "The current prototype detects contradictions between declared intent and observed behaviour with 72% accuracy on financial test cases. We publish what we measure.",
  },
];

const resources = [
  {
    icon: BookOpen,
    title: "Read the specification",
    text: "FIRMA v2.0 — record types, hash computation, signature scheme, chain verification.",
    href: "https://github.com/inovi-group/firma-spec",
    cta: "github.com/inovi-group/firma-spec",
  },
  {
    icon: PlayCircle,
    title: "Try the live demo",
    text: "Interactive hash-chain demonstration: create records, tamper with them, watch verification fail.",
    href: "https://inovi-group.github.io/firma-spec/demo/",
    cta: "Launch demo",
  },
  {
    icon: Github,
    title: "Run the validators",
    text: "Python reference implementation with full test suite. Validate any FIRMA chain in seconds.",
    href: "https://github.com/inovi-group/firma-spec",
    cta: "View source",
  },
];

export default function FirmaPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-28">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium tracking-wide text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-firma" />
              FIRMA — OPEN SPECIFICATION
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
              Audit trails that cannot be quietly rewritten.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              FIRMA is an open specification for tamper-evident records in
              multi-agent systems. Every record is hashed with SHA3-512, signed
              with Ed25519, and chained to its predecessor — so integrity is a
              property you verify, not a claim you trust.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/inovi-group/firma-spec"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Github size={16} /> Read the spec
              </a>
              <a
                href="https://inovi-group.github.io/firma-spec/demo/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-firma"
              >
                <PlayCircle size={16} /> Live demo
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4">
          {facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.06}>
              <div className="px-3 py-2">
                <div className="text-xs uppercase tracking-[0.1em] text-dim">{f.label}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-firma">{f.value}</div>
                <div className="text-xs text-muted">{f.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Hash formula */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            One formula, verifiable by anyone
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Each record&apos;s hash commits to its content, its metadata, and the
            hash of the record before it (specification §4):
          </p>
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
          {properties.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <div className="h-full rounded-card border border-line bg-card p-6">
                <ShieldCheck size={20} className="text-firma" />
                <h3 className="mt-4 text-base font-semibold text-text">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Everything is public
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {resources.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.08}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col rounded-card border border-line bg-card p-6 transition-colors hover:border-firma"
                >
                  <r.icon size={20} className="text-firma" />
                  <h3 className="mt-4 text-base font-semibold text-text">{r.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{r.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-firma">
                    <Link2 size={12} /> {r.cta}
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pilot CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <div className="rounded-card border border-line bg-card px-8 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Technical pilot — 8 weeks
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              We run scoped technical pilots for organisations evaluating
              verifiable audit infrastructure: defined dataset, measurable
              acceptance criteria, full access to the running system.
            </p>
            <a
              href="mailto:contact@inovigroup.co.uk?subject=FIRMA%20technical%20pilot"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Discuss a pilot <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
