import Link from "next/link";
import { ArrowRight, BrainCircuit, Fingerprint, Link2, ShieldCheck } from "lucide-react";
import { href, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { SealMark } from "./FirmaSeal";

const ICONS = [BrainCircuit, Fingerprint, Link2, ShieldCheck];

/**
 * "Built on FIRMA": one short section on each product page, explaining the platform underneath.
 * `what` says what this product writes to and gets from FIRMA. It sits on its own dark ground, so it reads over a 3D scene.
 */
export function FirmaLayer({ what, lang = "en" }: { what: string; lang?: Lang }) {
  const t = ui(lang).layer;
  return (
    <section className="firma-layer relative z-[2] py-20" aria-labelledby="firma-layer-h">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,13,19,0),rgba(10,13,19,0.95)_90px,rgba(10,13,19,0.95)_calc(100%-90px),rgba(10,13,19,0))]" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center gap-3">
          <SealMark size={36} />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-firma">{t.kicker}</span>
        </div>
        <h2 id="firma-layer-h" className="mt-4 max-w-3xl text-[clamp(28px,3vw,42px)] font-bold leading-[1.1] tracking-[-0.03em] text-text">
          {t.title}
        </h2>
        <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-muted">{what} {t.body}</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.points.map(([title, text], i) => {
            const Icon = ICONS[i];
            return (
              <li key={title} className="rounded-card border border-line bg-card/85 p-5">
                <Icon size={18} className="text-firma" aria-hidden="true" />
                <b className="mt-3 block text-[15px] font-semibold text-text">{title}</b>
                <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted">{text}</span>
              </li>
            );
          })}
        </ul>
        <Link href={href(lang, "firma")} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-firma hover:opacity-85">
          {t.more} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
