"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { TunePanel } from "../firma-experience/TunePanel";
import { HOME_DEFAULTS, HOME_PARAMS, HOME_STORE, homeTune } from "./homeTuning";
import { ENERGY, PRINCIPLES, PRODUCTS, PROOFS, type Product } from "./content";
import { ProductRing } from "./ProductRing";
import "./home.css";

const DEMO = "https://inovi-group.github.io/firma-spec/demo/";

function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={p.href} className={`prod tone-${p.tone}`}>
      <span className="prod-tag"><p.icon size={16} aria-hidden="true" />{p.tagline}</span>
      <b>{p.name}</b>
      <p>{p.description}</p>
      <span className="prod-cta">{p.cta} <ArrowRight size={14} aria-hidden="true" /></span>
    </Link>
  );
}

/**
 * The home page: the three products (FIDES, AGRO, iSale) as 3D objects on a turntable, then the
 * proofs, the products, FIRMA (the trust layer under all three), why it matters, and a call to action.
 * ?tune=1 opens the ring's tuning panel.
 */
export function HomeExperience() {
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
          <Stamp>Trust infrastructure · London, UK</Stamp>
          <h1>INOVI Group. System-first <em>AI governance.</em></h1>
          <p className="lede">
            Zero-latency (&lt;50ms) inline governance proxy for real-time model verification and EU AI Act compliance.
            FIDES, AGRO and iSale, every one secured by the FIRMA trust layer.
          </p>
          <div className="cta-block">
            <a href="https://www.isale-ts.uk" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Request a demo <ArrowRight size={16} />
            </a>
            <a href={DEMO} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
              <PlayCircle size={16} /> Launch the live demo
            </a>
          </div>
        </div>
        <ProductRing />
      </section>

      <section className="hm-proofs" aria-label="Proof points">
        <ul>
          {PROOFS.map((p) => <li key={p.label}><span>{p.label}</span><b>{p.value}</b><i>{p.detail}</i></li>)}
        </ul>
      </section>

      <section className="hm-band" aria-labelledby="hm-products">
        <span className="idx">The products</span>
        <h2 id="hm-products">Three products. One trust layer.</h2>
        <p className="band-lede">Each product stands on its own commercial merit, and each one writes what it sees and decides to FIRMA, the same verifiable record.</p>
        <div className="prod-grid">{PRODUCTS.map((p) => <ProductCard key={p.name} p={p} />)}</div>
        <a className="energy" href={ENERGY.href}>
          <ENERGY.icon size={15} aria-hidden="true" /><b>{ENERGY.name}</b><span>{ENERGY.text}</span><i>Get in touch <ArrowRight size={13} aria-hidden="true" /></i>
        </a>
      </section>

      <FirmaLayer what="Every Inovi product writes what it sees and decides to FIRMA: Fides its deal scores and decisions, AGRO its readings and doses, iSale its risk scores." />

      <section className="hm-band" aria-labelledby="hm-why">
        <h2 id="hm-why">Why verifiability matters now</h2>
        <ul className="principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title}><p.icon size={20} className="text-accent" aria-hidden="true" /><b>{p.title}</b><p>{p.text}</p></li>
          ))}
        </ul>
      </section>

      <section className="hm-band hm-cta" aria-labelledby="hm-end">
        <h2 id="hm-end">Building with verifiable AI?</h2>
        <p>We work with commercial teams, agritech partners and technical programmes. Try the live demo or get in touch.</p>
        <div className="cta-block">
          <a href={DEMO} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Launch the live demo
          </a>
          <a href="mailto:contact@inovigroup.co.uk"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
            Get in touch
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
