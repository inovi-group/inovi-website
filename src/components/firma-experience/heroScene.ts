import { Group, Vector3, type Texture } from "three";
import { makeEnvelope } from "./envelope";

/**
 * The hero background: on the right, a calm stream of sealed contract envelopes flowing diagonally from the
 * top right down toward the middle bottom, at different depths and sizes, turning gently. Drawn as real 3D
 * objects with crisp edges; no blur. One envelope is the featured deal: it rides in the stream like the
 * others, and when the visitor starts scrolling (story step 0 → 0.45) it is picked out and carried to the
 * deal's place, where the deal's own envelope takes over (and is then scanned). The rest of the stream falls
 * back and fades. Reduced motion: a still stream that fades as the deal appears.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Bounds = { cx: number; cy: number; hw: number; hh: number };
type Item = { env: ReturnType<typeof makeEnvelope>; u0: number; lat: number; z: number; size: number; ph: number };

export const PICK_END = 0.45; // by here the featured envelope has arrived and the deal's own envelope takes over

export function createHero(opts: { parent: Group; deal: Group; face: Texture; makeSeal: () => Emblem }) {
  const { parent, deal, face, makeSeal } = opts;
  const stream = new Group();
  parent.add(stream);
  let seed = 4111;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const MAX = 16;
  // item 0 is the featured deal; it holds its place in the stream so it is on screen when the scroll begins
  const items: Item[] = Array.from({ length: MAX }, (_, k) => {
    const env = makeEnvelope(face, makeSeal());
    stream.add(env.g);
    return k === 0
      ? { env, u0: 0.42, lat: 0.1, z: 0.6, size: 0.62, ph: 1.3 }
      : { env, u0: k / MAX + rnd() * 0.04, lat: rnd() * 2 - 1, z: lerp(-6, 1.4, rnd()), size: lerp(0.32, 0.62, rnd()), ph: rnd() * 6.28 };
  });

  const P0 = new Vector3(), P1 = new Vector3(), dir = new Vector3(), perp = new Vector3(), pos = new Vector3();

  function update({ s, t, still, wide, bounds: B, bc, bs }: { s: number; t: number; still: boolean; wide: boolean; bounds: Bounds; bc: Vector3; bs: number }) {
    // the diagonal: from beyond the top right down to the middle bottom of the scene's side of the screen
    if (wide) { P0.set(B.cx + B.hw * 1.1, B.cy + B.hh * 1.55, 0); P1.set(B.cx - B.hw * 0.5, B.cy - B.hh * 1.55, 0); }
    else { P0.set(B.cx + B.hw * 1.5, B.cy + B.hh * 1.0, 0); P1.set(B.cx - B.hw * 0.6, B.cy - B.hh * 0.35, 0); }
    dir.subVectors(P1, P0);
    perp.set(-dir.y, dir.x, 0).normalize();
    const width = (wide ? 0.55 : 0.5) * B.hw;
    const tilt = Math.atan2(dir.y, dir.x) + Math.PI / 2; // envelopes lean along the flow

    const pick = still ? 0 : ease(clamp01(s / PICK_END));
    const fade = still ? 1 - clamp01(s / 0.4) : 1 - ease(clamp01(s / 0.6));
    const count = wide ? MAX : 9;

    // the deal is not shown until the featured envelope has been carried to it
    if (s < 1) deal.visible = still ? s > 0.3 : s >= PICK_END;

    items.forEach((it, k) => {
      const featured = k === 0;
      if (k >= count) { it.env.setOpacity(0); return; }
      const u = featured || still ? it.u0 : (it.u0 + t * 0.012) % 1;
      pos.copy(P0).addScaledVector(dir, u).addScaledVector(perp, it.lat * width);
      // farther envelopes spread wider, so every depth fills the same diagonal band on screen
      pos.z = it.z;
      const sway = still ? 0 : 1;
      const g = it.env.g;
      g.position.copy(pos);
      g.position.y += Math.sin(t * 0.4 + it.ph) * 0.06 * sway;
      g.rotation.set(0.18 + Math.sin(t * 0.21 + it.ph) * 0.12 * sway, Math.sin(t * 0.17 + it.ph * 1.7) * 0.4 * sway, tilt * 0.35 + Math.sin(t * 0.13 + it.ph) * 0.08 * sway);
      g.scale.setScalar(it.size * bs);
      // fade in at the top and out at the bottom of the flow
      const ends = clamp01(u / 0.08) * clamp01((1 - u) / 0.1);
      if (featured) {
        // picked out: carried to the deal's place, turning to face the viewer
        if (!still && s > 0) {
          g.position.lerp(bc, pick);
          g.rotation.x *= 1 - pick; g.rotation.y *= 1 - pick; g.rotation.z *= 1 - pick;
          g.scale.setScalar(lerp(it.size, 1, pick) * bs);
        }
        it.env.setOpacity(still ? fade : s >= PICK_END ? 0 : 1);
      } else {
        g.position.z -= 3 * (1 - fade);
        it.env.setOpacity(ends * fade);
      }
    });
    stream.visible = s < 1;
  }

  return { update };
}
