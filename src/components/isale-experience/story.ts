/**
 * Scroll variant C, one story beat per "notch": a sticky stage holds a large text block while the 3D scene
 * plays that step. Wheel, trackpad, keys and touch build up a little resistance; past the threshold the next
 * beat takes over. The page above and below the story scrolls normally, and the first/last beat hand back
 * to native scroll.
 *
 * The scroll position still mirrors the beat (one viewport per beat), so the scrollbar, reload and anchor
 * links keep working. getStep() for the scene: 0 in the hero, beat + 1 inside, last after.
 */
import { clamp, listeners } from "./listen";

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export function mountStory({ storyEl, reduceMotion }: { storyEl: HTMLElement; reduceMotion: MediaQueryList }) {
  const stage = storyEl.querySelector<HTMLElement>(".story-stage")!;
  const beats = [...storyEl.querySelectorAll<HTMLElement>(".beat")];
  const ticks = [...storyEl.querySelectorAll<HTMLElement>(".story-rail i")];
  const count = storyEl.querySelector<HTMLElement>(".story-count b");
  const hint = storyEl.querySelector<HTMLElement>(".story-count span");
  const N = beats.length;
  const WHEEL_T = 140, TOUCH_T = 64, HOLD_MS = 700, LOCK_MS = 1400, QUIET_MS = 160;
  const { on, off } = listeners();

  let vh = 0, top = 0, end = 0;
  let idx = 0, pull = 0, lockedAt = -1e9, lastWheel = 0, freeUntil = 0, prevY = window.scrollY;
  let expectY: number | null = null;
  let springTimer = 0;
  // scene step tween
  let from = 0, to = 0, t0 = 0, dur = 1;

  const pinned = (y = window.scrollY) => y >= top - 1 && y <= end + 1;
  const locked = () => performance.now() - lockedAt < LOCK_MS;
  const free = () => performance.now() < freeUntil;

  function measure() {
    vh = window.innerHeight;
    stage.style.height = `${vh}px`;
    storyEl.style.height = `${N * vh}px`;
    top = storyEl.getBoundingClientRect().top + window.scrollY;
    end = top + (N - 1) * vh;
  }

  function jump(y: number) {
    expectY = Math.round(y);
    window.scrollTo({ top: y, behavior: "instant" });
  }

  function sceneValue(now = performance.now()) {
    if (!dur) return to;
    return from + (to - from) * easeInOut(clamp((now - t0) / dur, 0, 1));
  }
  function aim(target: number) {
    const now = performance.now();
    const cur = sceneValue(now);
    if (target === to) return;
    from = cur; to = target; t0 = now;
    dur = reduceMotion.matches ? 0 : 900 + 300 * Math.min(2, Math.abs(to - from));
  }

  function setPull(p: number, live: boolean) {
    pull = p;
    const still = reduceMotion.matches;
    // diminishing push-back: the text gives a little, then resists
    const give = still ? 0 : -Math.sign(p) * 34 * (1 - Math.exp(-Math.abs(p) / 160));
    stage.style.setProperty("--pull", `${give.toFixed(1)}px`);
    stage.classList.toggle("pulling", live && !still);
    clearTimeout(springTimer);
    if (live) springTimer = window.setTimeout(() => setPull(0, false), 220);
  }

  function show(i: number, dir: number) {
    stage.dataset.dir = dir > 0 ? "fwd" : "back";
    beats.forEach((b, k) => {
      b.classList.toggle("on", k === i);
      b.classList.toggle("was", k !== i && b.classList.contains("on"));
      b.setAttribute("aria-hidden", String(k !== i));
    });
    ticks.forEach((t, k) => t.classList.toggle("on", k <= i));
    if (count) count.textContent = String(i + 1);
    if (hint) hint.textContent = i === N - 1 ? "Scroll on to finish" : "Scroll for the next step";
  }

  function go(next: number) {
    next = clamp(next, 0, N - 1);
    const dir = Math.sign(next - idx);
    idx = next;
    lockedAt = performance.now();
    setPull(0, false);
    show(idx, dir || 1);
    jump(top + idx * vh);
    aim(idx + 1);
  }

  // Native scroll (scrollbar drag, momentum, Home/End): keep beat and scene in sync, and catch
  // the story on the way in so a fling from the hero lands on the first beat, not the fourth.
  function onScroll() {
    const y = window.scrollY;
    if (expectY !== null && Math.abs(y - expectY) < 2) { expectY = null; prevY = y; return; }
    expectY = null;
    const was = prevY;
    prevY = y;
    stage.classList.toggle("off", !pinned(y));
    if (pinned(y)) {
      if (!free() && !pinned(was)) {
        lockedAt = performance.now();
        const entry = was < top ? 0 : N - 1;
        if (entry !== idx) show(entry, entry > idx ? 1 : -1);
        idx = entry;
        jump(top + idx * vh);
      } else if (!free() && locked()) {
        jump(top + idx * vh); // a fling or smooth scroll still running after a swap: hold the beat
      } else {
        const k = clamp(Math.round((y - top) / vh), 0, N - 1);
        if (k !== idx) { show(k, k - idx); idx = k; }
      }
      aim(idx + 1);
    } else if (y < top) {
      aim(y < top - vh * 0.5 ? 0 : 1);
      if (idx !== 0) { show(0, -1); idx = 0; }
    } else {
      aim(N);
      if (idx !== N - 1) { show(N - 1, 1); idx = N - 1; }
    }
  }

  function onEnter(i: number) {
    if (i !== idx) show(i, i > idx ? 1 : -1);
    idx = i;
    lockedAt = performance.now();
    jump(top + idx * vh);
    aim(idx + 1);
  }

  let lastAbs = 0;
  function onWheel(e: WheelEvent) {
    if (free() || e.ctrlKey) return;
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? vh : 1;
    const dy = e.deltaY * unit;
    if (!dy) return;
    const y = window.scrollY;
    const now = performance.now();
    const abs = Math.abs(dy);
    // a fresh intent: a pause, a push that accelerates (not decaying momentum), or a repeated wheel notch
    const fresh = now - lastWheel > QUIET_MS || abs > lastAbs * 1.3 + 2 || (abs >= 50 && Math.abs(abs - lastAbs) < 1);
    lastWheel = now;
    lastAbs = abs;

    if (!pinned(y)) {
      // about to cross into the story: stop exactly on its first (or last) beat
      if (y < top && y + dy > top) { e.preventDefault(); onEnter(0); }
      else if (y > end && y + dy < end) { e.preventDefault(); onEnter(N - 1); }
      return;
    }
    // each beat holds for a moment; after that only a fresh intent moves on
    const holding = now - lockedAt < HOLD_MS || (locked() && !fresh);
    // edges hand back to the page, but not mid-flourish from the last swap
    if (!holding && ((dy > 0 && idx === N - 1) || (dy < 0 && idx === 0))) return;
    e.preventDefault();
    if (holding) return; // swallow trackpad momentum and fast spins
    lockedAt = -1e9;
    const p = (Math.sign(dy) === Math.sign(pull) ? pull : 0) + (abs >= 50 ? Math.sign(dy) * WHEEL_T : dy);
    if (Math.abs(p) >= WHEEL_T) go(idx + Math.sign(p));
    else setPull(p, true);
  }

  const interactive = (el: EventTarget | null) => (el as HTMLElement | null)?.closest?.("a, button, input, textarea, select, [contenteditable]");
  function onKey(e: KeyboardEvent) {
    if (free() || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    let dir = 0;
    if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) dir = 1;
    else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) dir = -1;
    if (!dir || (k === " " && interactive(e.target))) return;
    const y = window.scrollY;
    if (!pinned(y)) {
      // a key press that would cross into the story stops on its first (or last) beat
      const dy = dir * (k.startsWith("Arrow") ? 40 : vh * 0.875);
      if (y < top && y + dy > top) { e.preventDefault(); onEnter(0); }
      else if (y > end && y + dy < end) { e.preventDefault(); onEnter(N - 1); }
      return;
    }
    if ((dir > 0 && idx === N - 1) || (dir < 0 && idx === 0)) return;
    e.preventDefault();
    if (e.repeat && locked()) return;
    go(idx + dir);
  }

  let ty: number | null = null, tActive = false;
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1 || free()) { tActive = false; return; }
    ty = e.touches[0].clientY;
    tActive = pinned();
    pull = 0;
  }
  function onTouchMove(e: TouchEvent) {
    if (!tActive || ty === null) return;
    const d = ty - e.touches[0].clientY;
    if (Math.abs(d) < 6 && !pull) return;
    if (!pull && ((d > 0 && idx === N - 1) || (d < 0 && idx === 0))) { tActive = false; return; } // native exit
    if (e.cancelable) e.preventDefault();
    if (locked()) return;
    setPull(d, true);
    clearTimeout(springTimer); // hold while the finger is down
  }
  function onTouchEnd() {
    if (!tActive) return;
    tActive = false;
    if (Math.abs(pull) >= TOUCH_T && !locked()) go(idx + Math.sign(pull));
    else setPull(0, false);
  }

  // In-page links travel straight through the story.
  on<MouseEvent>(document, "click", (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('a[href^="#"]')) freeUntil = performance.now() + 1500;
  }, true);

  measure();
  show(0, 1);
  on(window, "resize", () => {
    const wasPinned = pinned();
    measure();
    if (wasPinned) jump(top + idx * vh);
  });
  let alive = true;
  document.fonts?.ready.then(() => { if (alive) { measure(); onScroll(); } });
  on(window, "scroll", onScroll, { passive: true });
  on(window, "wheel", onWheel, { passive: false });
  on(window, "keydown", onKey);
  on(window, "touchstart", onTouchStart, { passive: true });
  on(window, "touchmove", onTouchMove, { passive: false });
  on(window, "touchend", onTouchEnd);
  on(window, "touchcancel", onTouchEnd);
  // land on a beat if the page loads (or restores) mid-story
  if (pinned()) { idx = clamp(Math.round((window.scrollY - top) / vh), 0, N - 1); show(idx, 1); jump(top + idx * vh); }
  onScroll();
  from = to; dur = 0; // no tween on first paint

  const preview = () => (reduceMotion.matches || !pinned() ? 0 : clamp(pull / WHEEL_T, -1, 1) * 0.12);
  return {
    getStep: () => clamp(sceneValue() + preview(), 0, N),
    go: (i: number) => go(i),
    destroy() { alive = false; clearTimeout(springTimer); off(); storyEl.style.height = ""; },
  };
}
