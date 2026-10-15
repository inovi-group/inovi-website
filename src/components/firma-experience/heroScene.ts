import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";

/**
 * The hero background: constellations. Small glowing gold stars spread across the whole view, a few groups of
 * them joined by thin, faint lines, the rest scattered. Slow drift and a gentle twinkle; nothing else.
 * One star is the featured deal and looks exactly like the others. As the visitor scrolls (story step 0 → 1)
 * it brightens, the deal grows out of it, and the rest of the sky recedes.
 * Reduced motion: a still sky that fades as the deal arrives.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const STAR = new Color("#e8b864"), PALE = new Color("#fff1d2");
// constellation centres in the visible area's normalised space ([-1, 1] each way); the first is the featured one
const CENTRES = {
  wide: [[0, 0], [-0.72, 0.58], [-0.5, -0.62], [0.52, 0.66], [0.8, -0.32], [0.08, 0.86], [-0.88, -0.05], [0.34, -0.78]],
  narrow: [[0, 0], [-0.55, 0.72], [0.55, 0.42], [-0.5, -0.5], [0.5, -0.78], [0.15, 0.92]],
} as const;
const LONE = { wide: 26, narrow: 14 };

function glowTexture(hard: boolean) {
  const cv = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
  const c = cv.getContext("2d")!, g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (hard) { g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); }
  else { g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(0.25, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(255,255,255,0)"); }
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace;
  return t;
}

type Star = { base: Vector3; pos: Vector3; mag: number; tw: number; featured: boolean };
export type HeroView = { cx: number; cy: number; hw: number; hh: number };

export function createHero(opts: { parent: Group; deal: Group }) {
  const { parent, deal } = opts;
  const sky = new Group();
  parent.add(sky);
  const add = { transparent: true, depthWrite: false, blending: AdditiveBlending, vertexColors: true, sizeAttenuation: true } as const;
  const haloMat = new PointsMaterial({ size: 0.9, map: glowTexture(false), ...add });
  const coreMat = new PointsMaterial({ size: 0.22, map: glowTexture(true), ...add });
  const halos = new Points(new BufferGeometry(), haloMat);
  const cores = new Points(new BufferGeometry(), coreMat);
  const lineMat = new LineBasicMaterial({ color: STAR, transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending });
  const lines = new LineSegments(new BufferGeometry(), lineMat);
  sky.add(lines, halos, cores);

  let stars: Star[] = [];
  let links: [number, number][] = [];
  let key = "";
  const F = new Vector3(), col = new Color();

  // a seeded sky, so it is the same sky on every visit
  function build(wide: boolean, v: HeroView, featured: Vector3) {
    let seed = 20261;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    stars = []; links = [];
    F.copy(featured);
    const toWorld = (nx: number, ny: number, z: number) => new Vector3(v.cx + nx * v.hw, v.cy + ny * v.hh, z);
    const fx = (featured.x - v.cx) / v.hw, fy = (featured.y - v.cy) / v.hh;
    (wide ? CENTRES.wide : CENTRES.narrow).forEach(([cx0, cy0], k) => {
      // the featured constellation is drawn through the featured star
      const cx = k === 0 ? fx : cx0, cy = k === 0 ? fy : cy0;
      const n = 4 + Math.floor(rnd() * 3), step = wide ? 0.13 : 0.2;
      let x = cx, y = cy, ang = rnd() * Math.PI * 2;
      const first = stars.length;
      for (let i = 0; i < n; i++) {
        const featuredStar = k === 0 && i === 0;
        const z = featuredStar ? 0 : -0.5 - rnd() * 2;
        stars.push({ base: featuredStar ? featured.clone() : toWorld(x, y, z), pos: new Vector3(), mag: 0.75 + rnd() * 0.35, tw: rnd() * 6.28, featured: featuredStar });
        if (i > 0) links.push([first + i - 1, first + i]);
        if (i === 3 && n > 4 && rnd() > 0.4) links.push([first + 1, first + i]); // an occasional branch
        ang += (rnd() - 0.5) * 1.6;
        x += Math.cos(ang) * step * (0.8 + rnd() * 0.6) * (wide ? 0.62 : 1);
        y += Math.sin(ang) * step * (0.8 + rnd() * 0.6);
      }
    });
    for (let i = 0; i < LONE[wide ? "wide" : "narrow"]; i++) {
      stars.push({ base: toWorld(rnd() * 2.1 - 1.05, rnd() * 2.1 - 1.05, -1 - rnd() * 3), pos: new Vector3(), mag: 0.35 + rnd() * 0.35, tw: rnd() * 6.28, featured: false });
    }
    const n = stars.length;
    for (const p of [halos, cores]) {
      p.geometry.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
      p.geometry.setAttribute("color", new BufferAttribute(new Float32Array(n * 3), 3));
    }
    lines.geometry.setAttribute("position", new BufferAttribute(new Float32Array(links.length * 6), 3));
  }

  function update({ s, t, still, wide, featured, view }: { s: number; t: number; still: boolean; wide: boolean; featured: Vector3; view: HeroView }) {
    const k0 = `${wide}-${view.hw.toFixed(1)}-${view.hh.toFixed(1)}-${featured.x.toFixed(2)}-${featured.y.toFixed(2)}`;
    if (k0 !== key) { key = k0; build(wide, view, featured); }

    // the deal grows out of the featured star as the visitor scrolls; until then it is not shown at all
    if (s < 1) {
      const grow = ease(clamp01((s - 0.1) / 0.75));
      const sc = still ? 1 : lerp(0.02, 1, grow);
      deal.scale.setScalar(sc);
      deal.position.copy(F).multiplyScalar(1 - sc);
      deal.visible = still ? s > 0.3 : s > 0.1;
    }
    const fade = still ? 1 - clamp01(s / 0.5) : 1 - ease(clamp01(s / 0.75)); // the rest of the sky
    // the featured star brightens as it comes forward, then hands over to the deal's own core
    const lift = still ? 0 : Math.sin(Math.PI * clamp01(s / 0.45));
    const hand = still ? fade : 1 - ease(clamp01((s - 0.2) / 0.3));
    sky.visible = Math.max(fade, hand) > 0.005;
    if (!sky.visible) return;

    const hp = halos.geometry.attributes.position.array as Float32Array, hc = halos.geometry.attributes.color.array as Float32Array;
    const cp = cores.geometry.attributes.position.array as Float32Array, cc = cores.geometry.attributes.color.array as Float32Array;
    stars.forEach((st, i) => {
      st.pos.copy(st.base);
      if (!st.featured) {
        if (!still) { st.pos.x += Math.sin(t * 0.05 + st.tw) * 0.06; st.pos.y += Math.cos(t * 0.04 + st.tw * 1.3) * 0.05; }
        st.pos.z -= 2.5 * (1 - fade);
      }
      const twinkle = still ? 1 : 0.78 + 0.22 * Math.sin(t * (0.6 + (i % 5) * 0.13) + st.tw);
      const a = st.featured ? hand * (1 + 0.8 * lift) : fade;
      const b = st.mag * twinkle * a * (wide ? 1.15 : 1.4);
      col.copy(STAR).lerp(PALE, st.featured ? 0.3 * lift : 0.15).multiplyScalar(b);
      hp.set([st.pos.x, st.pos.y, st.pos.z], i * 3); hc.set([col.r, col.g, col.b], i * 3);
      col.copy(PALE).multiplyScalar(b);
      cp.set([st.pos.x, st.pos.y, st.pos.z], i * 3); cc.set([col.r, col.g, col.b], i * 3);
    });
    for (const p of [halos, cores]) {
      p.geometry.attributes.position.needsUpdate = true;
      p.geometry.attributes.color.needsUpdate = true;
      p.geometry.computeBoundingSphere();
    }
    const lp = lines.geometry.attributes.position.array as Float32Array;
    links.forEach(([a, b], i) => {
      const pa = stars[a].pos, pb = stars[b].pos;
      lp.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
    });
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.computeBoundingSphere();
    lineMat.opacity = (wide ? 0.2 : 0.26) * fade;
    // stars keep a steady size on screen whatever the layout's camera distance
    haloMat.size = (wide ? 0.12 : 0.15) * view.hh;
    coreMat.size = (wide ? 0.027 : 0.034) * view.hh;
  }

  return { update };
}
