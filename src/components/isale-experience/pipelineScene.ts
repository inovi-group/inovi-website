import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
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
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { beamMaterial, dotTexture, plinthMaterial } from "../agro-experience/soilScene";
import { isaleTune as T, ISALE_LIMITS } from "./isaleTuning";

/**
 * iSale's pipeline, in the same visual language as the Fides and Agro scenes: a CRM pipeline laid out as five
 * glass lanes (lead → closed) on a faint grid under a soft column of light. Deal cards come in from the CRM on
 * the left and drift along the pipeline; passing through iSale's scan gate, each one gets its risk score, and
 * the risky ones glow red and lift out of the flow.
 *
 * Scroll steps (the /isale page): 0 hero, 1 connect (the cards coming in from your CRM), 2 analyze (the scan
 * gate scoring each deal), 3 act (the risky deals flagged in negotiation). Reduced motion: the cards stand still.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED"];
const LANE_W = 2.5, X0 = -((STAGES.length - 1) / 2) * LANE_W, FLOOR_Y = -1.1, DEPTH = 2.8;
const GATE_X = X0 + 1.5 * LANE_W; // between qualified and proposal: where iSale scores each deal
const ROWS = [-0.75, 0, 0.75];

type Fonts = { sans: string; mono: string };
type View = { w: number; h: number; aspect: number; wide: boolean };
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// a deal card: the deal, its stage time, and (once scanned) its risk score built from observable signals
type Deal = { name: string; stage: string; risk: number; note: string };
const NOTES = { low: "ON TRACK", mid: "DISCOUNT PRESSURE", high: "STALLING · NO CHAMPION" };
const riskColor = (r: number) => (r > 0.7 ? "#ef5a4c" : r > 0.4 ? "#e0a03c" : "#46b876");
export function drawDeal(cv: HTMLCanvasElement, d: Deal, scored: boolean, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  rr(c, 6, 6, W - 12, H - 12, 22);
  c.fillStyle = "rgba(16,22,34,0.92)"; c.fill();
  c.lineWidth = 4; c.strokeStyle = scored && d.risk > 0.7 ? "rgba(239,90,76,0.9)" : "rgba(69,147,255,0.7)"; c.stroke();
  c.fillStyle = "#4593ff"; c.font = `600 30px ${F.mono}`; c.fillText(d.name, 34, 58);
  c.fillStyle = "#c3cad6"; c.font = `500 30px ${F.sans}`; c.fillText(d.stage, 34, 108);
  c.fillStyle = "#5c6678"; c.font = `600 22px ${F.mono}`; c.fillText("RISK", 34, 172);
  c.fillStyle = "#1f2735"; c.fillRect(104, 158, W - 250, 16);
  if (!scored) {
    c.fillStyle = "#5c6678"; c.font = `600 22px ${F.mono}`; c.fillText("NOT YET SCORED", 34, 232);
    return;
  }
  const col = riskColor(d.risk);
  c.fillStyle = col; c.fillRect(104, 158, (W - 250) * d.risk, 16);
  c.font = `700 34px ${F.mono}`; c.fillText(d.risk.toFixed(2), W - 126, 178);
  c.font = `600 22px ${F.mono}`; c.fillText(d.note, 34, 232);
}
function drawStage(cv: HTMLCanvasElement, name: string, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#4593ff"; c.fillRect(0, H / 2 - 8, 16, 16);
  c.fillStyle = "#94a0b4"; c.font = `600 34px ${F.mono}`; c.textBaseline = "middle"; c.fillText(name, 32, H / 2 + 2);
}

// the scan gate: a vertical sheet of blue light with a bright line sweeping up through it
function gateMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uColor: { value: new Color("#4593ff") } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAlpha; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(1.0, 0.7, vUv.y);
        float sweep = exp(-pow((vUv.y - fract(uTime * 0.35)) / 0.03, 2.0));
        float body = 0.16 + 0.1 * sin(vUv.x * 40.0 + uTime) * 0.5;
        float a = (body + sweep * 0.9) * edge * uAlpha;
        gl_FragColor = vec4((uColor + vec3(sweep * 0.4)) * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
}

export function createPipeline({ stage, camera, fonts }: { stage: Group; camera: PerspectiveCamera; fonts: Fonts }) {
  let seed = 3307;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const textures: Texture[] = [];
  const texOf = (cv: HTMLCanvasElement) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; textures.push(t); return t; };
  const dot = dotTexture(); textures.push(dot);
  const view: View = { w: 1, h: 1, aspect: 1, wide: true };
  const fov = Math.tan((camera.fov * Math.PI) / 360);

  const world = new Group();
  stage.add(world);

  // ---- the floor and the lanes ----
  const plinth = new Mesh(new PlaneGeometry(30, 30), plinthMaterial());
  plinth.rotation.x = -Math.PI / 2; plinth.position.y = FLOOR_Y - 0.02; plinth.renderOrder = -1;
  (plinth.material as ShaderMaterial).uniforms.uColor.value.set("#3d6fae");
  world.add(plinth);
  const laneGeo = new BoxGeometry(LANE_W - 0.12, 0.06, DEPTH), laneEdges = new EdgesGeometry(laneGeo);
  const lanes = STAGES.map((name, i) => {
    const x = X0 + i * LANE_W;
    const slab = new Mesh(laneGeo, new MeshBasicMaterial({ color: "#4593ff", transparent: true, opacity: 0.06, blending: AdditiveBlending, depthWrite: false }));
    slab.position.set(x, FLOOR_Y, 0);
    const edges = new LineSegments(laneEdges, new LineBasicMaterial({ color: "#4593ff", transparent: true, opacity: 0.4, depthWrite: false }));
    edges.position.copy(slab.position);
    const cv = canvasOf(512, 64);
    const label = new Mesh(new PlaneGeometry(2.0, 0.25), new MeshBasicMaterial({ map: texOf(cv), transparent: true, depthWrite: false }));
    label.rotation.x = -Math.PI / 2; label.position.set(x - 0.15, FLOOR_Y + 0.04, DEPTH / 2 + 0.3);
    world.add(slab, edges, label);
    return { name, cv, slab, edges };
  });
  // the CRM the deals come in from: a frame at the head of the pipeline
  const crm = new LineSegments(new EdgesGeometry(new BoxGeometry(0.1, 1.6, DEPTH)), new LineBasicMaterial({ color: "#94a0b4", transparent: true, opacity: 0.55 }));
  crm.position.set(X0 - LANE_W / 2 - 0.2, FLOOR_Y + 0.8, 0);
  const crmCv = canvasOf(512, 64);
  const crmLabel = new Mesh(new PlaneGeometry(2.0, 0.25), new MeshBasicMaterial({ map: texOf(crmCv), transparent: true, depthWrite: false }));
  crmLabel.position.set(X0 - LANE_W / 2 - 0.2, FLOOR_Y + 1.85, 0); crmLabel.rotation.y = 0;
  world.add(crm, crmLabel);
  // iSale's scan gate
  const gate = new Mesh(new PlaneGeometry(DEPTH + 0.6, 2.4), gateMaterial());
  gate.rotation.y = Math.PI / 2; gate.position.set(GATE_X, FLOOR_Y + 1.2, 0);
  world.add(gate);
  const gateFrame = new LineSegments(new EdgesGeometry(new PlaneGeometry(DEPTH + 0.6, 2.4)), new LineBasicMaterial({ color: "#4593ff", transparent: true, opacity: 0.7 }));
  gateFrame.rotation.copy(gate.rotation); gateFrame.position.copy(gate.position);
  world.add(gateFrame);

  // ---- the deal cards ----
  const cardGeo = new PlaneGeometry(1.5, 0.75);
  const cards = Array.from({ length: ISALE_LIMITS.cards }, (_, i) => {
    const risk = [0.12, 0.34, 0.82, 0.47, 0.18, 0.76, 0.29, 0.55, 0.09, 0.88, 0.22, 0.41, 0.15, 0.71][i % 14];
    const d: Deal = {
      name: `DEAL ${String(i + 1).padStart(2, "0")}`,
      // the risky ones are the deals stalling in negotiation
      stage: risk > 0.7 ? "Negotiation · 45 days" : ["New lead", "Discovery · 9 days", "Proposal · 20 days", "Closing · 6 days"][i % 4],
      risk, note: risk > 0.7 ? NOTES.high : risk > 0.4 ? NOTES.mid : NOTES.low,
    };
    const cvA = canvasOf(512, 256), cvB = canvasOf(512, 256);
    const texA = texOf(cvA), texB = texOf(cvB);
    const m = new Mesh(cardGeo, new MeshBasicMaterial({ map: texA, transparent: true, depthWrite: false, side: DoubleSide }));
    m.renderOrder = 2;
    const flag = new Sprite(new SpriteMaterial({ map: dot, color: "#ef5a4c", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    flag.scale.set(2.6, 1.6, 1);
    world.add(flag, m);
    return { d, m, flag, cvA, cvB, texA, texB, row: ROWS[i % 3], ph: rnd(), bob: rnd() * 6.28, scored: false };
  });

  // ---- light and air ----
  const beam = new Mesh(new PlaneGeometry(1, 1), beamMaterial());
  beam.renderOrder = -2;
  stage.add(beam);
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute("position", new BufferAttribute(new Float32Array(ISALE_LIMITS.motes * 3), 3));
  moteGeo.setAttribute("color", new BufferAttribute(new Float32Array(ISALE_LIMITS.motes * 3), 3));
  const moteMat = new PointsMaterial({ size: 0.035, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  stage.add(motes);
  const moteSeeds = Array.from({ length: ISALE_LIMITS.motes }, () => ({ x: rnd() * 2 - 1, y: rnd(), z: lerp(-4, 3, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));

  const redraw = () => {
    lanes.forEach((l) => drawStage(l.cv, l.name, fonts));
    drawStage(crmCv, "YOUR CRM", fonts);
    cards.forEach((c) => { drawDeal(c.cvA, c.d, false, fonts); drawDeal(c.cvB, c.d, true, fonts); });
    textures.forEach((t) => { t.needsUpdate = true; });
  };
  redraw();

  // camera keyframes per step: [turn, elevation, zoom, look-at x, look-at y, shift right (wide pages)]
  const keys = () => [
    [T.heroYaw, T.heroElevation, T.heroZoom, 0, -0.3, T.heroShiftX],
    [-0.25, 0.32, 1.35, X0 + 0.4, -0.2, 0.21],
    [-0.55, 0.28, 1.45, GATE_X, 0, 0.21],
    [-0.3, 0.36, 1.3, X0 + 3 * LANE_W, 0, 0.24],
  ];
  const v = new Vector3();

  function update({ s, t, still }: { s: number; t: number; still: boolean }) {
    const K = keys();
    const i0 = Math.min(K.length - 1, Math.floor(s)), i1 = Math.min(K.length - 1, i0 + 1), f = ease(clamp01(s - i0));
    const [yaw, elev, zoom, lx, ly, shift] = K[i0].map((a, j) => lerp(a, K[i1][j], f));
    world.rotation.y = yaw + (still ? 0 : Math.sin(t * 0.12) * 0.05 * T.drift);
    const act = smooth(2.5, 3.0, s); // step 3: the risky deals stand out more

    // the cards drift down the pipeline; scored as they pass the gate; the risky ones lift out in negotiation
    const n = Math.min(ISALE_LIMITS.cards, Math.round(T.cardCount));
    const span = STAGES.length * LANE_W + 1.2, start = X0 - LANE_W / 2 - 0.4;
    cards.forEach((c, i) => {
      c.m.visible = c.flag.visible = i < n;
      if (i >= n) return;
      const u = still ? (i / n + c.ph * 0.3) % 1 : (t * T.flowSpeed + i / n + c.ph * 0.3) % 1;
      const x = start + u * span;
      const scored = x > GATE_X;
      if (scored !== c.scored) { c.scored = scored; c.m.material.map = scored ? c.texB : c.texA; c.m.material.needsUpdate = true; }
      const risky = scored && c.d.risk > 0.7;
      const inNeg = smooth(X0 + 2.6 * LANE_W, X0 + 3 * LANE_W, x);
      const lift = risky ? inNeg * (0.5 + 0.3 * act) : 0;
      const bob = still ? 0 : Math.sin(t * 0.8 + c.bob) * 0.04;
      c.m.position.set(x, FLOOR_Y + 0.55 + lift + bob, c.row + (risky ? inNeg * 0.5 : 0));
      c.m.rotation.set(-0.25, -world.rotation.y * 0.6, 0);
      const fade = smooth(0, 0.06, u) * (1 - smooth(0.93, 1, u));
      c.m.material.opacity = fade * (risky ? 1 : lerp(1, 0.55, act * (scored ? 1 : 0)));
      c.m.scale.setScalar(T.cardSize * (1 + 0.12 * lift));
      c.flag.position.copy(c.m.position).add(v.set(0, 0, -0.08));
      (c.flag.material as SpriteMaterial).opacity = risky ? fade * (0.35 + 0.35 * inNeg + 0.25 * act) * T.flagGlow * (still ? 1 : 0.85 + 0.15 * Math.sin(t * 3 + c.bob)) : 0;
    });
    const gu = (gate.material as ShaderMaterial).uniforms;
    gu.uTime.value = t; gu.uAlpha.value = T.gateGlow * (1 + 0.6 * smooth(1.5, 2, s) * (1 - smooth(2.5, 3, s)));
    lanes.forEach((l, i) => {
      const hi = i === 3 ? act : 0;
      (l.edges.material as LineBasicMaterial).opacity = 0.4 + 0.4 * hi;
      (l.edges.material as LineBasicMaterial).color.set(hi > 0.5 ? "#ef5a4c" : "#4593ff");
    });

    // ---- light and air ----
    (plinth.material as ShaderMaterial).uniforms.uAlpha.value = T.plinthGrid;
    const bu = (beam.material as ShaderMaterial).uniforms;
    bu.uTime.value = t; bu.uAlpha.value = T.beamOpacity; bu.uColor.value.set(T.beamColor);
    beam.position.set(0, 2.6, -DEPTH - 1); beam.scale.set(14 * T.beamWidth, 8, 1);
    const nm = Math.min(ISALE_LIMITS.motes, Math.round(T.motesCount * (view.wide ? 1 : 0.5)));
    const mp = moteGeo.attributes.position.array as Float32Array, mc = moteGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < nm; i++) {
      const m = moteSeeds[i];
      const y = still ? m.y : (((m.y - t * 0.008 * m.sp) % 1) + 1) % 1;
      let x = m.x * lerp(3, 8, 1 - y) * T.beamWidth, z = m.z;
      if (!still) { x += Math.sin(t * 0.3 + m.ph) * 0.06; z += Math.cos(t * 0.25 + m.ph) * 0.06; }
      mp.set([x, FLOOR_Y + 0.3 + y * 6, z], i * 3);
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * (1.1 + (i % 5) * 0.3) + m.ph);
      const b = T.motesBrightness * m.mag * tw * smooth(0, 0.15, y) * smooth(1, 0.8, y) * 0.5;
      mc.set([0.8 * b, 0.88 * b, 1.0 * b], i * 3);
    }
    moteGeo.setDrawRange(0, nm);
    moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;

    placeCamera(elev, zoom, lx, ly, shift);
  }

  function placeCamera(elev: number, zoom: number, lx: number, ly: number, shift: number) {
    const { w, h, aspect, wide } = view;
    // the whole pipeline is about 14 × 4 units
    const hw = 7.4, hh = 2.6;
    let dist, ox, oy;
    if (wide) {
      dist = Math.max(hh / (fov * 0.86), hw / (fov * aspect * 0.58)) / zoom;
      ox = -w * shift; oy = 0;
    } else {
      dist = Math.max(hh / (fov * 0.5), hw / (fov * aspect * 0.98)) / zoom;
      ox = 0; oy = h * 0.16;
    }
    camera.aspect = aspect;
    camera.setViewOffset(w, h, ox, oy, w, h);
    // the look-at point turns with the world, so the camera keeps it in view
    v.set(lx, ly, 0).applyAxisAngle(new Vector3(0, 1, 0), world.rotation.y);
    camera.position.set(v.x, v.y + Math.sin(elev) * dist, v.z + Math.cos(elev) * dist);
    camera.lookAt(v);
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
