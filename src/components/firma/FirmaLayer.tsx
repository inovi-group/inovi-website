import Link from "next/link";
import { ArrowRight, Fingerprint, Link2, ShieldCheck } from "lucide-react";
import { SealMark } from "./FirmaSeal";

const POINTS = [
  { icon: Fingerprint, title: "Sealed at the source", text: "Every record is hashed with SHA3-512 and signed the moment it is written, with the time it was written." },
  { icon: Link2, title: "Chained, append-only", text: "Each record points to the one before it. Nothing can be edited, reordered or removed without breaking the chain." },
  { icon: ShieldCheck, title: "Verifiable by anyone", text: "An open specification (FIRMA v2.0) and an open validator: auditors check the record themselves, no vendor access needed." },
];

/**
 * "Secured by FIRMA": one short section on each product page, explaining the trust layer underneath.
 * `what` says what this product writes to the record. It sits on its own dark ground, so it reads over a 3D scene.
 */
export function FirmaLayer({ what }: { what: string }) {
  return (
    <section className="firma-layer relative z-[2] px-5 py-20" aria-labelledby="firma-layer-h">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,13,19,0),rgba(10,13,19,0.95)_90px,rgba(10,13,19,0.95)_calc(100%-90px),rgba(10,13,19,0))]" aria-hidden="true" />
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <SealMark size={36} />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-firma">FIRMA · The trust layer</span>
        </div>
        <h2 id="firma-layer-h" className="mt-4 max-w-3xl text-[clamp(28px,3vw,42px)] font-bold leading-[1.1] tracking-[-0.03em] text-text">
          Secured by FIRMA.
        </h2>
        <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-muted">
          {what} FIRMA is the verifiable, tamper-proof record layer under every Inovi product: what was recorded, and
          when, can be proven later, and can&apos;t be quietly rewritten.
        </p>
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-card border border-line bg-card/85 p-5">
              <p.icon size={18} className="text-firma" aria-hidden="true" />
              <b className="mt-3 block text-[15px] font-semibold text-text">{p.title}</b>
              <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted">{p.text}</span>
            </li>
          ))}
        </ul>
        <Link href="/firma/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-firma hover:opacity-85">
          How FIRMA works <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
