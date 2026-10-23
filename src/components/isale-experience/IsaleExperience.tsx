"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { FirmaSeal } from "@/components/firma/FirmaSeal";
import { mountFlow } from "../firma-experience/flow";
import { pageTop } from "../firma-experience/listen";
import { TunePanel } from "../firma-experience/TunePanel";
import { ISALE_DEFAULTS, ISALE_PARAMS, ISALE_STORE, isaleTune } from "./isaleTuning";
import { SIGNALS, STATS, STEPS } from "./content";
import "../scene/scrollPage.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const IsaleScene = dynamic(() => import("./IsaleScene"), { ssr: false });

const DEMO = "https://www.isale-ts.uk";

function StepBody({ step: [idx, h, what, why], i }: { step: (typeof STEPS)[number]; i: number }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`is-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>Why it matters</b>{why}</p>
    </div>
  );
}

/**
 * /isale: the CRM pipeline behind the page, scrubbed by scroll (hero 0 → story steps 1–3, between section
 * centres), the same natural scroll as the Fides and Agro pages. ?tune=1 opens the scene's tuning panel.
 */
export function IsaleExperience() {
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
    <div className="sx is-exp" ref={rootRef}>
      <div className="sx-scene" aria-hidden="true">
        {ready && reduceMotion.current && <IsaleScene getStep={getStep} reduceMotion={reduceMotion.current} />}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="sx-content">
        <section className="section hero" id="top">
          <div className="hero-copy">
            <Stamp tone="isale">iSale · Revenue intelligence</Stamp>
            <h1>Stop signing bad <em>deals.</em></h1>
            <p className="lede">
              iSale detects the hidden risks in your deals before signature. It reads the signals already sitting in
              your CRM, and tells you which deals are real, which are stalling, and which will burn your quarter.
            </p>
            <ul className="values">
              {STATS.map((s) => <li key={s.label}><b>{s.value}</b><span>{s.label}</span></li>)}
            </ul>
            <div className="cta-block">
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-isale px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Request a demo <ArrowRight size={16} />
              </a>
            </div>
            <FirmaSeal className="mt-5" />
            <div className="scroll-cue">Scroll: through the pipeline</div>
          </div>
        </section>

        {STEPS.map((st, i) => (
          <section key={i} className="section flow-step" aria-labelledby={`is-${i + 1}`}><StepBody step={st} i={i} /></section>
        ))}

        <section className="section features" aria-labelledby="is-feat">
          <div>
            <span className="idx">04 · The signals</span>
            <h2 id="is-feat">The signals iSale reads in every deal.</h2>
            <p className="feat-lede">Not a black box: every risk score is built from signals your team can see and check.</p>
            <ul className="feat-grid">
              {SIGNALS.map((f) => (
                <li key={f.title}><f.icon size={20} className="text-isale" aria-hidden="true" /><b>{f.title}</b><p>{f.text}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <FirmaLayer what="Every risk score iSale puts on a deal, and the signals it was built from, is written to FIRMA." />

        <section className="section close" aria-labelledby="is-end">
          <div className="step">
            <span className="idx">iSale · Revenue intelligence</span>
            <h2 id="is-end">How many deals in your pipeline are already dead?</h2>
            <p>Find out in 30 days. iSale plugs into your CRM and starts scoring your open deals from day one.</p>
            <div className="cta-block">
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-isale px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Request a demo <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </div>

      {tune && (
        <TunePanel defaults={ISALE_DEFAULTS} params={ISALE_PARAMS} live={isaleTune} store={ISALE_STORE}
          title="iSale scene tuning" hint="Scroll through the story to see each part. Changes apply live and are kept in this browser." />
      )}
    </div>
  );
}
