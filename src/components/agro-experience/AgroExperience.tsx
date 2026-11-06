"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { FirmaBadge } from "@/components/firma/FirmaBadge";
import { mountFlow } from "../isale-experience/flow";
import { pageTop } from "../isale-experience/listen";
import { TunePanel } from "../isale-experience/TunePanel";
import { AGRO_DEFAULTS, AGRO_PARAMS, AGRO_STORE, agroTune } from "./agroTuning";
import { agroCopy, FEATURE_ICONS, setAgroSceneLang, STEP_COUNT, type Step } from "./content";
import { MAIL, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { Faq } from "@/components/Faq";
import "../scene/scrollPage.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const AgroScene = dynamic(() => import("./AgroScene"), { ssr: false });

function StepBody({ step: [idx, h, what, why], i, why: whyLabel }: { step: Step; i: number; why: string }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`ag-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>{whyLabel}</b>{why}</p>
    </div>
  );
}

/**
 * /agro: the soil cutaway behind the page, scrubbed by scroll (hero 0 → story steps 1–7, between section
 * centres), the same natural scroll as the iSale page. ?tune=1 opens the scene's tuning panel.
 */
export function AgroExperience({ lang = "en" }: { lang?: Lang }) {
  const t = agroCopy(lang), why = ui(lang).whyItMatters;
  const mail = `mailto:${MAIL}?subject=${encodeURIComponent(t.mailSubject)}`;
  const [ready, setReady] = useState(false);
  const [tune, setTune] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepFn = useRef<() => number>(() => 0);
  const reduceMotion = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    setAgroSceneLang(lang); // the scene's canvas words, before it mounts
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    setTune(new URLSearchParams(window.location.search).get("tune") === "1");
    setReady(true);
  }, [lang]);

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
        if (c <= centers[i]) return Math.min(STEP_COUNT, i - 1 + (c - centers[i - 1]) / (centers[i] - centers[i - 1]));
      }
      return STEP_COUNT;
    };
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    const flow = mountFlow({ steps: [...rootRef.current.querySelectorAll<HTMLElement>(".flow-step")], magnetic: false, reduceMotion: reduceMotion.current! });
    return () => { window.removeEventListener("resize", measure); flow.destroy(); };
  }, [ready]);

  const getStep = useCallback(() => stepFn.current(), []);

  return (
    <div className="sx ag-exp" ref={rootRef}>
      <div className="sx-scene" aria-hidden="true">
        {ready && reduceMotion.current && <AgroScene getStep={getStep} reduceMotion={reduceMotion.current} />}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="sx-content">
        <section className="section hero" id="top">
          <div className="hero-copy">
            <Stamp tone="agro">{t.stamp}</Stamp>
            <h1>{t.h1[0]}<em>{t.h1[1]}</em></h1>
            <p className="lede">{t.lede}</p>
            <ul className="values">
              {t.stats.map(([value, label]) => <li key={label}><b>{value}</b><span>{label}</span></li>)}
            </ul>
            <div className="cta-block">
              <a href={mail} className="inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                {t.cta} <ArrowRight size={16} />
              </a>
            </div>
            <FirmaBadge className="mt-5" lang={lang} />
            <div className="scroll-cue">{t.scrollCue}</div>
          </div>
        </section>

        {t.steps.map((st, i) => (
          <section key={i} className="section flow-step" aria-labelledby={`ag-${i + 1}`}><StepBody step={st} i={i} why={why} /></section>
        ))}

        <section className="section features" aria-labelledby="ag-feat">
          <div>
            <span className="idx">{t.featIdx}</span>
            <h2 id="ag-feat">{t.featTitle}</h2>
            <p className="feat-lede">{t.featLede}</p>
            <ul className="feat-grid">
              {t.features.map(([title, text], i) => {
                const Icon = FEATURE_ICONS[i];
                return <li key={title}><Icon size={20} className="text-agro" aria-hidden="true" /><b>{title}</b><p>{text}</p></li>;
              })}
            </ul>
          </div>
        </section>

        <FirmaLayer what={t.layer} lang={lang} />

        <Faq title={ui(lang).faq} items={t.faq} tone="agro" className="faq-dark" />

        <section className="section close" aria-labelledby="ag-end">
          <div className="step">
            <span className="idx">{t.endIdx}</span>
            <h2 id="ag-end">{t.endTitle}</h2>
            <p>{t.endText}</p>
            <div className="cta-block">
              <a href={mail} className="inline-flex items-center gap-2 rounded-lg bg-agro px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                {t.ctaEnd} <ArrowRight size={16} />
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
