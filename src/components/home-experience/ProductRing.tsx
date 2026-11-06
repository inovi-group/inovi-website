"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { href, type Lang } from "@/i18n";
import { homeCopy } from "./content";
import { homeTune as T } from "./homeTuning";
import type { RingApi } from "./RingCanvas";

// WebGL only in the browser
const RingCanvas = dynamic(() => import("./RingCanvas"), { ssr: false });

// in the ring's order (iSale first): see PRODUCTS in ringScene.ts
const KEYS = [["isale", "#d9a34a"], ["agro", "#46b876"], ["firma", "#c8b48c"]] as const;

/**
 * iSale, AGRO and FIRMA as 3D objects on a turntable (one WebGL scene, see ringScene.ts). Every few seconds the
 * ring turns to bring the next one to the front (paused while the pointer or focus is on
 * it, off with reduced motion). Click an object, its label or a tab to bring it forward; click the front one to
 * open its page.
 */
export function ProductRing({ lang = "en" }: { lang?: Lang }) {
  const c = homeCopy(lang);
  const SLIDES = KEYS.map(([key, accent]) => ({ key, accent, href: href(lang, key), name: c.ring[key][0], tagline: c.ring[key][1] }));
  const N = SLIDES.length;
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState<MediaQueryList | null>(null);
  const target = useRef(0);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const api = useRef<RingApi | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const still = !!reduce?.matches;

  useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)")); }, []);

  // bring item i to the front the short way round (forward: always onward, for autoplay)
  const go = useCallback((i: number, forward = false) => {
    let d = (((i - target.current) % N) + N) % N;
    if (!forward && d > N / 2) d -= N;
    target.current += d;
    setActive(((i % N) + N) % N);
  }, [N]);

  useEffect(() => {
    if (paused || still || T.interval <= 0) return;
    const id = window.setTimeout(() => { if (!document.hidden) go(active + 1, true); }, T.interval * 1000);
    return () => window.clearTimeout(id);
  }, [active, paused, still, go]);

  const choose = (i: number) => (i === active ? router.push(SLIDES[i].href) : go(i));
  const hit = (e: React.MouseEvent) => {
    const r = stage.current!.getBoundingClientRect();
    return api.current?.pick({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }) ?? -1;
  };

  return (
    <div className="prod-ring" role="region" aria-roledescription={c.carousel} aria-label={c.ringLabel}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1, true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
      }}>
      <div className="prod-ring-stage" ref={stage}
        onClick={(e) => { const i = hit(e); if (i >= 0) choose(i); }}
        onMouseMove={(e) => { stage.current!.style.cursor = hit(e) >= 0 ? "pointer" : "default"; }}>
        {reduce && <RingCanvas target={target} labels={labels} api={api} reduceMotion={reduce} lang={lang} />}
        {SLIDES.map((sl, i) => (
          <div key={sl.key} ref={(el) => { labels.current[i] = el; }} className={`prod-ring-label${i === active ? " is-front" : ""}`}
            style={{ ["--accent" as string]: sl.accent }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); choose(i); }}
              aria-label={i === active ? c.open(sl.name) : c.bring(sl.name)}>
              <b><i />{sl.name}</b><span>{sl.tagline}</span>
            </button>
            {i === active && (
              <Link href={sl.href} onClick={(e) => e.stopPropagation()}>{c.explore(sl.name)} <ArrowRight size={13} aria-hidden="true" /></Link>
            )}
          </div>
        ))}
      </div>
      <div className="carousel-tabs" role="tablist" aria-label={c.choose}>
        {SLIDES.map((sl, i) => (
          <button key={sl.key} type="button" role="tab" aria-selected={i === active} style={{ ["--accent" as string]: sl.accent }} onClick={() => go(i)}>
            <b>{sl.name}</b><span>{sl.tagline}</span>
            <i className="carousel-timer" key={`${active}-${paused}`}
              style={{ animationDuration: `${T.interval}s`, animationPlayState: i === active && !paused && !still && T.interval > 0 ? "running" : "paused", opacity: i === active ? 1 : 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
