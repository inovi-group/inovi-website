import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { AGRO_DEFAULTS } from "../agro-experience/agroTuning";
import { beamMaterial, dotTexture, plinthMaterial, plotKit } from "../agro-experience/soilScene";
import { ENV, drawEnvelopeFace, makeEnvelope } from "../firma-experience/envelope";
import { HOME_LIMITS, homeTune as T } from "./homeTuning";

/**
 * The home page: INOVI's three products standing on one governance layer. A ring of gold chain links (the
 * verifiable record) lies under a soft column of light; on it stand iSale (deal cards being scanned for risk),
 * AGRO (a small field plot in cutaway, water under the crops) and FIRMA (sealed golden envelopes, chained).
 * Records fall from each product into the ring and travel around it.
 *
 * Scroll steps: 0 hero (all three, the ring turning slowly), 1 iSale, 2 AGRO, 3 FIRMA (the ring turns each one
 * to the front and the camera comes close), 4 all three again, from higher up: one layer under them all.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const TAU = Math.PI * 2;
const RING_Y = -1.1;
// the three products, around the ring (angles), with their accents
export const STATIONS = [
  { key: "isale", name: "iSALE", tag: "Revenue intelligence", color: "#4593ff", angle: 0 },
  { key: "agro", name: "AGRO", tag: "Smart irrigation", color: "#46b876", angle: TAU / 3 },
  { key: "fides", name: "FIDES", tag: "Trusted deal records", color: "#d9a34a", angle: (2 * TAU) / 3 },
] as const;

type Fonts = { sans: string; mono: string };
type View = { w: number; h: number; aspect: number; wide: boolean };
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// an iSale deal card: a deal, its stage, and a risk score built from observable signals
type Deal = { name: string; stage: string; risk: number; note: string };
const DEALS: Deal[] = [
  { name: "DEAL 01", stage: "Proposal · 12 days", risk: 0.18, note: "ON TRACK" },
  { name: "DEAL 02", stage: "Discovery · 9 days", risk: 0.32, note: "ON TRACK" },
  { name: "DEAL 03", stage: "Negotiation · 45 days", risk: 0.82, note: "STALLING · NO CHAMPION" },
  { name: "DEAL 04", stage: "Proposal · 20 days", risk: 0.47, note: "DISCOUNT PRESSURE" },
  { name: "DEAL 05", stage: "Closing · 6 days", risk: 0.12, note: "ON TRACK" },
];
const riskColor = (r: number) => (r > 0.7 ? "#ef5a4c" : r > 0.4 ? "#e0a03c" : "#46b876");
function drawDeal(cv: HTMLCanvasElement, d: Deal, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  rr(c, 6, 6, W - 12, H - 12, 22);
  c.fillStyle = "rgba(16,22,34,0.92)"; c.fill();
  c.lineWidth = 4; c.strokeStyle = d.risk > 0.7 ? "rgba(239,90,76,0.85)" : "rgba(69,147,255,0.7)"; c.stroke();
  c.fillStyle = "#4593ff"; c.font = `600 30px ${F.mono}`; c.fillText(d.name, 34, 58);
  c.fillStyle = "#c3cad6"; c.font = `500 30px ${F.sans}`; c.fillText(d.stage, 34, 108);
  c.fillStyle = "#5c6678"; c.font = `600 22px ${F.mono}`; c.fillText("RISK", 34, 172);
  const col = riskColor(d.risk);
  c.fillStyle = "#1f2735"; c.fillRect(104, 158, W - 250, 16);
  c.fillStyle = col; c.fillRect(104, 158, (W - 250) * d.risk, 16);
  c.font = `700 34px ${F.mono}`; c.fillText(d.risk.toFixed(2), W - 126, 178);
  c.font = `600 22px ${F.mono}`; c.fillText(d.note, 34, 232);
}
function drawLabel(cv: HTMLCanvasElement, name: string, tag: string, color: string, F: Fonts) {
  // the product's name with its accent square, and its line underneath
  const c = cv.getContext("2d")!, W = cv.width;
  c.clearRect(0, 0, W, cv.height);
  c.font = `700 46px ${F.sans}`;
  const nw = c.measureText(name).width, x0 = W / 2 - (nw + 30) / 2;
  c.fillStyle = color; c.fillRect(x0, 22, 16, 16);
  c.fillStyle = "#e7eaf0"; c.fillText(name, x0 + 30, 46);
  c.textAlign = "center"; c.fillStyle = "#94a0b4"; c.font = `500 26px ${F.mono}`;
  c.fillText(tag.toUpperCase(), W / 2, 92);
  c.textAlign = "left";
}

export function createHome({ stage, camera, fonts }: { stage: Group; camera: PerspectiveCamera; fonts: Fonts }) {
  let seed = 5821;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const textures: Texture[] = [];
  const texOf = (cv: HTMLCanvasElement) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; textures.push(t); return t; };
  const dot = dotTexture(); textures.push(dot);
  const view: View = { w: 1, h: 1, aspect: 1, wide: true };
  const fov = Math.tan((camera.fov * Math.PI) / 360);

  const world = new Group();
  stage.add(world);

  // ---- the governance layer: a ring of chain links, a hairline circle, and the floor ----
  const NL = 76;
  const linkGeo = new TorusGeometry(0.12, 0.022, 8, 28);
  const links = Array.from({ length: NL }, (_, i) => {
    const m = new Mesh(linkGeo, new MeshBasicMaterial({ color: "#d9a34a" }));
    m.rotation.order = "YXZ";
    m.scale.set(1.55, 1, 1);
    world.add(m);
    return { m, flat: i % 2 === 0 };
  });
  const circle = new LineLoop(new BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new Vector3(Math.sin((i / 128) * TAU), 0, Math.cos((i / 128) * TAU)))),
    new LineBasicMaterial({ color: "#d9a34a", transparent: true, opacity: 0.25, depthWrite: false }));
  circle.position.y = RING_Y - 0.06;
  world.add(circle);
  const plinth = new Mesh(new PlaneGeometry(26, 26), plinthMaterial());
  plinth.rotation.x = -Math.PI / 2; plinth.position.y = RING_Y - 0.08; plinth.renderOrder = -1;
  (plinth.material as ShaderMaterial).uniforms.uColor.value.set("#3d6fae");
  world.add(plinth);
  const pulses = STATIONS.map((st) => {
    const s = new Sprite(new SpriteMaterial({ map: dot, color: st.color, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    world.add(s);
    return s;
  });

  // ---- the three products ----
  const stations = STATIONS.map((st) => {
    const g = new Group();
    world.add(g);
    const labelCv = canvasOf(512, 112);
    const label = new Mesh(new PlaneGeometry(1.9, 0.42), new MeshBasicMaterial({ map: texOf(labelCv), transparent: true, depthWrite: false }));
    label.position.set(0, RING_Y - 0.3, 0.6); // in front of the ring, just below it
    g.add(label);
    return { st, g, label, labelCv, color: new Color(st.color) };
  });

  // iSale: five deal cards in a fan, a scan sweeping across them, the risky one flagged
  const isale = stations[0];
  const cardGeo = new PlaneGeometry(1.0, 0.5);
  const cards = DEALS.map((d, k) => {
    const cv = canvasOf(512, 256);
    const m = new Mesh(cardGeo, new MeshBasicMaterial({ map: texOf(cv), transparent: true, depthWrite: false }));
    const o = k - 2;
    m.position.set(o * 0.66, 0.35 + Math.abs(o) * -0.08 + (k % 2) * 0.32, -Math.abs(o) * 0.22);
    m.rotation.y = -o * 0.22;
    m.renderOrder = 2;
    isale.g.add(m);
    return { m, cv, d };
  });
  const flag = new Sprite(new SpriteMaterial({ map: dot, color: "#ef5a4c", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  flag.position.copy(cards[2].m.position).add(new Vector3(0, 0, -0.05)); flag.scale.set(1.8, 1.1, 1);
  isale.g.add(flag);
  const scan = new Mesh(new PlaneGeometry(0.05, 1.3), new MeshBasicMaterial({ color: "#4593ff", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  scan.renderOrder = 3;
  isale.g.add(scan);

  // AGRO: the field plot in cutaway (the Agro page's own plot, small), a probe light in its root zone
  const agro = stations[1];
  const kit = plotKit(rnd);
  const plot = kit.makeCore();
  plot.scale.setScalar(0.3);
  plot.position.set(0, 0.55, 0);
  plot.rotation.y = -0.35;
  agro.g.add(plot);
  const SU = kit.SU, A = AGRO_DEFAULTS;
  SU.uSoil0.value.set(A.topsoil); SU.uSoil1.value.set(A.subsoil); SU.uSoil2.value.set(A.clay); SU.uWater.value.set(A.waterColor);
  SU.uLines.value = A.layerLines; SU.uGrain.value = A.grain; SU.uDepthShade.value = A.depthShade;
  SU.uWetDark.value = A.wetDarken; SU.uWetTint.value = A.wetTint; SU.uGlow.value = A.frontGlow; SU.uSparkle.value = A.sparkle; SU.uMapK.value = 0;
  kit.plantsMat.uniforms.uHeight.value = A.cropHeight;
  kit.tubeMat.uniforms.uWater.value.set(A.waterColor);
  const probeLights = [-1.2, 0.9].map((x) => {
    const s = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
    s.position.set(x, 1 - 0.8, 1.56); s.scale.setScalar(0.9);
    plot.add(s);
    return s;
  });

  // FIRMA: three sealed golden envelopes, stacked like the register, linked by a gold thread
  const firma = stations[2];
  const faceCv = canvasOf(1024, Math.round((1024 * ENV.h) / ENV.w));
  const face = texOf(faceCv);
  const sealGeo = new CircleGeometry(0.15, 40);
  const envelopes = [0, 1, 2].map((k) => {
    const seal = new Mesh(sealGeo, new MeshBasicMaterial({ color: "#8f1d2c", transparent: true }));
    const emblem = { g: new Group(), set(_l: number, _v: number, _b: number, a: number) { seal.material.opacity = a; } };
    emblem.g.add(seal);
    const env = makeEnvelope(face, emblem);
    env.g.scale.setScalar(0.4);
    env.g.position.set((k - 1) * 0.28, 0.05 + k * 0.52, -k * 0.12);
    env.g.rotation.set(0.12, (1 - k) * 0.18, (k - 1) * 0.05);
    env.setOpacity(1);
    firma.g.add(env.g);
    return env;
  });
  const thread = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: "#d9a34a", transparent: true, opacity: 0.7, depthWrite: false }));
  thread.geometry.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
  firma.g.add(thread);

  // ---- records falling from each product into the ring ----
  const NF = 12;
  const flowGeo = new BufferGeometry();
  flowGeo.setAttribute("position", new BufferAttribute(new Float32Array(STATIONS.length * NF * 3), 3));
  flowGeo.setAttribute("color", new BufferAttribute(new Float32Array(STATIONS.length * NF * 3), 3));
  const flowMat = new PointsMaterial({ size: 0.09, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const flow = new Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  world.add(flow);
  const flowSeeds = Array.from({ length: STATIONS.length * NF }, () => ({ ph: rnd(), x: (rnd() - 0.5) * 0.5, z: (rnd() - 0.5) * 0.3 }));

  // ---- light and air ----
  const beam = new Mesh(new PlaneGeometry(1, 1), beamMaterial());
  beam.renderOrder = -2;
  stage.add(beam);
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute("position", new BufferAttribute(new Float32Array(HOME_LIMITS.motes * 3), 3));
  moteGeo.setAttribute("color", new BufferAttribute(new Float32Array(HOME_LIMITS.motes * 3), 3));
  const moteMat = new PointsMaterial({ size: 0.035, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  stage.add(motes);
  const moteSeeds = Array.from({ length: HOME_LIMITS.motes }, () => ({ x: rnd() * 2 - 1, y: rnd(), z: lerp(-4, 3, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));

  const redraw = () => {
    stations.forEach((s) => drawLabel(s.labelCv, s.st.name, s.st.tag, s.st.color, fonts));
    cards.forEach((c) => drawDeal(c.cv, c.d, fonts));
    drawEnvelopeFace(faceCv, { mono: fonts.mono });
    textures.forEach((t) => { t.needsUpdate = true; });
  };
  redraw();

  const GOLD = new Color("#d9a34a"), v = new Vector3();
  // camera keyframes per step: [ring turn, elevation, zoom, look-at height, focus on the front product, shift right]
  const keys = () => {
    const f = T.focusZoom;
    return [
      [T.heroYaw, T.heroElevation, T.heroZoom, -0.35, 0, T.heroShiftX],
      [-STATIONS[0].angle, 0.24, f, 0.2, 1, 0.21],
      [-STATIONS[1].angle, 0.28, f, 0.15, 1, 0.21],
      [-STATIONS[2].angle, 0.24, f, 0.3, 1, 0.21],
      [-STATIONS[2].angle - 0.9, 0.62, 0.95, -0.45, 0, 0.21],
    ];
  };

  function update({ s, t, still }: { s: number; t: number; still: boolean }) {
    const K = keys();
    const i0 = Math.min(K.length - 1, Math.floor(s)), i1 = Math.min(K.length - 1, i0 + 1), f = ease(clamp01(s - i0));
    const [yaw, elev, zoom, lookY, focus, shift] = K[i0].map((a, j) => lerp(a, K[i1][j], f));
    const hero = 1 - smooth(0.1, 0.9, s);
    const R = T.ringRadius;
    world.rotation.y = yaw + (still ? 0 : Math.sin(t * 0.11) * 0.08 * T.drift * (0.35 + 0.65 * hero));
    // which product is in front, for the labels (0 in the hero and at the end: all equal)
    const front = focus > 0.5 ? Math.round(Math.min(3, Math.max(1, s))) - 1 : -1;

    // ---- the ring ----
    const ps = STATIONS.map((st, i) => st.angle + (still ? 0.3 : (t * T.pulseSpeed + i / 3) % 1) * TAU);
    links.forEach((l, i) => {
      const a = (i / NL) * TAU;
      l.m.position.set(Math.sin(a) * R, RING_Y, Math.cos(a) * R);
      l.m.rotation.set(l.flat ? Math.PI / 2 : 0, a, 0); // long axis along the ring
      let k = 0.32;
      ps.forEach((p) => {
        let d = Math.abs(((a - p) % TAU + TAU) % TAU);
        d = Math.min(d, TAU - d);
        k += Math.exp(-((d / T.pulseWidth) ** 2)) * 0.8;
      });
      (l.m.material as MeshBasicMaterial).color.copy(GOLD).multiplyScalar(Math.min(1.25, k * T.linkGlow));
    });
    circle.scale.set(R, 1, R);
    pulses.forEach((p, j) => {
      p.position.set(Math.sin(ps[j]) * R, RING_Y + 0.02, Math.cos(ps[j]) * R);
      p.scale.setScalar(0.9);
      (p.material as SpriteMaterial).opacity = 0.75 * T.linkGlow;
    });
    (plinth.material as ShaderMaterial).uniforms.uAlpha.value = T.plinthGrid;

    // ---- the products: placed on the ring ----
    stations.forEach((sn, i) => {
      const a = sn.st.angle;
      sn.g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      sn.g.rotation.y = -world.rotation.y; // each product faces you as the ring turns
      sn.g.scale.setScalar(T.stationScale);
      (sn.label.material as MeshBasicMaterial).opacity = T.labelOpacity * (front < 0 || front === i ? 1 : 0.35);
    });

    // iSale: the scan sweeps the fan; the risky deal glows red
    const sweep = still ? 0.5 : (t * 0.22) % 1;
    scan.position.set(lerp(-1.75, 1.75, sweep), 0.45, 0.25);
    (scan.material as MeshBasicMaterial).opacity = 0.65 * T.cardGlow * Math.sin(Math.PI * sweep);
    const hit = Math.exp(-(((sweep - 0.5) / 0.08) ** 2)); // the scan crossing the risky deal
    (flag.material as SpriteMaterial).opacity = (0.28 + 0.5 * hit + (still ? 0 : 0.08 * Math.sin(t * 3))) * T.cardGlow;
    cards.forEach((c, k) => {
      c.m.position.y = 0.35 + Math.abs(k - 2) * -0.08 + (k % 2) * 0.32 + (still ? 0 : Math.sin(t * 0.6 + k) * 0.03);
    });

    // AGRO: water breathing under the crops, sensors pulsing
    SU.uTime.value = t; SU.uF.value = T.plotWater + (still ? 0 : Math.sin(t * 0.5) * 0.05); SU.uFlow.value = 1; SU.uDry.value = 0; SU.uMap.value = 0;
    kit.plantsMat.uniforms.uTime.value = t; kit.plantsMat.uniforms.uSway.value = still ? 0 : 1;
    kit.tubeMat.uniforms.uTime.value = t; kit.tubeMat.uniforms.uFlow.value = 1;
    probeLights.forEach((p, k) => { (p.material as SpriteMaterial).opacity = still ? 0.8 : 0.5 + 0.5 * Math.max(0, Math.sin(t * 2 + k * 2)); });

    // FIRMA: the envelopes float a little, the thread links them in order
    const tp = thread.geometry.attributes.position.array as Float32Array;
    envelopes.forEach((e, k) => {
      e.g.position.y = 0.05 + k * 0.52 + (still ? 0 : Math.sin(t * 0.5 + k * 1.3) * 0.04);
      e.setLight(0.55, T.envelopeGlow);
    });
    for (let k = 0; k < 2; k++) {
      const a = envelopes[k].g.position, b = envelopes[k + 1].g.position, hh = (ENV.h / 2) * 0.4;
      tp.set([a.x, a.y + hh, a.z, b.x, b.y - hh, b.z], k * 6);
    }
    thread.geometry.attributes.position.needsUpdate = true;
    thread.geometry.computeBoundingSphere();

    // ---- records falling into the ring ----
    const fp = flowGeo.attributes.position.array as Float32Array, fc = flowGeo.attributes.color.array as Float32Array;
    STATIONS.forEach((st, i) => {
      const a = st.angle, c = stations[i].color;
      for (let k = 0; k < NF; k++) {
        const n = i * NF + k, sd = flowSeeds[n];
        const u = still ? sd.ph : (t * 0.18 + sd.ph) % 1;
        // from just under the product down into the ring (in the product's own frame, then turned onto the ring)
        const lx = sd.x, lz = sd.z, ly = lerp(-0.05, RING_Y + 0.05, u);
        fp.set([Math.sin(a) * (R + lz) + Math.cos(a) * lx, ly, Math.cos(a) * (R + lz) - Math.sin(a) * lx], n * 3);
        const b = Math.sin(Math.PI * u) * T.flowParticles * 1.2;
        fc.set([c.r * b, c.g * b, c.b * b], n * 3);
      }
    });
    flowGeo.attributes.position.needsUpdate = true; flowGeo.attributes.color.needsUpdate = true;

    // ---- light and air ----
    const bu = (beam.material as ShaderMaterial).uniforms;
    bu.uTime.value = t; bu.uAlpha.value = T.beamOpacity; bu.uColor.value.set(T.beamColor);
    beam.position.set(0, 2.6, -R - 0.5); beam.scale.set(11 * T.beamWidth, 8, 1);
    const nm = Math.min(HOME_LIMITS.motes, Math.round(T.motesCount * (view.wide ? 1 : 0.5)));
    const mp = moteGeo.attributes.position.array as Float32Array, mc = moteGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < nm; i++) {
      const m = moteSeeds[i];
      const y = still ? m.y : (((m.y - t * 0.008 * m.sp) % 1) + 1) % 1;
      let x = m.x * lerp(2, 6, 1 - y) * T.beamWidth, z = m.z;
      if (!still) { x += Math.sin(t * 0.3 + m.ph) * 0.06; z += Math.cos(t * 0.25 + m.ph) * 0.06; }
      mp.set([x, RING_Y + 0.4 + y * 6, z], i * 3);
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * (1.1 + (i % 5) * 0.3) + m.ph);
      const b = T.motesBrightness * m.mag * tw * smooth(0, 0.15, y) * smooth(1, 0.8, y) * 0.5;
      mc.set([0.8 * b, 0.88 * b, 1.0 * b], i * 3);
    }
    moteGeo.setDrawRange(0, nm);
    moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;

    placeCamera(elev, zoom, lookY, focus, shift, R);
  }

  function placeCamera(elev: number, zoom: number, lookY: number, focus: number, shift: number, R: number) {
    const { w, h, aspect, wide } = view;
    // all three on the ring, or one product close up (about 4 × 2.6 units)
    const hw = lerp(R + 2.2, 2.3, focus), hh = lerp(3.1, 1.55, focus);
    let dist, ox, oy;
    if (wide) {
      dist = Math.max(hh / (fov * 0.86), hw / (fov * aspect * 0.56)) / zoom;
      ox = -w * shift; oy = 0;
    } else {
      dist = Math.max(hh / (fov * 0.5), hw / (fov * aspect * 0.98)) / zoom;
      ox = 0; oy = h * 0.16;
    }
    const tz = R * focus;
    camera.aspect = aspect;
    camera.setViewOffset(w, h, ox, oy, w, h);
    camera.position.set(0, lookY + Math.sin(elev) * dist, tz + Math.cos(elev) * dist);
    camera.lookAt(v.set(0, lookY, tz));
    camera.updateProjectionMatrix();
  }

  return {
    update,
    setView(nv: View) { Object.assign(view, nv); },
    redraw,
    dispose() {
      stage.traverse((o: Object3D) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
      });
      textures.forEach((t) => t.dispose());
      stage.clear();
    },
  };
}
