"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { mountFlow } from "../firma-experience/flow";
import { pageTop } from "../firma-experience/listen";
import { TunePanel } from "../firma-experience/TunePanel";
import { HOME_DEFAULTS, HOME_PARAMS, HOME_STORE, homeTune } from "./homeTuning";
import { ENERGY, PRINCIPLES, PRODUCTS, PROOFS, STEPS, type Product } from "./content";
import "../scene/scrollPage.css";
import "./home.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const HomeScene = dynamic(() => import("./HomeScene"), { ssr: false });

const DEMO = "https://inovi-group.github.io/firma-spec/demo/";

function StepBody({ step: [idx, h, what, why], i }: { step: (typeof STEPS)[number]; i: number }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`hm-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>Why it matters</b>{why}</p>
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const inner = (
    <>
      <span className="prod-tag"><p.icon size={16} aria-hidden="true" />{p.tagline}</span>
      <b>{p.name}</b>
      <p>{p.description}</p>
      <span className="prod-cta">{p.cta} <ArrowRight size={14} aria-hidden="true" /></span>
    </>
  );
  return p.external
    ? <a href={p.href} target="_blank" rel="noopener noreferrer" className={`prod tone-${p.tone}`}>{inner}</a>
    : <Link href={p.href} className={`prod tone-${p.tone}`}>{inner}</Link>;
}

/**
 * The home page: INOVI's three products on one governance layer, a 3D ring behind the page scrubbed by scroll
 * (hero 0 → story steps 1–4, between section centres), in the same layout as the Firma and Agro pages.
 * ?tune=1 opens the scene's tuning panel.
 */
export function HomeExperience() {
  const [ready, setReady] = useState(false);
  const [tune, setTune] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepFn = useRef<() => number>(() => 0);
  const reduceMotion = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    setTune(new URLSearchParams(window.location.search).get("tune") === "1");
    setReady(true);
  }, []);

  // the site's smooth scroll would fight the scrubbed scene
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return;
    const sections = [...rootRef.current.querySelectorAll<HTMLElement>(".section")];
    let centers: number[] = [];
    const measure = () => { centers = sections.map((el) => pageTop(el) + el.offsetHeight / 2); };
    measure();
    stepFn.current = () => {
      const c = window.scrollY + window.innerHeight / 2;
      if (c <= centers[0]) return 0;
      for (let i = 1; i < centers.length; i++) {
        if (c <= centers[i]) return Math.min(STEPS.length, i - 1 + (c - centers[i - 1]) / (centers[i] - centers[i - 1]));
      }
      return STEPS.length;
    };
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    const flow = mountFlow({ steps: [...rootRef.current.querySelectorAll<HTMLElement>(".flow-step")], magnetic: false, reduceMotion: reduceMotion.current! });
    return () => { window.removeEventListener("resize", measure); flow.destroy(); };
  }, [ready]);

  const getStep = useCallback(() => stepFn.current(), []);

  return (
    <div className="sx hm-exp" ref={rootRef}>
      <div className="sx-scene" aria-hidden="true">
        {ready && reduceMotion.current && <HomeScene getStep={getStep} reduceMotion={reduceMotion.current} />}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="sx-content">
        <section className="section hero" id="top">
          <div className="hero-copy">
            <Stamp>Trust infrastructure · London, UK</Stamp>
            <h1>INOVI Group. System-first <em>AI governance.</em></h1>
            <p className="lede">
              Zero-latency (&lt;50ms) inline governance proxy for real-time model verification and EU AI Act
              compliance. FIDES, AGRO and iSale, every one secured by the FIRMA trust layer.
            </p>
            <ul className="values">
              {PROOFS.map((p) => <li key={p.label}><b>{p.value}</b><span>{p.label} · {p.detail}</span></li>)}
            </ul>
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
            <div className="scroll-cue">Scroll: three products, one layer</div>
          </div>
        </section>

        {STEPS.map((st, i) => (
          <section key={i} className="section flow-step" aria-labelledby={`hm-${i + 1}`}><StepBody step={st} i={i} /></section>
        ))}

        <section className="section features" aria-labelledby="hm-products">
          <div>
            <span className="idx">05 · The products</span>
            <h2 id="hm-products">Three trust systems. One governance layer.</h2>
            <p className="feat-lede">Each product stands on its own commercial merit, and each one runs on the same verifiable governance infrastructure.</p>
            <div className="prod-grid">{PRODUCTS.map((p) => <ProductCard key={p.name} p={p} />)}</div>
            <a className="energy" href={ENERGY.href}>
              <ENERGY.icon size={15} aria-hidden="true" /><b>{ENERGY.name}</b><span>{ENERGY.text}</span><i>Get in touch <ArrowRight size={13} aria-hidden="true" /></i>
            </a>

            <h2 className="principles-h" id="hm-why">Why verifiability matters now</h2>
            <ul className="feat-grid three" aria-labelledby="hm-why">
              {PRINCIPLES.map((p) => (
                <li key={p.title}><p.icon size={20} className="text-accent" aria-hidden="true" /><b>{p.title}</b><p>{p.text}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section close" aria-labelledby="hm-end">
          <div className="step">
            <span className="idx">INOVI Group</span>
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
          </div>
        </section>
      </div>

      {tune && (
        <TunePanel defaults={HOME_DEFAULTS} params={HOME_PARAMS} live={homeTune} store={HOME_STORE}
          title="Home scene tuning" hint="Scroll through the story to see each product. Changes apply live and are kept in this browser." />
      )}
    </div>
  );
}
