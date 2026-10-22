"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { mountFlow } from "../firma-experience/flow";
import { pageTop } from "../firma-experience/listen";
import { TunePanel } from "../firma-experience/TunePanel";
import { AGRO_DEFAULTS, AGRO_PARAMS, AGRO_STORE, agroTune } from "./agroTuning";
import { FEATURES, STATS, STEPS } from "./content";
import "./agro.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const AgroScene = dynamic(() => import("./AgroScene"), { ssr: false });

const MAIL = "mailto:contact@inovigroup.co.uk?subject=AGRO%20pilot%20partnership";

function StepBody({ step: [idx, h, what, why], i }: { step: (typeof STEPS)[number]; i: number }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`ag-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>Why it matters</b>{why}</p>
    </div>
  );
}

/**
 * /agro: the soil cutaway behind the page, scrubbed by scroll (hero 0 → story steps 1–7, between section
 * centres), the same natural scroll as the Firma page. ?tune=1 opens the scene's tuning panel.
 */
export function AgroExperience() {
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
    <div className="ag-exp" ref={rootRef}>
      <div className="ag-scene" aria-hidden="true">
        {ready && reduceMotion.current && <AgroScene getStep={getStep} reduceMotion={reduceMotion.current} />}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="ag-content">
        <section className="section hero" id="top">
          <div className="hero-copy">
            <Stamp tone="agro">AGRO · Smart irrigation</Stamp>
            <h1>Smart irrigation for the farmers the industry <em>forgot.</em></h1>
            <p className="lede">
              AGRO&apos;s sensors live underground, in the root zone. They read what&apos;s happening under the dirt and
              dose exactly the water the crop needs, with advice on any phone. Because the families who grow a third
              of the world&apos;s food shouldn&apos;t need a data plan to save water.
            </p>
            <ul className="values">
              {STATS.map((s) => <li key={s.label}><b>{s.value}</b><span>{s.label}</span></li>)}
            </ul>
            <div className="cta-block">
              <a href={MAIL} className="inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Partner on a pilot <ArrowRight size={16} />
              </a>
            </div>
            <div className="scroll-cue">Scroll: under the surface</div>
          </div>
        </section>

        {STEPS.map((st, i) => (
          <section key={i} className="section flow-step" aria-labelledby={`ag-${i + 1}`}><StepBody step={st} i={i} /></section>
        ))}

        <section className="section features" aria-labelledby="ag-feat">
          <div>
            <span className="idx">04 · Why it works</span>
            <h2 id="ag-feat">Technology that meets farmers where they are.</h2>
            <p className="feat-lede">Most agritech assumes a smartphone, a stable connection, and time to learn a dashboard. AGRO assumes none of that.</p>
            <ul className="feat-grid">
              {FEATURES.map((f) => (
                <li key={f.title}><f.icon size={20} className="text-agro" aria-hidden="true" /><b>{f.title}</b><p>{f.text}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section close" aria-labelledby="ag-end">
          <div className="step">
            <span className="idx">AGRO · Smart irrigation</span>
            <h2 id="ag-end">Working on water, food security, or climate resilience?</h2>
            <p>We partner with agritech organisations, cooperatives and impact programmes to bring AGRO to the field. Pilots are designed around real farms and measured on real outcomes.</p>
            <div className="cta-block">
              <a href={MAIL} className="inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Start the conversation <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </div>

      {tune && (
        <TunePanel defaults={AGRO_DEFAULTS} params={AGRO_PARAMS} live={agroTune} store={AGRO_STORE}
          title="Agro scene tuning" hint="Scroll through the story to see each part. Changes apply live and are kept in this browser." />
      )}
    </div>
  );
}
