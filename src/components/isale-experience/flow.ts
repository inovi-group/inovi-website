/**
 * Scroll variants A and B. Natural scroll: large step panels scroll past the fixed scene, which is scrubbed by
 * position. Each panel brightens as it nears its home position (centre on desktop, bottom on phones).
 *
 * magnetic (B): the same scroll, but it eases near each step. Wheel input meets gentle resistance around a
 * step, scrolling straight through one catches on it for a moment, and when you stop close to a step it glides
 * the last bit into place. Keys move step to step; touch scrolls natively and settles softly when it stops.
 * Never a hard jump: every movement is eased. Reduced motion falls back to plain native scroll.
 */
import { clamp, listeners, pageTop } from "./listen";

const smooth = (x: number) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

export function mountFlow({ steps, magnetic, reduceMotion }: { steps: HTMLElement[]; magnetic: boolean; reduceMotion: MediaQueryList }) {
  const { on, off } = listeners();
  let vh = window.innerHeight, points: number[] = [];
  // the scroll position at which step i sits in its home position (section centred in the viewport)
  const measure = () => {
    vh = window.innerHeight;
    points = steps.map((el) => Math.round(pageTop(el) + el.offsetHeight / 2 - vh / 2));
  };

  function paint() {
    const mid = window.scrollY + vh / 2;
    const phone = window.innerWidth <= 760;
    for (const el of steps) {
      const d = (pageTop(el) + el.offsetHeight / 2 - mid) / vh;
      // desktop: dim away from home. phone: the card arrives solid from below and fades out
      // completely as it rises over the scene, so two half-faded layers never stack
      const vis = phone ? (d >= 0 ? 1 : 1 - smooth(-d / 0.32)) : 1 - 0.7 * smooth((Math.abs(d) - 0.12) / 0.45);
      el.style.setProperty("--vis", vis.toFixed(3));
    }
  }
  let alive = true;
  measure();
  paint();
  on(window, "scroll", paint, { passive: true });
  on(window, "resize", () => { measure(); paint(); });
  document.fonts?.ready.then(() => { if (alive) { measure(); paint(); } });
  let idleTimer = 0, raf = 0;
  const destroy = () => { alive = false; off(); clearTimeout(idleTimer); cancelAnimationFrame(raf); };
  if (!magnetic) return { destroy };

  const ZONE = 0.34;            // share of a viewport around each step where the magnet acts
  const HOLD_MS = 550;          // how long scrolling through a step catches on it
  const SETTLE_IDLE = 170;      // ms without input before gliding into a nearby step
  let cur = window.scrollY, target = cur, animating = false, last = 0;
  let holdUntil = 0, lastCaught = -1, freeUntil = 0, touching = false, dir = 1, prevY = cur;

  const nearest = (y: number) => {
    let best: number | null = null;
    for (const p of points) if (best === null || Math.abs(p - y) < Math.abs(best - y)) best = p;
    return best;
  };
  const maxY = () => document.documentElement.scrollHeight - vh;
  const isOff = () => reduceMotion.matches || performance.now() < freeUntil;

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0.004, 0.1); // rAF time can precede performance.now()
    last = now;
    cur += (target - cur) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - cur) < 0.6) cur = target;
    window.scrollTo({ top: cur, behavior: "instant" });
    if (cur !== target) raf = requestAnimationFrame(frame);
    else animating = false;
  }
  function glide(to: number) {
    target = clamp(to, 0, maxY());
    if (!animating) { animating = true; cur = window.scrollY; last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function settleSoon() {
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (isOff() || touching) return;
      const y = animating ? target : window.scrollY;
      const p = nearest(y);
      if (p === null) return;
      const d = p - y;
      // glide on into a step ahead of you; never drag you back to one you are leaving (beyond a few px)
      if (Math.abs(d) > 1 && Math.abs(d) < vh * ZONE && (Math.sign(d) === dir || Math.abs(d) < 6)) glide(p);
    }, SETTLE_IDLE);
  }

  function onWheel(e: WheelEvent) {
    if (isOff() || e.ctrlKey) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? vh : 1);
    if (!dy) return;
    e.preventDefault();
    const now = performance.now();
    dir = Math.sign(dy);
    if (!animating) target = cur = window.scrollY;
    settleSoon();
    if (now < holdUntil) return; // resting on a step for a moment
    const p = nearest(target);
    // resistance: scrolling slows to ~45% right at a step and is back to full speed a third of a screen away
    const f = p === null ? 1 : 0.45 + 0.55 * smooth(Math.abs(target - p) / (vh * ZONE));
    let next = target + dy * f;
    // catch: passing straight over a step stops on it briefly
    for (const q of points) {
      const crossed = (target < q - 1 && next >= q) || (target > q + 1 && next <= q);
      if (crossed && q !== lastCaught) { next = q; holdUntil = now + HOLD_MS; lastCaught = q; break; }
    }
    if (Math.abs(next - (p ?? next)) > vh * ZONE) lastCaught = -1; // left the step: it can catch again later
    glide(next);
  }

  const interactive = (el: EventTarget | null) => (el as HTMLElement | null)?.closest?.("a, button, input, textarea, select, [contenteditable]");
  function onKey(e: KeyboardEvent) {
    if (isOff() || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    let d = 0;
    if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) d = 1;
    else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) d = -1;
    if (!d || (k === " " && interactive(e.target))) return;
    const y = animating ? target : window.scrollY;
    // glide to the next step if it is within about a screen; otherwise leave the key to the browser
    const cand = d > 0 ? points.find((p) => p > y + 2) : [...points].reverse().find((p) => p < y - 2);
    if (cand === undefined || Math.abs(cand - y) > vh * 1.25) return;
    e.preventDefault();
    glide(cand);
  }

  // touch, scrollbar, Home/End: native scroll, then a soft settle when it comes to rest near a step
  on(window, "scroll", () => {
    const y = window.scrollY;
    if (animating && Math.abs(y - Math.round(cur)) > 3) { animating = false; target = cur = y; }
    if (!animating) { if (y !== prevY) dir = Math.sign(y - prevY); settleSoon(); }
    prevY = y;
  }, { passive: true });
  on(window, "touchstart", () => { touching = true; animating = false; clearTimeout(idleTimer); }, { passive: true });
  on(window, "touchend", () => { touching = false; settleSoon(); }, { passive: true });
  on(window, "wheel", onWheel, { passive: false });
  on(window, "keydown", onKey);
  // in-page links travel straight past the magnets
  on<MouseEvent>(document, "click", (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('a[href^="#"]')) { freeUntil = performance.now() + 1500; animating = false; }
  }, true);
  return { destroy };
}
