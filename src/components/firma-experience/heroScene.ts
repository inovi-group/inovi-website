import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from "three";

/**
 * The hero background: a calm network of gold cores joined by thin lines. Around each core a deal slowly
 * forms (its box, three score tags, a seal), holds, and dissolves again, each on its own rhythm.
 * One node is the featured deal itself (the deal composition, shrunk onto it): as the visitor scrolls
 * (story step 0 → 1) it comes forward and becomes the deal view while the rest of the network recedes.
 * Reduced motion: the clusters stay formed and still, and the network simply fades as the deal arrives.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const win = (x: number, a: number, b: number) => ease(clamp01((x - a) / (b - a)));

const GOLD = new Color("#d9a34a");
const TAG = [new Color("#46b876"), new Color("#ef5a4c"), new Color("#94a0b4")];
// node offsets from the featured deal, in world units; wide screens spread sideways, phones upward and down
const SPREAD = {
  wide: [[-3.6, 1.9, -1.2], [-4.9, -1.3, -2.0], [-2.2, -2.2, -0.6], [2.7, 2.3, -1.6], [4.6, 0.3, -1.0], [3.1, -2.3, -2.2], [0.9, 3.1, -2.6], [6.4, -1.9, -2.8]],
  narrow: [[-1.7, 3.3, -1.2], [1.8, 4.6, -2.0], [2.1, 1.6, -0.8], [-2.0, -1.9, -1.0], [1.7, -3.2, -1.6], [-1.2, -4.8, -2.4], [0.4, 6.4, -2.8]],
} as const;
const LOOP = 11; // seconds for a deal to form, hold and dissolve around its core

type Node = {
  g: Group; core: Mesh; wire: LineSegments; box: LineSegments; tags: Mesh[]; seal: Mesh;
  phase: number; off: Vector3;
};

export function createHero(opts: { parent: Group; deal: Group; glass: (c: Color, o?: number) => ShaderMaterial; waxTex: Texture }) {
  const { parent, deal, glass, waxTex } = opts;
  const net = new Group();
  parent.add(net);

  const coreGeo = new IcosahedronGeometry(0.4, 3);
  const wireGeo = new EdgesGeometry(new IcosahedronGeometry(0.44, 1));
  const boxGeo = new EdgesGeometry(new BoxGeometry(2.9, 1.8, 2.0));
  const tagGeo = new PlaneGeometry(0.9, 0.22);
  const sealGeo = new CircleGeometry(0.2, 32);
  const additive = { transparent: true, depthWrite: false, blending: AdditiveBlending } as const;

  const makeNode = (k: number): Node => {
    const g = new Group();
    const core = new Mesh(coreGeo, glass(GOLD, 1.2));
    (core.material as ShaderMaterial).uniforms.uGrid.value = 0;
    const wire = new LineSegments(wireGeo, new LineBasicMaterial({ color: GOLD, opacity: 0.9, ...additive }));
    const box = new LineSegments(boxGeo, new LineBasicMaterial({ color: GOLD, opacity: 0, transparent: true, depthWrite: false }));
    const tags = TAG.map((c) => new Mesh(tagGeo, new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })));
    const seal = new Mesh(sealGeo, new MeshBasicMaterial({ map: waxTex, color: GOLD, transparent: true, opacity: 0, depthWrite: false }));
    g.add(core, wire, box, ...tags, seal);
    net.add(g);
    return { g, core, wire, box, tags, seal, phase: (k * 0.37) % 1, off: new Vector3() };
  };
  // one spare node stands in for the featured deal when motion is reduced (the deal itself is not shrunk then)
  const nodes = Array.from({ length: 1 + Math.max(SPREAD.wide.length, SPREAD.narrow.length) }, (_, k) => makeNode(k));

  // the network's lines (and a few slow sparks travelling along them), rebuilt when the layout changes
  const lineMat = new LineBasicMaterial({ color: GOLD, opacity: 0.22, ...additive });
  const lines = new LineSegments(new BufferGeometry(), lineMat);
  net.add(lines);
  const sparkMat = new PointsMaterial({ color: "#ffd27a", size: 0.07, opacity: 0.8, sizeAttenuation: true, ...additive });
  const sparks = new Points(new BufferGeometry(), sparkMat);
  net.add(sparks);
  let edges: [number, number][] = [];
  let key = "";

  const F = new Vector3(), tmp = new Vector3();

  function layout(spread: readonly (readonly number[])[], featured: Vector3) {
    // node 0 is the featured deal; the others sit around it
    nodes.forEach((n, k) => {
      const o = k === 0 ? [0, 0, 0] : spread[k - 1];
      n.g.visible = !!o;
      if (o) n.off.set(o[0], o[1], o[2]);
    });
    const live = nodes.map((n, k) => (n.g.visible ? k : -1)).filter((k) => k >= 0);
    // each node links to its two nearest neighbours; the featured deal to its three nearest
    const set = new Set<string>();
    edges = [];
    for (const a of live) {
      const near = live.filter((b) => b !== a).sort((x, y) => nodes[x].off.distanceTo(nodes[a].off) - nodes[y].off.distanceTo(nodes[a].off));
      for (const b of near.slice(0, a === 0 ? 3 : 2)) {
        const id = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!set.has(id)) { set.add(id); edges.push([a, b]); }
      }
    }
    lines.geometry.setAttribute("position", new BufferAttribute(new Float32Array(edges.length * 6), 3));
    sparks.geometry.setAttribute("position", new BufferAttribute(new Float32Array(edges.length * 3), 3));
    F.copy(featured);
  }

  function update({ s, t, still, wide, featured }: { s: number; t: number; still: boolean; wide: boolean; featured: Vector3 }) {
    const k0 = `${wide}-${featured.x.toFixed(2)}-${featured.y.toFixed(2)}`;
    if (k0 !== key) { key = k0; layout(wide ? SPREAD.wide : SPREAD.narrow, featured); }
    // 0 at the hero, 1 once the deal has come forward
    const fwd = ease(clamp01(s / 0.85));
    const netA = still ? 1 - clamp01(s / 0.5) : 1 - ease(clamp01(s / 0.7));
    net.visible = netA > 0.005;

    // the featured deal: shrunk onto its node in the hero, grown back to full size as it comes forward
    if (s < 1) {
      const sc = still ? 1 : lerp(0.3, 1, fwd);
      deal.scale.setScalar(sc);
      deal.position.copy(F).multiplyScalar(1 - sc);
      deal.visible = still ? s > 0.25 : true;
    }
    if (!net.visible) return;

    nodes.forEach((n, k) => {
      if (!n.g.visible) return;
      const featuredNode = k === 0;
      // the rest recede as the deal comes forward
      n.g.position.copy(F).add(n.off);
      n.g.scale.setScalar(featuredNode ? 1 : 0.78); // small and quiet: a backdrop, not the subject
      if (!featuredNode) n.g.position.z -= 2.5 * fwd;
      if (!still) n.g.position.y += Math.sin(t * 0.35 + k * 1.9) * 0.08;
      const a = netA * (featuredNode ? (still ? 1 : 0) : 1); // the real deal is the featured node, except when still
      const coreS = featuredNode ? 0.3 : 0.55;
      n.core.scale.setScalar(coreS * (still ? 1 : 1 + 0.06 * Math.sin(t * 1.3 + k)));
      n.wire.scale.copy(n.core.scale);
      if (!still) { n.core.rotation.y = t * 0.3 + k; n.wire.rotation.y = n.core.rotation.y; n.wire.rotation.x = t * 0.12; }
      (n.core.material as ShaderMaterial).uniforms.uOpacity.value = 0.9 * a;
      (n.wire.material as LineBasicMaterial).opacity = 0.7 * a;

      // a deal forming around the core: box, then the three score tags, then the seal; hold; dissolve
      const u = still ? 0.5 : (t / LOOP + n.phase) % 1;
      const out = still ? 0 : win(u, 0.82, 0.97);
      const boxIn = still ? 1 : win(u, 0.02, 0.18);
      const show = featuredNode ? 0 : a * (1 - out);
      n.box.scale.setScalar(0.42 * lerp(0.6, 1, boxIn));
      (n.box.material as LineBasicMaterial).opacity = 0.38 * boxIn * show;
      n.tags.forEach((m, j) => {
        const tin = still ? 1 : win(u, 0.14 + j * 0.07, 0.3 + j * 0.07);
        const slot = tmp.set(0.85, 0.32 - j * 0.26, 0.1);
        m.position.set(lerp(slot.x + 1.4, slot.x, tin), slot.y + lerp(0.5, 0, tin), slot.z);
        m.scale.set(lerp(0.3, 0.55, [0.82, 0.28, 0.9][j]), 0.55, 1);
        (m.material as MeshBasicMaterial).opacity = 0.5 * tin * show;
      });
      const press = still ? 1 : win(u, 0.42, 0.55);
      n.seal.position.set(-0.78, -0.3, lerp(0.6, 0.12, press));
      n.seal.scale.setScalar(lerp(1.8, 1, press));
      (n.seal.material as MeshBasicMaterial).opacity = 0.75 * press * show;
    });

    // lines between cores, and one slow spark on each
    const lp = lines.geometry.attributes.position.array as Float32Array;
    const sp = sparks.geometry.attributes.position.array as Float32Array;
    edges.forEach(([a, b], i) => {
      const pa = nodes[a].g.position, pb = nodes[b].g.position;
      lp.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      const f = still ? 0.5 : (t * 0.08 + i * 0.29) % 1;
      tmp.copy(pa).lerp(pb, f);
      sp.set([tmp.x, tmp.y, tmp.z], i * 3);
    });
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.computeBoundingSphere();
    sparks.geometry.attributes.position.needsUpdate = true;
    sparks.geometry.computeBoundingSphere();
    lineMat.opacity = 0.18 * netA;
    sparkMat.opacity = still ? 0 : 0.7 * netA;
  }

  return { update };
}
