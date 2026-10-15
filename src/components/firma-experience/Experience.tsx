"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/Stamp";
import { applyOutcome, createStoryData, STEPS, type Outcome, type StoryData } from "./content";
import { mountFlow } from "./flow";
import { mountStory } from "./story";
import { pageTop } from "./listen";
import type { SceneApi } from "./ExperienceScene";
import { TunePanel } from "./TunePanel";
import "./experience.css";

// WebGL only in the browser: the static export ships the page text, the scene mounts on the client.
const ExperienceScene = dynamic(() => import("./ExperienceScene"), { ssr: false });

// Three ways to scroll the story: ?scroll=a (natural, scrubbed) | b (magnetic) | c (one step at a time).
const SCROLL_NAMES = { a: "Natural", b: "Magnetic", c: "One at a time" } as const;
type ScrollMode = keyof typeof SCROLL_NAMES;
// Three ways of separating the deal analysis from the FIRMA record: ?layout=1|2|3 (or the toggle).
const LAYOUT_NAMES: Record<number, string> = { 1: "Zones", 2: "Ledger", 3: "Docked" };
const OUTCOME_BEAT = 4, LANDS_AT = 4.5; // "Then the deal closes." (scene step 5); the outcome hits the envelope at 4.5

type Config = { scroll: ScrollMode; layout: number; outcome: Outcome; treatment: string; tune: boolean };
function readConfig(): Config {
  const q = new URLSearchParams(window.location.search);
  const s = q.get("scroll");
  const l = Number(q.get("layout"));
  const c = q.get("chain");
  return {
    scroll: s && s in SCROLL_NAMES ? (s as ScrollMode) : "a",
    layout: LAYOUT_NAMES[l] ? l : 1,
    outcome: q.get("outcome") === "won" ? "won" : "lost",
    // wax seals are the chosen treatment; padlocks (a) and vault (c) stay reachable via ?chain= for reference
    treatment: c === "a" || c === "c" ? c : "b",
    // ?tune=1: the hero tuning panel (for the team; normal visitors never see it)
    tune: q.get("tune") === "1",
  };
}

const MAIL = "mailto:contact@inovigroup.co.uk?subject=FIRMA%20technical%20pilot";
function Ctas() {
  return (
    <div className="cta-block">
      <a href={MAIL} className="inline-flex items-center gap-2 rounded-lg bg-firma px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
        Discuss a pilot <ArrowRight size={16} />
      </a>
      <a
        href="https://github.com/inovi-group/firma-spec"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-firma"
      >
        Read the spec
      </a>
    </div>
  );
}

function StepBody({ step: [idx, h, what, why], i }: { step: (typeof STEPS)[number]; i: number }) {
  return (
    <div className="big-step">
      <span className="idx">{idx}</span>
      <h2 id={`b-${i + 1}`}>{h}</h2>
      <p className="what">{what}</p>
      <p className="why"><b>Why it matters</b>{why}</p>
    </div>
  );
}

export function Experience() {
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
    setData(createStoryData(c.outcome));
  }, []);

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
        if (c <= centers[i]) return Math.min(STEPS.length, i - 1 + (c - centers[i - 1]) / (centers[i] - centers[i - 1]));
      }
      return Math.min(STEPS.length, centers.length - 1);
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
            <Stamp tone="firma">FIRMA · Deal-score assurance</Stamp>
            <h1>Know which deal scores <em>to trust.</em></h1>
            <p className="lede">
              Your CRM is full of risk scores, from revenue tools and from your reps&apos; own forecasts. Firma checks
              them against what actually happens, tells you which to believe, and seals every score and decision in
              an audit trail that cannot be quietly rewritten.
            </p>
            <ul className="values">
              <li><b>Checks the scores you already have</b><span>Every provider score on every deal, tested against real outcomes.</span></li>
              <li><b>Tells you which to trust</b><span>A trust grade for each source, so you know which number to act on.</span></li>
              <li><b>Clear decisions, every month</b><span>A month-end report with calls to make, not more numbers.</span></li>
              <li><b>Sealed, verifiable record</b><span>Every score and decision hashed with SHA3-512 and chained. Integrity you verify, not a claim you trust.</span></li>
            </ul>
            <Ctas />
            <div className="scroll-cue">Scroll: how it works</div>
          </div>
        </section>

        {mode === "c" ? (
          <section className="story" id="story" aria-label="How it works" ref={storyRef}>
            <div className="story-stage">
              <div className="beats">
                {STEPS.map((st, i) => (
                  <article key={i} className="beat" data-i={i} aria-labelledby={`b-${i + 1}`}><StepBody step={st} i={i} /></article>
                ))}
              </div>
              <div className="story-rail" aria-hidden="true">{STEPS.map((_, i) => <i key={i} />)}</div>
              <div className="story-count" aria-hidden="true"><b>1</b> / {STEPS.length}<span>Scroll for the next step</span></div>
            </div>
          </section>
        ) : (
          STEPS.map((st, i) => (
            <section key={i} className="section flow-step" aria-labelledby={`b-${i + 1}`}><StepBody step={st} i={i} /></section>
          ))
        )}

        <section className="section calm close" id="summary" aria-labelledby="h-end">
          <div className="step">
            <span className="idx">FIRMA · Deal-score assurance</span>
            <h2 id="h-end">See which of your deal scores to trust.</h2>
            <p>A sealed, verifiable record of every score, outcome and decision, and a month-end report that tells you what to act on.</p>
            <Ctas />
            <p className="fineprint">Record hashes are real SHA3-512 values in the FIRMA v2.0 format, computed in your browser.</p>
          </div>
        </section>
      </div>

      {cfg?.tune && <TunePanel />}

      {/* review toggle: layout, scroll variant and outcome */}
      <div className="treat">
        <div role="group" aria-label="Layout">
          <span>Layout</span>
          {Object.entries(LAYOUT_NAMES).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={Number(k) === layout} onClick={() => pickLayout(Number(k))}>
              <b>{k}</b><i> {v}</i>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Scroll">
          <span>Scroll</span>
          {(Object.keys(SCROLL_NAMES) as ScrollMode[]).map((k) => (
            <a key={k} href={scrollHref(k)} aria-current={k === mode}><b>{k.toUpperCase()}</b><i> {SCROLL_NAMES[k]}</i></a>
          ))}
        </div>
        <div role="group" aria-label="Outcome">
          <span>Outcome</span>
          {(["lost", "won"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={k === outcome} onClick={() => pickOutcome(k)}><i>Deal </i>{k}</button>
          ))}
          <button type="button" title="Replay the outcome" onClick={() => pickOutcome("replay")}>↻<i> Replay</i></button>
        </div>
      </div>
    </div>
  );
}
