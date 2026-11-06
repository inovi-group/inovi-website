"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { ChainMark } from "@/components/firma/FirmaBadge";
import { DEMO, href, MAIL, type Lang } from "@/i18n";
import { TunePanel } from "../isale-experience/TunePanel";
import { HOME_DEFAULTS, HOME_PARAMS, HOME_STORE, homeTune } from "./homeTuning";
import { homeCopy } from "./content";
import { ProductRing } from "./ProductRing";
import "./home.css";

/**
 * The home page: the two products (iSale, AGRO) as 3D objects on a turntable around FIRMA's seal, then the
 * proofs, the products, FIRMA (the platform under both), why it matters, and a call to action.
 * ?tune=1 opens the ring's tuning panel.
 */
export function HomeExperience({ lang = "en" }: { lang?: Lang }) {
  const c = homeCopy(lang);
  const [tune, setTune] = useState(false);
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).get("tune") === "1";
    // a plain visit always shows the defaults, even after tuning earlier in the same session
    if (!on) Object.assign(homeTune, HOME_DEFAULTS);
    setTune(on);
  }, []);

  return (
    <div className="hm-page">
      <section className="hm-hero" id="top">
        <div className="hm-copy">
          <Stamp>{c.stamp}</Stamp>
          <h1>{c.h1[0]}<em>{c.h1[1]}</em></h1>
          <p className="lede">{c.lede}</p>
          <div className="cta-block">
            <Link href={href(lang, "isale")}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              {c.ctaPrimary} <ArrowRight size={16} />
            </Link>
            <a href={DEMO} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
              <PlayCircle size={16} /> {c.ctaDemo}
            </a>
          </div>
        </div>
        <ProductRing lang={lang} />
      </section>

      <section className="hm-proofs" aria-label={c.proofsLabel}>
        <ul>
          {c.proofs.map(([label, value, detail]) => <li key={label}><span>{label}</span><b>{value}</b><i>{detail}</i></li>)}
        </ul>
      </section>

      <section className="hm-band" aria-labelledby="hm-products">
        <span className="idx">{c.productsIdx}</span>
        <h2 id="hm-products">{c.productsTitle}</h2>
        <p className="band-lede">{c.productsLede}</p>
        <div className="prod-grid two">
          {c.cards.map((p) => (
            <Link key={p.key} href={href(lang, p.key)} className={`prod tone-${p.tone}`}>
              <span className="prod-tag"><p.icon size={16} aria-hidden="true" />{p.tagline}</span>
              <b>{p.name}</b>
              <p>{p.description}</p>
              <span className="prod-cta">{p.cta} <ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
        <Link className="energy platform" href={href(lang, "firma")}>
          <ChainMark size={20} /><b>{c.platformLine[0]}</b><span>{c.platformLine[1]}</span><i>{c.platformLine[2]} <ArrowRight size={13} aria-hidden="true" /></i>
        </Link>
      </section>

      <FirmaLayer what={c.layer} lang={lang} />

      <section className="hm-band" aria-labelledby="hm-why">
        <h2 id="hm-why">{c.whyTitle}</h2>
        <ul className="principles">
          {c.principles.map((p) => (
            <li key={p.title}><p.icon size={20} className="text-accent" aria-hidden="true" /><b>{p.title}</b><p>{p.text}</p></li>
          ))}
        </ul>
      </section>

      <section className="hm-band hm-cta" aria-labelledby="hm-end">
        <h2 id="hm-end">{c.endTitle}</h2>
        <p>{c.endText}</p>
        <div className="cta-block">
          <a href={DEMO} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            {c.endDemo}
          </a>
          <a href={`mailto:${MAIL}`}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
            {c.endContact}
          </a>
        </div>
      </section>

      {tune && (
        <TunePanel defaults={HOME_DEFAULTS} params={HOME_PARAMS} live={homeTune} store={HOME_STORE}
          title="Home ring tuning" hint="Changes apply live and are kept in this browser." />
      )}
    </div>
  );
}
