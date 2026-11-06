"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { FirmaLayer } from "@/components/firma/FirmaLayer";
import { FirmaBadge } from "@/components/firma/FirmaBadge";
import { applyOutcome, createStoryData, type Outcome, type StoryData } from "./content";
import { copyFor, STEP_COUNT, type Step } from "./copy";
import { featuresFor } from "./features";
import { ISALE_APP, MAIL, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { Faq } from "@/components/Faq";
import { mountFlow } from "./flow";
import { mountStory } from "./story";
import { pageTop } from "./listen";
import type { SceneApi } from "./ExperienceScene";
import { TunePanel } from "./TunePanel";
import "./experience.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const ExperienceScene = dynamic(() => import("./ExperienceScene"), { ssr: false });

// Three ways to scroll the story: ?scroll=a (natural, scrubbed) | b (magnetic) | c (one step at a time).
const SCROLL_KEYS = ["a", "b", "c"] as const;
type ScrollMode = (typeof SCROLL_KEYS)[number];
// Three ways of separating the deal analysis from the FIRMA record: ?layout=1|2|3 (or the review toggle).
const LAYOUTS = [1, 2, 3];
const OUTCOME_BEAT = 4, LANDS_AT = 4.5; // "Then the deal closes." (scene step 5); the outcome hits the envelope at 4.5

type Config = { scroll: ScrollMode; layout: number; outcome: Outcome; treatment: string; tune: boolean; review: boolean };
function readConfig(): Config {
  const q = new URLSearchParams(window.location.search);
  const s = q.get("scroll");
  const l = Number(q.get("layout"));
  const c = q.get("chain");
  return {
    scroll: SCROLL_KEYS.includes(s as ScrollMode) ? (s as ScrollMode) : "a",
    layout: LAYOUTS.includes(l) ? l : 1,
    outcome: q.get("outcome") === "won" ? "won" : "lost",
    // wax seals are the chosen treatment; padlocks (a) and vault (c) stay reachable via ?chain= for reference
    treatment: c === "a" || c === "c" ? c : "b",
    // ?tune=1: the hero tuning panel (for the team; normal visitors never see it)
    tune: q.get("tune") === "1",
    // ?review=1: the layout / scroll / outcome toggle (for the team; normal visitors never see it)
    review: q.get("review") === "1" || q.get("tune") === "1",
  };
}

function Ctas({ lang }: { lang: Lang }) {
  const t = copyFor(lang);
  return (
    <div className="cta-block">
      <a href={ISALE_APP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
        {t.ctaApp} <ArrowRight size={16} />
      </a>
      <a href={`mailto:${MAIL}?subject=${encodeURIComponent(t.mailSubject)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-firma">
        {t.ctaTalk}
      </a>
    </div>
  );
}

function StepBody({ step: [idx, h, what, why], i, why: whyLabel }: { step: Step; i: number; why: string }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`b-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>{whyLabel}</b>{why}</p>
    </div>
  );
}

// What iSale does: one card per entry in features.ts (toggle them there)
function Features({ lang }: { lang: Lang }) {
  const list = featuresFor(lang), t = copyFor(lang);
  if (!list.length) return null;
  return (
    <section className="section trust" id="features" aria-labelledby="h-trust">
      <div>
        <span className="idx">{t.featuresIdx}</span>
        <h2 id="h-trust">{t.featuresTitle}</h2>
        <p className="trust-lede">{t.featuresLede}</p>
        <ul className="trust-grid">
          {list.map((f) => (
            <li key={f.title} className={f.pillar ? "pillar" : undefined}>
              <span className="trust-tag"><f.icon size={15} aria-hidden="true" />{f.tag}</span>
              <b>{f.title}</b>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The iSale page (/isale/, /fr/isale/): the envelope scene behind the scroll story. ?tune=1 opens the hero tuning panel. */
export function IsaleExperience({ lang = "en" }: { lang?: Lang }) {
  const t = copyFor(lang), STEPS = t.steps, why = ui(lang).whyItMatters, rv = t.review;
  const [cfg, setCfg] = useState<Config | null>(null);
  const [layout, setLayout] = useState(1);
  const [outcome, setOutcome] = useState<Outcome>("lost");
  const [data, setData] = useState<StoryData | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const sceneApi = useRef<SceneApi | null>(null);
  const stepFn = useRef<() => number>(() => 0);
  const goFn = useRef<((i: number) => void) | null>(null);
  const reduceMotion = useRef<MediaQueryList | null>(null);

  // the query string decides the variant, so it is read once on the client
  useEffect(() => {
    const c = readConfig();
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    setCfg(c);
    setLayout(c.layout);
    setOutcome(c.outcome);
    setData(createStoryData(c.outcome, lang));
  }, [lang]);

  // this page drives its own scrolling; the site's smooth scroll would fight it
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  // scroll → scene step
  useEffect(() => {
    if (!cfg || !rootRef.current) return;
    const rm = reduceMotion.current!;
    if (cfg.scroll === "c") {
      // one large step per scroll notch; the scene follows the step, not the raw scroll position
      const story = mountStory({ storyEl: storyRef.current!, reduceMotion: rm });
      stepFn.current = story.getStep;
      goFn.current = story.go;
      return () => { story.destroy(); goFn.current = null; };
    }
    // natural scroll: the scene is scrubbed by scroll position (hero 0 → steps 1–8), between section centres
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
      return Math.min(STEP_COUNT, centers.length - 1);
    };
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    const flow = mountFlow({ steps: [...rootRef.current.querySelectorAll<HTMLElement>(".flow-step")], magnetic: cfg.scroll === "b", reduceMotion: rm });
    return () => { window.removeEventListener("resize", measure); flow.destroy(); };
  }, [cfg]);

  const getStep = useCallback(() => stepFn.current(), []);
  // landing: the mesh stays sharp (no filter); a soft dark gradient behind the headline keeps it readable
  const setBackdrop = useCallback((bg: number) => {
    rootRef.current?.style.setProperty("--landing", (1 - bg).toFixed(3));
  }, []);

  const setParam = (k: string, v: string) => {
    const q = new URLSearchParams(window.location.search);
    q.set(k, v);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q}${window.location.hash}`);
  };
  // scroll variants reload the page; the links carry the current layout and outcome along
  const scrollHref = (s: string) => {
    if (!cfg) return `?scroll=${s}`;
    const q = new URLSearchParams(window.location.search);
    q.set("scroll", s);
    return `?${q}`;
  };

  function pickLayout(id: number) {
    setLayout(id);
    setParam("layout", String(id));
  }
  // Outcome: rewrite the story for a win or a loss and replay the impact (scrolling to it first if needed)
  function pickOutcome(o: Outcome | "replay") {
    if (!data) return;
    if (o !== "replay" && o !== outcome) {
      applyOutcome(data, o);
      sceneApi.current?.setOutcome();
      setOutcome(o);
      setParam("outcome", o);
    }
    // replay in place where the deal is on screen; from the month end, go back to the deal first
    const here = stepFn.current();
    if (here >= LANDS_AT && !sceneApi.current?.inMonth()) { sceneApi.current?.replayOutcome(); return; }
    if (goFn.current) goFn.current(OUTCOME_BEAT);
    else rootRef.current?.querySelectorAll(".flow-step")[OUTCOME_BEAT]?.scrollIntoView({ behavior: reduceMotion.current?.matches ? "auto" : "smooth", block: "center" });
    // coming back from past the hit, it would not fire again by itself: play it once the deal is back in view
    if (here >= LANDS_AT) window.setTimeout(() => sceneApi.current?.replayOutcome(), reduceMotion.current?.matches ? 50 : 1300);
  }

  const mode = cfg?.scroll ?? "a";
  return (
    <div className="fx-exp" ref={rootRef} data-scroll={mode}>
      <div className="fx-scene" aria-hidden="true">
        {cfg && data && reduceMotion.current && (
          <ExperienceScene getStep={getStep} data={data} layout={layout} treatment={cfg.treatment}
            reduceMotion={reduceMotion.current} apiRef={sceneApi} setBackdrop={setBackdrop} />
        )}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="fx-content">
        <section className="section hero calm" id="top">
          <div className="hero-copy">
            <Stamp tone="firma">{t.stamp}</Stamp>
            <h1>{t.h1[0]}<em>{t.h1[1]}</em></h1>
            <p className="lede">{t.lede}</p>
            <ul className="values">
              {t.values.map(([b, span]) => <li key={b}><b>{b}</b><span>{span}</span></li>)}
            </ul>
            <Ctas lang={lang} />
            <FirmaBadge className="mt-5" lang={lang} />
            <div className="scroll-cue">{t.scrollCue}</div>
          </div>
        </section>

        {mode === "c" ? (
          <section className="story" id="story" aria-label={t.storyLabel} ref={storyRef}>
            <div className="story-stage">
              <div className="beats">
                {STEPS.map((st, i) => (
                  <article key={i} className="beat" data-i={i} aria-labelledby={`b-${i + 1}`}><StepBody step={st} i={i} why={why} /></article>
                ))}
              </div>
              <div className="story-rail" aria-hidden="true">{STEPS.map((_, i) => <i key={i} />)}</div>
              <div className="story-count" aria-hidden="true"><b>1</b> / {STEPS.length}<span>{t.nextStep}</span></div>
            </div>
          </section>
        ) : (
          STEPS.map((st, i) => (
            <section key={i} className="section flow-step" aria-labelledby={`b-${i + 1}`}><StepBody step={st} i={i} why={why} /></section>
          ))
        )}

        <Features lang={lang} />

        <FirmaLayer what={t.layer} lang={lang} />

        <Faq title={ui(lang).faq} items={t.faq} tone="firma" className="faq-dark" />

        <section className="section calm close" id="summary" aria-labelledby="h-end">
          <div className="step">
            <span className="idx">{t.closeIdx}</span>
            <h2 id="h-end">{t.closeTitle}</h2>
            <p>{t.closeText}</p>
            <Ctas lang={lang} />
            <p className="fineprint">{t.fineprint}</p>
          </div>
        </section>
      </div>

      {cfg?.tune && <TunePanel />}

      {/* review toggle (?review=1): layout, scroll variant and outcome */}
      {cfg?.review && (
        <div className="treat">
          <div role="group" aria-label={rv.layout}>
            <span>{rv.layout}</span>
            {LAYOUTS.map((k) => (
              <button key={k} type="button" aria-pressed={k === layout} onClick={() => pickLayout(k)}>
                <b>{k}</b><i> {rv.layouts[k]}</i>
              </button>
            ))}
          </div>
          <div role="group" aria-label={rv.scroll}>
            <span>{rv.scroll}</span>
            {SCROLL_KEYS.map((k) => (
              <a key={k} href={scrollHref(k)} aria-current={k === mode}><b>{k.toUpperCase()}</b><i> {rv.scrolls[k]}</i></a>
            ))}
          </div>
          <div role="group" aria-label={rv.outcome}>
            <span>{rv.outcome}</span>
            {(["lost", "won"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={k === outcome} onClick={() => pickOutcome(k)}><i>{rv.deal}</i>{rv[k]}</button>
            ))}
            <button type="button" title={rv.replayTitle} onClick={() => pickOutcome("replay")}>↻<i> {rv.replay}</i></button>
          </div>
        </div>
      )}
    </div>
  );
}
