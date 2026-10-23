"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { homeTune as T } from "./homeTuning";

// Each product's own scene, held at its hero; WebGL only in the browser.
const FidesCard = dynamic(() => import("./FidesCard"), { ssr: false });
const AgroCard = dynamic(() => import("./AgroCard"), { ssr: false });
const IsaleCard = dynamic(() => import("./IsaleCard"), { ssr: false });

export const SLIDES = [
  { key: "fides", name: "FIDES", tagline: "Trusted deal records", href: "/fides/", accent: "#d9a34a", Scene: FidesCard,
    line: "A tamper-proof register of every deal score and decision, and the month-end report done for you." },
  { key: "agro", name: "AGRO", tagline: "Smart irrigation", href: "/agro/", accent: "#46b876", Scene: AgroCard,
    line: "Sensors under the soil decide when and how much to irrigate. 35–50% less water." },
  { key: "isale", name: "iSale", tagline: "Revenue intelligence", href: "/isale/", accent: "#4593ff", Scene: IsaleCard,
    line: "Spot the hidden risk in every deal before signature." },
] as const;
const N = SLIDES.length;

/**
 * The three products on a turntable: one in front and in focus, the other two further back, turned in, blurred
 * and dimmed. Every few seconds it turns to bring the next one forward (paused while the pointer or focus is on
 * it, and off with reduced motion). Pick one with the tabs or by clicking it; click the front one to open its page.
 * The positions are set every frame from one turning value, so a turn sweeps the cards round the circle.
 */
export function ProductCarousel() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef({ cur: 0, target: 0 });

  // go to slide i the short way round (the turning value is unbounded, so 2 → 0 keeps going forward)
  const go = useCallback((i: number, forward = false) => {
    const p = pos.current;
    let d = (((i - p.target) % N) + N) % N;
    if (!forward && d > N / 2) d -= N;
    p.target += d;
    setActive(((i % N) + N) % N);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set(); mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // autoplay
  useEffect(() => {
    if (paused || still || T.interval <= 0) return;
    const id = window.setTimeout(() => { if (!document.hidden) go(active + 1, true); }, T.interval * 1000);
    return () => window.clearTimeout(id);
  }, [active, paused, still, go]);

  // place the cards every frame
  useEffect(() => {
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const p = pos.current;
      p.cur = still ? p.target : p.cur + (p.target - p.cur) * (1 - Math.exp((-dt * 4.6) / Math.max(0.05, T.transition)));
      if (Math.abs(p.target - p.cur) < 1e-4) p.cur = p.target;
      const W = stage.current?.clientWidth ?? 1000;
      // phones: the front product takes most of the width, the two at the back just peek out
      const narrow = W < 600, frontW = narrow ? Math.max(T.frontWidth, 0.86) : T.frontWidth, spread = narrow ? Math.min(T.spread, 0.4) : T.spread;
      cards.current.forEach((el, i) => {
        if (!el) return;
        let rel = (((i - p.cur) % N) + N) % N;           // 0 = front, 1 = right, 2 = left
        if (rel > N / 2) rel -= N;
        const th = (rel * 2 * Math.PI) / N;
        const g = Math.max(0, (Math.cos(th) + 0.5) / 1.5); // 1 in front, 0 at the back
        const x = Math.sin(th) * spread * W / Math.sin((2 * Math.PI) / N);
        const z = -(1 - g) * T.depth;
        const sc = T.backScale + (1 - T.backScale) * g;
        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${(-Math.sign(rel) * (1 - g) * T.turn).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        el.style.filter = g > 0.995 ? "none" : `blur(${((1 - g) * T.blur).toFixed(2)}px) brightness(${(T.dim + (1 - T.dim) * g).toFixed(3)})`;
        el.style.opacity = (T.backOpacity + (1 - T.backOpacity) * g).toFixed(3);
        el.style.zIndex = String(Math.round(g * 10));
        el.style.width = `${(frontW * 100).toFixed(1)}%`;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [still]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
  };

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label="Inovi products"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onKeyDown={onKey}>
      <div className="carousel-stage" ref={stage}>
        {SLIDES.map((sl, i) => {
          const front = i === active;
          return (
            <div key={sl.key} ref={(el) => { cards.current[i] = el; }} className={`carousel-card${front ? " is-front" : ""}`}
              style={{ ["--accent" as string]: sl.accent }} role="group" aria-roledescription="slide" aria-label={`${sl.name}: ${sl.tagline}`}
              aria-hidden={!front} onClick={() => (front ? router.push(sl.href) : go(i))}>
              <div className="carousel-canvas"><sl.Scene card={{ active: front, backFps: T.backFps }} /></div>
              <div className="carousel-caption">
                <span className="carousel-tag"><i />{sl.name} · {sl.tagline}</span>
                <p>{sl.line}</p>
                <Link href={sl.href} tabIndex={front ? 0 : -1} onClick={(e) => e.stopPropagation()}>
                  Explore {sl.name} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="carousel-tabs" role="tablist" aria-label="Choose a product">
        {SLIDES.map((sl, i) => (
          <button key={sl.key} type="button" role="tab" aria-selected={i === active} style={{ ["--accent" as string]: sl.accent }}
            onClick={() => go(i)}>
            <b>{sl.name}</b><span>{sl.tagline}</span>
            {/* the autoplay timer for the product in front */}
            <i className="carousel-timer" key={`${active}-${paused}`}
              style={{ animationDuration: `${T.interval}s`, animationPlayState: i === active && !paused && !still && T.interval > 0 ? "running" : "paused", opacity: i === active ? 1 : 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
