import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  type PerspectiveCamera,
  type WebGLRenderer,
} from "three";

/**
 * The hero background: a dense 3D network of cores and thin connecting lines, filling the view in depth
 * (a sparse foreground passing near the camera, a midground, and a far layer that fades into fog). It turns
 * slowly about the featured core so the structure reads as 3D. Everything is drawn crisp: a sharp point
 * shader for the nodes and 1-px antialiased lines, no blur. Cool palette (?palette=a blue/teal, b violet),
 * with Inovi gold kept for a few highlighted nodes; the featured core is one of those and looks like them.
 * On scroll (story step 0 → 1) the featured core brightens, the deal grows out of it, and the mesh falls back.
 * Reduced motion: a still mesh that fades as the deal arrives.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export type Palette = "a" | "b";
const PALETTES: Record<Palette, { nodes: string[]; line: string }> = {
  a: { nodes: ["#46c3e0", "#4f8dff", "#8be3ec", "#3a9fe0"], line: "#3f8fd6" },   // blue / teal
  b: { nodes: ["#9381ff", "#c084fc", "#6f8bff", "#a99bff"], line: "#7a6ae6" },   // violet / indigo
};
const GOLD = new Color("#e8b45a");

export type HeroView = { cx: number; cy: number; hw: number; hh: number; dist: number };

type Node = { p: Vector3; size: number; hue: number; gold: boolean; tw: number };

const pointShader = {
  vertexShader: /* glsl */ `
    attribute float aSize; attribute vec3 aColor; varying vec3 vColor;
    uniform float uScale;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vColor = aColor;
      gl_PointSize = aSize * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      // a crisp core with an antialiased edge, and a small glow around it
      float w = fwidth(d);
      float core = 1.0 - smoothstep(0.26 - w, 0.26 + w, d);
      float halo = exp(-d * d * 7.0) * 0.38 * (1.0 - smoothstep(0.85, 1.0, d));
      float a = core + halo;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vColor * a, a);
    }`,
};

export function createHero(opts: { parent: Group; deal: Group; gl: WebGLRenderer }) {
  const { parent, deal, gl } = opts;
  const net = new Group(); // pivots about the featured core
  parent.add(net);
  const pointMat = new ShaderMaterial({
    ...pointShader, uniforms: { uScale: { value: 400 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const points = new Points(new BufferGeometry(), pointMat);
  const lineMat = new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const lines = new LineSegments(new BufferGeometry(), lineMat);
  net.add(lines, points);

  let nodes: Node[] = [];
  let edges: [number, number][] = [];
  let key = "";
  let palette: Palette = "a";
  let pal = PALETTES.a.nodes.map((c) => new Color(c)), lineCol = new Color(PALETTES.a.line);
  const F = new Vector3(), tmp = new Vector3(), col = new Color(), m = new Matrix4(), size = new Vector2();

  // a seeded mesh (the same on every visit), spread through the hero camera's view volume
  function build(wide: boolean, v: HeroView, featured: Vector3) {
    let seed = 7919;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    F.copy(featured);
    net.position.copy(F);
    const N = wide ? 320 : 130;
    nodes = [{ p: new Vector3(), size: 1.25, hue: 0, gold: true, tw: 0 }]; // the featured core, at the pivot
    while (nodes.length < N) {
      // depth bands: sparse foreground, a dense midground, a deep background
      const r = rnd();
      const z = r < 0.12 ? lerp(1.5, 4.8, rnd()) : r < 0.66 ? lerp(-4, 1.5, rnd()) : lerp(-15, -4, rnd());
      const spread = (v.dist - z) / v.dist; // widen with distance so every band fills the frame
      const x = v.cx + (rnd() * 2.3 - 1.15) * v.hw * spread, y = v.cy + (rnd() * 2.3 - 1.15) * v.hh * spread;
      nodes.push({ p: new Vector3(x, y, z).sub(F), size: lerp(0.75, 1.15, rnd()), hue: Math.floor(rnd() * 4), gold: rnd() < 0.06, tw: rnd() * 6.28 });
    }
    // each node joins its five nearest neighbours (in 3D), within reach: one connected structure, not a scatter
    const reach = (wide ? 0.5 : 0.55) * v.hh;
    const seen = new Set<number>();
    edges = [];
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [j, a.p.distanceToSquared(b.p)] as const).filter(([j]) => j !== i)
        .sort((x, y) => x[1] - y[1]).slice(0, 5);
      // farther away the mesh is sparser in screen terms, so allow longer links there
      const lim = reach * (1 + Math.max(0, -(a.p.z + F.z)) / 8);
      for (const [j, d2] of near) {
        if (d2 > lim * lim) continue;
        const id = i < j ? i * 10000 + j : j * 10000 + i;
        if (!seen.has(id)) { seen.add(id); edges.push([i, j]); }
      }
    });
    const pg = points.geometry;
    pg.setAttribute("position", new BufferAttribute(new Float32Array(nodes.flatMap((n) => [n.p.x, n.p.y, n.p.z])), 3));
    pg.setAttribute("aColor", new BufferAttribute(new Float32Array(nodes.length * 3), 3));
    pg.setAttribute("aSize", new BufferAttribute(new Float32Array(nodes.length), 1));
    const lg = lines.geometry;
    lg.setAttribute("position", new BufferAttribute(new Float32Array(edges.flatMap(([a, b]) => [...nodes[a].p.toArray(), ...nodes[b].p.toArray()])), 3));
    lg.setAttribute("color", new BufferAttribute(new Float32Array(edges.length * 6), 3));
    pg.computeBoundingSphere(); lg.computeBoundingSphere();
  }

  function setPalette(p: Palette) {
    palette = PALETTES[p] ? p : "a";
    pal = PALETTES[palette].nodes.map((c) => new Color(c));
    lineCol = new Color(PALETTES[palette].line);
  }

  const fog = (camDist: number, D: number) =>
    // near and mid layers at full strength; only the far layer fades into the dark
    0.1 + 0.9 * (1 - smooth(D + 2.5, D + 15, camDist));

  function update({ s, t, still, wide, featured, view, camera }: { s: number; t: number; still: boolean; wide: boolean; featured: Vector3; view: HeroView; camera: PerspectiveCamera }) {
    const k0 = `${wide}-${view.hw.toFixed(1)}-${view.hh.toFixed(1)}-${featured.x.toFixed(2)}-${featured.y.toFixed(2)}`;
    if (k0 !== key) { key = k0; build(wide, view, featured); }

    // the deal grows out of the featured core as the visitor scrolls; until then it is not shown at all
    if (s < 1) {
      const grow = ease(clamp01((s - 0.1) / 0.75));
      const sc = still ? 1 : lerp(0.02, 1, grow);
      deal.scale.setScalar(sc);
      deal.position.copy(F).multiplyScalar(1 - sc);
      deal.visible = still ? s > 0.3 : s > 0.1;
    }
    const fade = still ? 1 - clamp01(s / 0.5) : 1 - ease(clamp01(s / 0.75));
    const lift = still ? 0 : Math.sin(Math.PI * clamp01(s / 0.45));
    const hand = still ? fade : 1 - ease(clamp01((s - 0.2) / 0.3));
    net.visible = Math.max(fade, hand) > 0.005;
    if (!net.visible) return;

    // slow turn about the featured core, so the depth reads; the mesh falls back as the deal arrives
    net.rotation.set(still ? 0.1 : 0.1 + Math.sin(t * 0.031) * 0.1, still ? -0.18 : Math.sin(t * 0.043) * 0.3, 0);
    net.scale.setScalar(lerp(0.8, 1, fade));
    net.updateMatrixWorld();
    m.multiplyMatrices(camera.matrixWorldInverse, net.matrixWorld);
    gl.getDrawingBufferSize(size);
    // a node sprite at the focal plane is ~2.2% of the screen height (its sharp core about a quarter of that)
    pointMat.uniforms.uScale.value = size.y * 0.022 * view.dist;

    const ca = points.geometry.attributes.aColor.array as Float32Array;
    const sa = points.geometry.attributes.aSize.array as Float32Array;
    const bright = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      const d = -tmp.copy(n.p).applyMatrix4(m).z; // distance in front of the camera
      const tw = still ? 1 : 0.82 + 0.18 * Math.sin(t * (0.5 + (i % 7) * 0.09) + n.tw);
      const featuredNode = i === 0;
      const a = featuredNode ? hand * (1 + 0.9 * lift) : fade;
      const b = fog(d, view.dist) * tw * a;
      bright[i] = fog(d, view.dist) * a;
      col.copy(n.gold ? GOLD : pal[n.hue]).multiplyScalar(b * (n.gold ? 1.1 : 0.95));
      ca.set([col.r, col.g, col.b], i * 3);
      sa[i] = n.size * (n.gold ? 1.8 : 1) * (featuredNode ? 1 + 0.6 * lift : 1);
    });
    points.geometry.attributes.aColor.needsUpdate = true;
    points.geometry.attributes.aSize.needsUpdate = true;
    const la = lines.geometry.attributes.color.array as Float32Array;
    edges.forEach(([a, b], i) => {
      const ka = 0.3 * bright[a], kb = 0.3 * bright[b];
      la.set([lineCol.r * ka, lineCol.g * ka, lineCol.b * ka, lineCol.r * kb, lineCol.g * kb, lineCol.b * kb], i * 6);
    });
    lines.geometry.attributes.color.needsUpdate = true;
  }

  return { update, setPalette, get palette() { return palette; } };
}
