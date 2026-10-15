import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CatmullRomCurve3,
  Points,
  PointsMaterial,
  BufferAttribute,
  RingGeometry,
  TorusGeometry,
  LineDashedMaterial,
  LineLoop,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { StoryData, Score, Reality, Decision, ChainRecord } from "./content";
import { createMonth } from "./monthScene";
import { createHero } from "./heroScene";

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 0 → 1 over [a, b] of the scroll step, eased
export const phase = (step: number, a: number, b = a + 1) => ease(clamp01((step - a) / (b - a)));

// Canvas fonts: the site's next/font families (resolved at runtime), with the brand names as fallback.
const F = { sans: "Inter, system-ui, sans-serif", mono: "'JetBrains Mono', monospace" };
type Zone = { cx: number; cy: number; w: number; h: number; frame?: boolean; compact?: boolean; kind: string; gate: Vector3; gateSide: string };
type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Fx = Mesh<BufferGeometry, MeshBasicMaterial>;
type Layout = {
  bc: Vector3; box: number;
  slot: (i: number) => { p: Vector3; s: number };
  focus: { p: Vector3; s: number }; real: { p: Vector3; s: number }; dec: { p: Vector3; s: number };
  rec: (k: number) => Vector3; recS: number; style: "full" | "strip" | "tile";
  gate: Vector3; gateSide: "left" | "top";
  zones: { deal: Omit<Zone, "kind" | "gate" | "gateSide">; firma: Omit<Zone, "kind" | "gate" | "gateSide"> };
  divider: [Vector3, Vector3] | null;
  bounds: { cx: number; cy: number; hw: number; hh: number };
};
export type View = { w: number; h: number; aspect: number; wide: boolean };
export type FrameCtx = { step: number; t: number; dt: number; still: boolean };
export type CheckOptions = {
  root: Group;
  camera: PerspectiveCamera;
  gl: WebGLRenderer;
  data: StoryData;
  // fonts used on the canvas textures (CSS font-family lists)
  fonts?: { sans: string; mono: string };
  // landing: the backdrop element is blurred and dimmed while the scene is in the background
  setBackdrop?: (bg: number) => void;
};
type C2D = CanvasRenderingContext2D;
type Cv = HTMLCanvasElement;
type RecState = "sealed" | "verified" | "forged" | "broken";

// One calm composition, nothing behind it: the X-ray box (scores, reality, decision) and, beside it,
// the FIRMA chain that each score, the outcome and the decision are sealed into as they happen.
const GOLD = new Color("#d9a34a");
const IDLE = new Color("#6f7b90");
const OK = new Color("#46b876"), BAD = new Color("#ef5a4c"), REAL = new Color("#c9d2e3");
const SLAB = { w: 2.4, h: 0.14, d: 1.6, gap: 0.42 };
const REC = { w: 3.0, h: 0.78 };

function xrayMaterial(color: Color, opacity = 1) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: opacity }, uScanY: { value: 99 }, uScan: { value: 0 }, uGrid: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vWy;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec4 mv = viewMatrix * wp;
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vUv = uv; vWy = wp.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uScanY; uniform float uScan; uniform float uGrid;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vWy;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        vec2 g = abs(fract(vUv * vec2(12.0, 8.0)) - 0.5);
        float grid = (1.0 - smoothstep(0.0, 0.04, min(g.x, g.y))) * 0.18 * uGrid;
        float scan = exp(-pow((vWy - uScanY) * 7.0, 2.0)) * uScan;
        gl_FragColor = vec4(uColor * (0.55 + f + scan), uOpacity * (0.07 + 0.75 * f + grid + scan * 0.9));
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  });
}

const canvasOf = (w: number, h: number): Cv => Object.assign(document.createElement("canvas"), { width: w, height: h });
function brackets(c: C2D, W: number, H: number, col: string, k = 54, m = 26, lw = 6) {
  c.strokeStyle = col; c.lineWidth = lw;
  c.beginPath();
  c.moveTo(m, m + k); c.lineTo(m, m); c.lineTo(m + k, m);
  c.moveTo(W - m, H - m - k); c.lineTo(W - m, H - m); c.lineTo(W - m - k, H - m);
  c.stroke();
}
function fitFont(c: C2D, text: string, max: number, size: number, family: string, weight = 700) {
  do { c.font = `${weight} ${size}px ${family}`; size -= 2; } while (c.measureText(text).width > max && size > 24);
}

// Score layer: the score as the CRM held it; checked face adds Firma's verdict against reality.
function drawLayer(cv: Cv, s: Score, i: number, checked: boolean) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const col = checked ? (s.check.ok ? "#46b876" : "#ef5a4c") : s.color;
  brackets(c, W, H, col);
  c.fillStyle = "#94a0b4"; c.font = `600 36px ${F.mono}`;
  c.fillText(`${String(i + 1).padStart(2, "0")}  ${s.kicker.toUpperCase()}`, 70, 108);
  c.fillStyle = checked && !s.check.ok ? "#7b8496" : "#e7eaf0";
  fitFont(c, s.label, W - 140, 86, F.sans);
  c.fillText(s.label, 66, 208);
  // the score as a level, not a number
  c.fillStyle = "#1f2735"; c.fillRect(70, 248, W - 140, 30);
  c.fillStyle = s.color; c.fillRect(70, 248, (W - 140) * s.level, 30);
  if (checked) {
    c.fillStyle = s.check.ok ? "rgba(70,184,118,0.16)" : "rgba(239,90,76,0.14)";
    c.fillRect(56, 318, W - 112, 100);
    c.fillStyle = col;
    fitFont(c, s.check.text, W - 170, 48, F.mono);
    c.fillText(s.check.text, 80, 386);
    if (!s.check.ok) crack(c, W, H, i);
  } else {
    c.fillStyle = "#5c6678"; c.font = `500 32px ${F.mono}`;
    c.fillText(s.source, 72, 372);
  }
}

function drawReality(cv: Cv, r: Reality) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "rgba(201,210,227,0.07)"; c.fillRect(20, 20, W - 40, H - 40);
  brackets(c, W, H, "#c9d2e3");
  c.fillStyle = "#c9d2e3"; c.font = `700 36px ${F.mono}`;
  c.fillText(`REALITY · ${r.kicker.toUpperCase()}`, 70, 108);
  c.fillStyle = "#f2f4f8"; c.font = `700 140px ${F.sans}`;
  c.fillText(r.label, 64, 262);
  c.fillStyle = "#94a0b4";
  fitFont(c, r.note, W - 150, 36, F.sans, 500);
  c.fillText(r.note, 72, 372);
}

// A deterministic jagged crack across a face (seeded, so it is the same crack every time).
function crack(c: C2D, W: number, H: number, seed: number) {
  let r = 9301 * (seed + 7);
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.save();
  c.strokeStyle = "rgba(239,90,76,0.85)"; c.lineWidth = 5; c.lineJoin = "miter";
  c.beginPath();
  let x = W * (0.55 + rnd() * 0.2), y = 18;
  c.moveTo(x, y);
  while (y < H - 20) { x += (rnd() - 0.5) * 90; y += 30 + rnd() * 40; c.lineTo(x, Math.min(y, H - 20)); }
  c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(W * 0.62, H * 0.42); c.lineTo(W * 0.78, H * 0.5); c.lineTo(W * 0.86, H * 0.47); c.stroke();
  c.restore();
}

// The same plate once the result is in: what really happened, in its colour.
function drawOutcome(cv: Cv, r: Reality) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const won = r.result === "won", col = won ? "#46b876" : "#ef5a4c";
  c.clearRect(0, 0, W, H);
  c.fillStyle = won ? "rgba(70,184,118,0.12)" : "rgba(239,90,76,0.12)"; c.fillRect(20, 20, W - 40, H - 40);
  brackets(c, W, H, col);
  c.fillStyle = col; c.font = `700 36px ${F.mono}`;
  c.fillText(`REALITY · ${r.kicker.toUpperCase()}`, 70, 108);
  c.fillStyle = "#f2f4f8";
  fitFont(c, `Deal ${r.result}`, W - 140, 140, F.sans);
  c.fillText(`Deal ${r.result}`, 64, 262);
  c.fillStyle = col; c.font = `600 34px ${F.mono}`;
  c.fillText(won ? "✓ CLOSED WON" : "✕ CLOSED LOST", 72, 372);
}

// The rubber stamp that slams onto the box: WON or LOST, inked, slightly worn.
function drawStamp(cv: Cv, result: string) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const won = result === "won", col = won ? "#4fd08a" : "#ff5f50";
  // the ink on its own layer, worn by knocking small flecks out of it
  const ink = Object.assign(document.createElement("canvas"), { width: W, height: H }), k = ink.getContext("2d")!;
  const rr = (g: C2D, m: number, rad: number) => { g.beginPath(); g.roundRect(m, m, W - 2 * m, H - 2 * m, rad); };
  k.strokeStyle = col; k.lineWidth = 22; rr(k, 20, 46); k.stroke();
  k.lineWidth = 7; rr(k, 52, 26); k.stroke();
  k.fillStyle = col; k.textAlign = "center"; k.textBaseline = "middle";
  k.font = `900 250px ${F.sans}`;
  k.fillText(won ? "WON" : "LOST", W / 2, H / 2 + 14);
  let r = won ? 41 : 97;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  k.globalCompositeOperation = "destination-out";
  for (let n = 0; n < 420; n++) { k.beginPath(); k.arc(rnd() * W, rnd() * H, 1 + rnd() * 4.5, 0, Math.PI * 2); k.fill(); }
  // a dark backing so the stamp reads cleanly over whatever it lands on
  c.clearRect(0, 0, W, H);
  c.fillStyle = "rgba(10,13,19,0.82)"; rr(c, 24, 44); c.fill();
  c.drawImage(ink, 0, 0);
}

// Soft radial light for the win flare, and a round spark for the burst.
function drawGlow(cv: Cv, hard = 0) {
  const c = cv.getContext("2d")!, W = cv.width;
  const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.2 + hard * 0.3, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, W, W);
}

function drawDecision(cv: Cv, decision: Decision) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  brackets(c, W, H, "#d9a34a", 40, 16, 5);
  c.fillStyle = "#d9a34a"; c.font = `600 30px ${F.mono}`;
  c.fillText("DECISION · SEALED BY FIRMA", 54, 78);
  c.fillStyle = "#e7eaf0";
  fitFont(c, decision.title, W - 110, 58, F.sans);
  c.fillText(decision.title, 50, 158);
  c.fillStyle = "#94a0b4";
  fitFont(c, decision.detail, W - 110, 32, F.sans, 500);
  c.fillText(decision.detail, 52, 212);
}

// A record in the chain: what it holds (label) and when (date). The 3D emblem sits in the left slot.
function drawRecord(cv: Cv, r: ChainRecord, state: RecState, title = r.title, hash = r.hash) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const col = { sealed: "#d9a34a", verified: "#46b876", forged: "#ef5a4c", broken: "#ef5a4c" }[state];
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#10141c"; c.fillRect(6, 6, W - 12, H - 12);
  c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(6, 6, W - 12, H - 12);
  c.fillStyle = "rgba(255,255,255,0.03)"; c.fillRect(12, 12, 130, H - 24);
  c.fillStyle = "#94a0b4"; c.font = `600 26px ${F.mono}`;
  c.fillText(`${String(r.n).padStart(2, "0")} · ${r.date.toUpperCase()}`, 170, 66);
  c.fillStyle = state === "forged" ? "#ef5a4c" : "#e7eaf0";
  fitFont(c, title, W - 210, 48, F.sans);
  c.fillText(title, 168, 132);
  c.font = `500 25px ${F.mono}`;
  c.fillStyle = state === "forged" ? "#ef5a4c" : "#5c6678";
  c.fillText(`hash ${hash}`, 170, 196);
  c.fillStyle = state === "broken" ? "#ef5a4c" : "#5c6678";
  c.fillText(state === "broken" ? `prev ${r.prev} ≠ hash of ${String(r.n - 1).padStart(2, "0")}` : `prev ${r.prev}`, 500, 196);
  c.textAlign = "right"; c.fillStyle = col; c.font = `700 24px ${F.mono}`;
  c.fillText({ sealed: `SEALED · ${r.type}`, verified: "VERIFIED", forged: "EDITED", broken: "LINK BROKEN" }[state], W - 40, 66);
  c.textAlign = "left";
}

// Phone record: one line, big title, so the whole chain fits beside the box and stays legible.
const STRIP_H = 0.42;
function drawRecordStrip(cv: Cv, r: ChainRecord, state: RecState, title = r.title) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const col = { sealed: "#d9a34a", verified: "#46b876", forged: "#ef5a4c", broken: "#ef5a4c" }[state];
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#10141c"; c.fillRect(5, 5, W - 10, H - 10);
  c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(5, 5, W - 10, H - 10);
  c.fillStyle = "#94a0b4"; c.font = `600 30px ${F.mono}`;
  c.fillText(`${String(r.n).padStart(2, "0")} · ${r.date.toUpperCase()}`, 168, 56);
  c.fillStyle = state === "forged" ? "#ef5a4c" : "#e7eaf0";
  fitFont(c, title, W - 420, 64, F.sans);
  c.fillText(title, 166, 134);
  c.textAlign = "right"; c.fillStyle = col; c.font = `700 30px ${F.mono}`;
  c.fillText({ sealed: "SEALED", verified: "VERIFIED", forged: "EDITED", broken: "LINK BROKEN" }[state], W - 34, 56);
  c.textAlign = "left";
}

// Ledger tile (layout 2): seal top-left, kind + state, title along the bottom.
function drawRecordTile(cv: Cv, r: ChainRecord, state: RecState, title = r.title) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const col = { sealed: "#d9a34a", verified: "#46b876", forged: "#ef5a4c", broken: "#ef5a4c" }[state];
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#10141c"; c.fillRect(5, 5, W - 10, H - 10);
  c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, H - 10);
  c.fillStyle = "#94a0b4"; c.font = `600 32px ${F.mono}`;
  c.fillText(`${String(r.n).padStart(2, "0")} · ${r.date.toUpperCase()}`, 196, 74);
  c.fillStyle = col; c.font = `700 30px ${F.mono}`;
  c.fillText({ sealed: "SEALED", verified: "VERIFIED", forged: "EDITED", broken: "LINK BROKEN" }[state], 196, 120);
  c.fillStyle = state === "forged" ? "#ef5a4c" : "#e7eaf0";
  fitFont(c, title, W - 70, 58, F.sans);
  c.fillText(title, 34, 300);
}

// Zone panels: the deal analysis and the FIRMA record each get their own labelled frame.
function drawZone(cv: Cv, z: Zone) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height, k = cv.width / z.w; // px per world unit
  c.clearRect(0, 0, W, H);
  const r = 26, m = 4;
  const rr = () => { c.beginPath(); c.moveTo(m + r, m); c.arcTo(W - m, m, W - m, H - m, r); c.arcTo(W - m, H - m, m, H - m, r); c.arcTo(m, H - m, m, m, r); c.arcTo(m, m, W - m, m, r); c.closePath(); };
  const firma = z.kind === "firma";
  if (z.frame !== false) {
    rr(); c.fillStyle = firma ? "rgba(26,22,14,0.55)" : "rgba(16,20,28,0.35)"; c.fill();
    c.lineWidth = 4; c.strokeStyle = firma ? "rgba(217,163,74,0.7)" : "rgba(92,102,120,0.6)";
    if (!firma) c.setLineDash([16, 12]);
    rr(); c.stroke(); c.setLineDash([]);
  }
  const hx = 34, hy = 58;
  if (firma) {
    c.fillStyle = "#d9a34a"; c.fillRect(hx, hy - 26, 26, 26);
    c.fillStyle = "#f2e6cc"; c.font = `700 40px ${F.sans}`; c.fillText("FIRMA", hx + 42, hy);
    const fw = c.measureText("FIRMA").width;
    c.fillStyle = "#94a0b4"; c.font = `500 24px ${F.mono}`;
    const sub = "tamper-proof record";
    if (hx + 70 + fw + c.measureText(sub).width <= W - 24) c.fillText(`· ${sub}`, hx + 54 + fw, hy - 2);
    else c.fillText(sub, hx + 42, hy + 34); // narrow panel: subtitle on its own line
    // the intake gate: where items from the deal side enter the record
    const gx = (z.gate.x - (z.cx - z.w / 2)) * k, gy = ((z.cy + z.h / 2) - z.gate.y) * k;
    c.fillStyle = "#d9a34a";
    c.beginPath();
    if (z.gateSide === "left") { c.moveTo(gx + 2, gy - 22); c.lineTo(gx + 30, gy); c.lineTo(gx + 2, gy + 22); }
    else { c.moveTo(gx - 22, gy + 2); c.lineTo(gx, gy + 30); c.lineTo(gx + 22, gy + 2); }
    c.closePath(); c.fill();
  } else {
    c.fillStyle = "#5c6678"; c.fillRect(hx, hy - 22, 18, 18);
    c.fillStyle = "#c3cad6"; c.font = `600 28px ${F.mono}`; c.fillText("YOUR DEAL SCORES", hx + 32, hy - 4);
  }
}

// The copy of an item that travels from the box into the chain.
function drawToken(cv: Cv, text: string) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const r = H / 2 - 6;
  c.beginPath(); c.moveTo(6 + r, 6); c.arcTo(W - 6, 6, W - 6, H - 6, r); c.arcTo(W - 6, H - 6, 6, H - 6, r);
  c.arcTo(6, H - 6, 6, 6, r); c.arcTo(6, 6, W - 6, 6, r); c.closePath();
  c.fillStyle = "#1a160e"; c.fill();
  c.lineWidth = 5; c.strokeStyle = "#d9a34a"; c.stroke();
  c.fillStyle = "#d9a34a"; c.beginPath(); c.arc(6 + r, H / 2, 14, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#f2e6cc";
  fitFont(c, text, W - 2 * r - 60, 52, F.mono, 600);
  c.fillText(text, 6 + r + 34, H / 2 + 17);
}

// Emblem art, drawn light so the material colour can tint it gold / green / red.
function drawWax(cv: Cv) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  c.clearRect(0, 0, W, H);
  c.beginPath();
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * Math.PI * 2, rr = W * 0.46 + Math.sin(t * 9) * W * 0.018 + Math.sin(t * 5 + 1) * W * 0.012;
    c.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr);
  }
  c.closePath(); c.fillStyle = "#f3e2b8"; c.fill();
  c.strokeStyle = "#c9b081"; c.lineWidth = W * 0.03;
  c.beginPath(); c.arc(cx, cy, W * 0.33, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#b39a6c"; c.font = `700 ${W * 0.36}px ${F.sans}`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("F", cx, cy + W * 0.02);
}
function drawShield(cv: Cv) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const path = () => {
    c.beginPath();
    c.moveTo(W / 2, H * 0.04); c.lineTo(W * 0.94, H * 0.18); c.lineTo(W * 0.9, H * 0.55);
    c.quadraticCurveTo(W * 0.82, H * 0.82, W / 2, H * 0.96); c.quadraticCurveTo(W * 0.18, H * 0.82, W * 0.1, H * 0.55);
    c.lineTo(W * 0.06, H * 0.18); c.closePath();
  };
  path(); c.fillStyle = "rgba(240,236,226,0.22)"; c.fill();
  c.lineWidth = W * 0.07; c.strokeStyle = "#f0ece2"; path(); c.stroke();
  c.lineWidth = W * 0.09; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(W * 0.3, H * 0.5); c.lineTo(W * 0.45, H * 0.64); c.lineTo(W * 0.72, H * 0.34); c.stroke();
}

/**
 * One composition, always on screen: the X-ray box (left) and the FIRMA chain (right; below on phones).
 * Scroll steps: 0 landing (scene in the background), 1–3 a provider score lands and is sealed,
 * 4 the outcome arrives and is sealed, 5 Firma compares, 6 the decision is sealed, 7 verify, 8 rewrite attempt.
 */
export function createCheck({ root: stage, camera, gl, data, fonts, setBackdrop: backdrop }: CheckOptions) {
  // the deal composition lives in its own group, so the month-end pull-back can shrink it into the month
  const root = new Group();
  stage.add(root);
  const { scores, reality, decision, records, tamper } = data;
  if (fonts) Object.assign(F, fonts);
  const n = scores.length;
  const view: View = { w: 1, h: 1, aspect: 1, wide: true };
  const fov = Math.tan((camera.fov * Math.PI) / 360);
  const aniso = gl.capabilities.getMaxAnisotropy();
  const textures: Texture[] = [];
  const texOf = (cv: Cv) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = aniso; textures.push(t); return t; };
  const lineOf = (color: Color) => {
    const l = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), new LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    root.add(l);
    return l;
  };
  const setLine = (l: Line | LineSegments, a: Vector3, b: Vector3) => {
    (l.geometry.attributes.position.array as Float32Array).set([a.x, a.y, a.z, b.x, b.y, b.z]);
    l.geometry.attributes.position.needsUpdate = true;
    l.geometry.computeBoundingSphere();
  };
  const faceMesh = (geo: BufferGeometry, cv: Cv): Mesh<BufferGeometry, MeshBasicMaterial> => new Mesh(geo, new MeshBasicMaterial({ map: texOf(cv), transparent: true, opacity: 0, depthWrite: false }));

  // ---- the box ----
  const core = new Group();
  const coreFill = new Mesh(new IcosahedronGeometry(0.4, 3), xrayMaterial(GOLD, 1.2));
  coreFill.material.uniforms.uGrid.value = 0;
  const coreWire = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.44, 1)),
    new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
  core.add(coreFill, coreWire);
  root.add(core);
  const shell = new LineSegments(new EdgesGeometry(new BoxGeometry(2.9, n * SLAB.gap + 0.55, 2.0)),
    new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55, depthWrite: false }));
  root.add(shell);
  const scanMat = new ShaderMaterial({
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uOpacity; varying vec2 vUv;
      void main(){ vec2 d=abs(vUv-0.5)*2.0; float e=1.0-smoothstep(0.75,1.0,max(d.x,d.y));
      gl_FragColor=vec4(vec3(0.85,0.64,0.29)*1.4, e*0.22*uOpacity);} `,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  });
  const scan = new Mesh(new PlaneGeometry(2.7, 1.8), scanMat);
  scan.rotation.x = -Math.PI / 2;
  root.add(scan);

  const slabGeo = new BoxGeometry(SLAB.w, SLAB.h, SLAB.d);
  const slabEdges = new EdgesGeometry(slabGeo);
  const labelGeo = new PlaneGeometry(SLAB.w * 0.96, SLAB.d * 0.96);
  const makeSlab = (color: Color) => {
    const g = new Group();
    g.rotation.order = "YXZ";
    const fill = new Mesh(slabGeo, xrayMaterial(color, 0.9));
    const edges = new LineSegments(slabEdges, new LineBasicMaterial({ color: color.clone(), transparent: true, opacity: 0.8, depthWrite: false }));
    g.add(fill, edges);
    root.add(g);
    return { g, fill, edges };
  };
  const onTop = <T extends Mesh>(m: T, dy = 0): T => { m.rotation.x = -Math.PI / 2; m.position.y = SLAB.h / 2 + 0.005 + dy; m.renderOrder = 2; return m; };
  const layers = scores.map((s, i) => {
    const sl = makeSlab(IDLE);
    const cvA = canvasOf(768, 512), cvB = canvasOf(768, 512);
    const plain = onTop(faceMesh(labelGeo, cvA)), checkedFace = onTop(faceMesh(labelGeo, cvB), 0.002);
    sl.g.add(plain, checkedFace);
    return { ...sl, s, i, cvA, cvB, plain, checkedFace, color: new Color(s.color), stackY: ((n - 1) / 2 - i) * SLAB.gap, line: lineOf(s.check.ok ? OK : BAD) };
  });
  const real = makeSlab(REAL);
  const realCv = canvasOf(768, 512);
  const realFace = onTop(faceMesh(labelGeo, realCv));
  real.g.add(realFace);
  const decCv = canvasOf(1200, 260);
  const decFace = faceMesh(new PlaneGeometry(4.2, 0.91), decCv);
  root.add(decFace);

  // ---- the outcome impact: about a second of drama when the result lands, then calm again ----
  const resCv = canvasOf(768, 512);
  const resFace = onTop(faceMesh(labelGeo, resCv), 0.002); // the plate once the result is known
  real.g.add(resFace);
  const fx = new Group();
  root.add(fx);
  const addFx = (geo: BufferGeometry, mat: MeshBasicMaterial): Fx => { const m = new Mesh(geo, mat); m.visible = false; fx.add(m); return m; };
  const glowMat = (cv: Cv) => new MeshBasicMaterial({ map: texOf(cv), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const rings = [0, 1, 2].map(() => addFx(new RingGeometry(0.95, 1, 96),
    new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })));
  const glowCv = canvasOf(256, 256), sparkCv = canvasOf(64, 64);
  drawGlow(glowCv); drawGlow(sparkCv, 1);
  const flare = addFx(new PlaneGeometry(1, 1), glowMat(glowCv));
  const NP = 170;
  const sparkPos = new Float32Array(NP * 3), sparkCol = new Float32Array(NP * 3), sparkVel = new Float32Array(NP * 3);
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new BufferAttribute(sparkCol, 3));
  const sparks = new Points(sparkGeo, new PointsMaterial({ size: 0.075, map: texOf(sparkCv), vertexColors: true, transparent: true, opacity: 0,
    blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  sparks.visible = false;
  fx.add(sparks);
  const stampCv = canvasOf(1024, 420);
  const stamp = new Mesh(new PlaneGeometry(2.3, 0.94), new MeshBasicMaterial({ map: texOf(stampCv), transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  stamp.renderOrder = 10;
  stamp.visible = false;
  root.add(stamp);
  // on a loss the box splits into four pieces that drift apart, then knit back together
  const BOX = { w: 2.9, h: n * SLAB.gap + 0.55, d: 2.0 };
  const shards = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], k) => {
    const geo = new BoxGeometry(BOX.w / 2, BOX.h / 2, BOX.d);
    geo.translate((sx * BOX.w) / 4, (sy * BOX.h) / 4, 0);
    const m = new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: BAD, transparent: true, opacity: 0, depthWrite: false }));
    m.userData = { dir: new Vector3(sx, sy * 0.75, k % 2 ? 0.35 : -0.25).normalize(), spin: new Vector3(sy * 0.35, sx * 0.3, (k - 1.5) * 0.18) };
    m.visible = false;
    root.add(m);
    return m;
  });
  function seedSparks(won: boolean) {
    const a = won ? [new Color("#ffd27a"), new Color("#7ef0a8"), new Color("#ffffff")] : [new Color("#ff6a5a"), new Color("#8a93a6"), new Color("#c24236")];
    for (let i = 0; i < NP; i++) {
      // mostly outward in the screen plane, a little toward the viewer
      const th = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * 0.7;
      const sp = won ? 1.4 + Math.random() * 2.6 : 0.5 + Math.random() * 1.1;
      sparkVel.set([Math.cos(th) * sp, Math.sin(th) * sp * 0.85, el * sp], i * 3);
      const col = a[i % 3];
      sparkCol.set([col.r, col.g, col.b], i * 3);
    }
    sparkGeo.attributes.color.needsUpdate = true;
  }

  // ---- the chain ----
  const recGeo = new PlaneGeometry(REC.w, REC.h);
  const stripGeo = new PlaneGeometry(REC.w, STRIP_H);
  const TILE = { w: 1.0, h: 0.62 };
  const tileGeo = new PlaneGeometry(TILE.w, TILE.h);
  const recBox = new BoxGeometry(REC.w, REC.h, 0.06);
  const STATES: RecState[] = ["sealed", "verified", "forged", "broken"];
  const EMB_X = -REC.w / 2 + 0.19; // emblem slot on the record's left
  const waxCv = canvasOf(256, 256), shieldCv = canvasOf(220, 264);
  drawWax(waxCv); drawShield(shieldCv);
  const waxTex = texOf(waxCv), shieldTex = texOf(shieldCv);

  // A: padlock — shackle clicks down when sealed, springs open when tampered
  function padlock(): Emblem {
    const g = new Group();
    const mat = new MeshBasicMaterial({ color: GOLD.clone(), transparent: true });
    const body = new Mesh(new BoxGeometry(0.2, 0.16, 0.05), mat);
    const hole = new Mesh(new CircleGeometry(0.022, 16), new MeshBasicMaterial({ color: "#10141c", transparent: true }));
    hole.position.set(0, -0.005, 0.026);
    const shackle = new Mesh(new TorusGeometry(0.062, 0.016, 8, 24, Math.PI), mat);
    g.add(body, hole, shackle);
    return {
      g,
      set(lock, ver, brk, alpha) {
        const shut = ease(clamp01(lock));
        shackle.position.y = 0.08 + lerp(0.075, 0, shut) + brk * 0.09;
        shackle.position.x = brk * 0.035;
        shackle.rotation.z = brk * 0.55;
        body.scale.setScalar(1 + Math.sin(Math.PI * clamp01((lock - 0.75) * 4)) * 0.12); // the click
        mat.color.copy(GOLD).lerp(OK, ver).lerp(BAD, brk);
        mat.opacity = alpha; hole.material.opacity = alpha;
      },
    };
  }
  // B: wax seal — stamped down when sealed, cracks in two when tampered
  function wax(): Emblem {
    const g = new Group();
    const halves = [0, 1].map((side) => {
      const m = new Mesh(new CircleGeometry(0.15, 40, side ? -Math.PI / 2 : Math.PI / 2, Math.PI),
        new MeshBasicMaterial({ map: waxTex, color: GOLD.clone(), transparent: true }));
      g.add(m);
      return m;
    });
    return {
      g,
      set(lock, ver, brk, alpha) {
        const press = ease(clamp01(lock));
        g.scale.setScalar(lerp(1.9, 1, press) * (1 + Math.sin(Math.PI * clamp01((lock - 0.7) * 3.3)) * -0.08));
        g.position.z = lerp(0.45, 0.05, press);
        halves.forEach((h, i) => {
          const dir = i ? 1 : -1;
          h.position.x = dir * brk * 0.05; h.position.y = -brk * 0.02 * (i ? 1 : -1);
          h.rotation.z = dir * brk * -0.28;
          h.material.color.copy(GOLD).lerp(OK, ver * 0.55).lerp(BAD, brk);
          h.material.opacity = alpha * clamp01(lock * 2.5);
        });
      },
    };
  }
  // C: shield — rises and glows when verified, splits when tampered (inside a vault column, below)
  function shield(): Emblem {
    const g = new Group();
    const W = 0.26, H = 0.31;
    const halves = [0, 1].map((side) => {
      const geo = new PlaneGeometry(W / 2, H);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + side * 0.5);
      const m = new Mesh(geo, new MeshBasicMaterial({ map: shieldTex, color: GOLD.clone(), transparent: true }));
      m.position.x = (side ? 1 : -1) * W / 4;
      g.add(m);
      return m;
    });
    const glow = new Mesh(new CircleGeometry(0.18, 32), new MeshBasicMaterial({ color: OK.clone(), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    glow.position.z = -0.01;
    g.add(glow);
    return {
      g,
      set(lock, ver, brk, alpha) {
        const up = ease(clamp01(lock));
        g.scale.setScalar(lerp(0.4, 1, up) * (1 + ver * 0.08));
        halves.forEach((h, i) => {
          const dir = i ? 1 : -1;
          h.position.x = dir * (W / 4 + brk * 0.06);
          h.rotation.z = dir * brk * -0.35;
          h.material.color.copy(GOLD).lerp(OK, ver).lerp(BAD, brk);
          h.material.opacity = alpha * up;
        });
        glow.material.color.copy(OK).lerp(BAD, brk);
        glow.material.opacity = alpha * (ver * 0.35 + brk * 0.25);
      },
    };
  }
  const makers: Record<string, () => Emblem> = { a: padlock, b: wax, c: shield };
  let treatment = "b";

  const recs = records.map((r) => {
    const g = new Group();
    root.add(g);
    const body = new Mesh(recBox, xrayMaterial(GOLD, 0));
    body.material.uniforms.uGrid.value = 0;
    g.add(body);
    type Face = { cv: Cv; m: Mesh<BufferGeometry, MeshBasicMaterial> };
    const faces = {} as Record<RecState, Face>;
    const strips = {} as Record<RecState, Face>, tiles = {} as Record<RecState, Face>;
    STATES.forEach((st) => {
      const tc = canvasOf(600, 372);
      tiles[st] = { cv: tc, m: faceMesh(tileGeo, tc) };
      tiles[st].m.position.z = 0.032;
      g.add(tiles[st].m);
      const cv = canvasOf(1200, 312);
      faces[st] = { cv, m: faceMesh(recGeo, cv) };
      faces[st].m.position.z = 0.032;
      const sc = canvasOf(1200, 168);
      strips[st] = { cv: sc, m: faceMesh(stripGeo, sc) };
      strips[st].m.position.z = 0.032;
      g.add(faces[st].m, strips[st].m);
    });
    const emblems: Record<string, Emblem> = {};
    Object.entries(makers).forEach(([k, make]) => {
      const e = make();
      e.g.position.set(EMB_X, 0, 0.07);
      g.add(e.g);
      emblems[k] = e;
    });
    // the empty link waiting for this record
    const ghostPts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new Vector3((x * REC.w) / 2, (y * REC.h) / 2, 0));
    const ghost = new LineLoop(new BufferGeometry().setFromPoints(ghostPts), new LineDashedMaterial({ color: GOLD, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0, depthWrite: false }));
    ghost.computeLineDistances();
    root.add(ghost);
    // the travelling copy + its path
    const tokCv = canvasOf(1200, 170);
    const token = faceMesh(new PlaneGeometry(2.6, 0.37), tokCv);
    token.renderOrder = 5;
    root.add(token);
    const N = 48;
    const trail = new Line(new BufferGeometry().setFromPoints(Array.from({ length: N }, () => new Vector3())),
      new LineDashedMaterial({ color: GOLD, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0, depthWrite: false }));
    root.add(trail);
    return { r, g, body, faces, strips, tiles, emblems, ghost, token, tokCv, trail, N, vis: 0, gatePass: 0 };
  });
  const links = records.slice(1).map(() => {
    const line = lineOf(GOLD);
    const node = new Mesh(new OctahedronGeometry(0.06, 0), new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
    root.add(node);
    return { line, node };
  });
  // zone panels (behind everything), divider between zones, and the intake gate's flash
  const zoneMesh = () => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    m.renderOrder = -1;
    root.add(m);
    return m;
  };
  const zones = { deal: zoneMesh(), firma: zoneMesh() };
  const divider = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
    new LineDashedMaterial({ color: "#5c6678", dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0, depthWrite: false }));
  root.add(divider);
  const gateFlash = new Mesh(new CircleGeometry(0.08, 32), new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  root.add(gateFlash);

  // C only: the vault column around the chain
  const vault = new LineSegments(new EdgesGeometry(new BoxGeometry(1, 1, 1)), new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false }));
  root.add(vault);

  // Firma's side of the view, in one group: at month end it steps out of the deal (the month's deals are plain
  // cards; the one Firma record is the report), and it is back for verify and the rewrite attempt.
  const firmaSide = new Group();
  root.add(firmaSide);
  firmaSide.add(...recs.flatMap((rc) => [rc.g, rc.ghost, rc.token, rc.trail]), ...links.flatMap((l) => [l.line, l.node]), zones.firma, divider, gateFlash, vault);
  const fadeFirma = (f: number) => {
    firmaSide.visible = f > 0.005;
    if (f >= 0.999 || !firmaSide.visible) return;
    firmaSide.traverse((o) => {
      const mat = (o as Mesh).material as (MeshBasicMaterial | ShaderMaterial) | undefined;
      if (!mat) return;
      if ("uniforms" in mat && mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value *= f;
      else mat.opacity *= f;
    });
  };

  const redraw = () => {
    month.redraw();
    drawWax(waxCv); waxTex.needsUpdate = true; // the seal's letter needs the web font too
    layers.forEach((l) => {
      drawLayer(l.cvA, l.s, l.i, false); l.plain.material.map!.needsUpdate = true;
      drawLayer(l.cvB, l.s, l.i, true); l.checkedFace.material.map!.needsUpdate = true;
    });
    drawReality(realCv, reality); realFace.material.map!.needsUpdate = true;
    drawOutcome(resCv, reality); resFace.material.map!.needsUpdate = true;
    drawStamp(stampCv, reality.result); stamp.material.map!.needsUpdate = true;
    layers.forEach((l) => l.line.material.color.copy(l.s.check.ok ? OK : BAD));
    drawDecision(decCv, decision); decFace.material.map!.needsUpdate = true;
    recs.forEach((rc) => STATES.forEach((st) => {
      const forged = st === "forged";
      drawRecord(rc.faces[st].cv, rc.r, st, forged ? tamper.title : rc.r.title, forged ? tamper.hash : rc.r.hash);
      rc.faces[st].m.material.map!.needsUpdate = true;
      drawRecordStrip(rc.strips[st].cv, rc.r, st, forged ? tamper.title : rc.r.title);
      rc.strips[st].m.material.map!.needsUpdate = true;
      drawRecordTile(rc.tiles[st].cv, rc.r, st, forged ? tamper.title : rc.r.title);
      rc.tiles[st].m.material.map!.needsUpdate = true;
    }));
    recs.forEach((rc) => { drawToken(rc.tokCv, rc.r.token); rc.token.material.map!.needsUpdate = true; });
  };
  // month end: the rest of the month's deals, and the report they are gathered into
  let monthStep = 0;
  const month = createMonth({ parent: stage, deal: root, data, fonts: F, texOf, makeSeal: wax, glass: xrayMaterial });
  // hero: a network of cores behind the headline; the featured deal is one of them and comes forward
  const hero = createHero({ parent: stage, deal: root, glass: xrayMaterial, waxTex });
  redraw();
  let alive = true;
  Promise.all([document.fonts?.load(`700 150px ${F.sans}`), document.fonts?.load(`600 38px ${F.mono}`)]).catch(() => {}).then(() => alive && redraw());

  // ---- layouts: three ways of separating the deal analysis from the FIRMA record ----
  // Each preset gives box centre (bc) and scale (box), where score layers park (slot), the focus spot,
  // outcome plate (real), decision plate (dec), record slots (rec) and style, the intake gate, the zones,
  // and the content bounds the camera frames.
  const V = (x: number, y: number, z = 0) => new Vector3(x, y, z);
  const DIMS = { full: { w: REC.w, h: REC.h }, strip: { w: REC.w, h: STRIP_H }, tile: { w: 1.0, h: 0.62 } };
  const LAYOUTS: Record<number, { wide: Layout; narrow: Layout }> = {
    1: {
      wide: {
        bc: V(-0.3, 0.25), box: 0.72,
        slot: (i: number) => ({ p: V(-0.3 + (i - 1) * 1.1, 1.82, -0.2), s: 0.36 }),
        focus: { p: V(-0.3, 0.2, 1.2), s: 0.6 }, real: { p: V(-0.3, -0.05, 0.95), s: 0.42 }, dec: { p: V(-0.3, -1.25, 0.5), s: 0.48 },
        rec: (k: number) => V(3.4, 1.72 - k * 0.66, 0.2), recS: 0.68, style: "full",
        gate: V(2.15, 0.3, 0.2), gateSide: "left",
        zones: { deal: { cx: -0.3, cy: 0.12, w: 4.2, h: 5.0 }, firma: { cx: 3.4, cy: 0.12, w: 2.5, h: 5.0 } },
        divider: [V(1.98, -2.2), V(1.98, 2.45)],
        bounds: { cx: 1.12, cy: 0.12, hw: 3.6, hh: 2.6 },
      },
      narrow: {
        bc: V(0, 0.2), box: 0.68,
        slot: (i: number) => ({ p: V((i - 1) * 1.05, 1.5, -0.2), s: 0.34 }),
        focus: { p: V(0, 0.2, 1.2), s: 0.58 }, real: { p: V(0, -0.05, 0.95), s: 0.42 }, dec: { p: V(0, -0.98, 0.6), s: 0.46 },
        rec: (k: number) => V(0, -2.32 - k * 0.45, 0.2), recS: 0.76, style: "strip",
        gate: V(1.2, -1.6, 0.2), gateSide: "top",
        zones: { deal: { cx: 0, cy: 0.6, w: 3.5, h: 3.46 }, firma: { cx: 0, cy: -3.2, w: 3.5, h: 3.2 } },
        divider: null,
        bounds: { cx: 0, cy: -0.97, hw: 1.8, hh: 3.38 },
      },
    },
    2: {
      wide: {
        bc: V(-0.75, 0.95), box: 0.62,
        slot: (i: number) => ({ p: V(-3.05, 1.72 - i * 0.62, -0.2), s: 0.27 }),
        focus: { p: V(-0.75, 1.0, 1.1), s: 0.5 }, real: { p: V(-0.75, 0.78, 0.95), s: 0.36 }, dec: { p: V(2.25, 0.95, 0.5), s: 0.46 },
        rec: (k: number) => V(-3.1 + k * 1.24, -1.62, 0.2), recS: 0.95, style: "tile",
        gate: V(-0.75, -0.78, 0.2), gateSide: "top",
        zones: { deal: { cx: 0, cy: 1.12, w: 7.6, h: 2.9 }, firma: { cx: 0, cy: -1.5, w: 7.6, h: 1.55 } },
        divider: [V(-3.8, -0.52), V(3.8, -0.52)],
        bounds: { cx: 0, cy: -0.05, hw: 3.85, hh: 2.6 },
      },
      narrow: {
        bc: V(0, 0.25), box: 0.66,
        slot: (i: number) => ({ p: V((i - 1) * 1.05, 1.5, -0.2), s: 0.34 }),
        focus: { p: V(0, 0.2, 1.2), s: 0.58 }, real: { p: V(0, 0.0, 0.95), s: 0.42 }, dec: { p: V(0, -0.95, 0.6), s: 0.46 },
        rec: (k: number) => V(((k % 3) - 1) * 1.12, -2.44 - Math.floor(k / 3) * 0.76, 0.2), recS: 1.0, style: "tile",
        gate: V(1.2, -1.6, 0.2), gateSide: "top",
        zones: { deal: { cx: 0, cy: 0.6, w: 3.5, h: 3.46 }, firma: { cx: 0, cy: -2.78, w: 3.5, h: 2.4 } },
        divider: null,
        bounds: { cx: 0, cy: -0.77, hw: 1.8, hh: 3.08 },
      },
    },
    3: {
      wide: {
        bc: V(-0.2, 0.1), box: 0.9,
        slot: (i: number) => ({ p: V(-0.2 + (i - 1) * 1.35, 1.95, -0.2), s: 0.42 }),
        focus: { p: V(-0.2, 0.1, 1.4), s: 0.72 }, real: { p: V(-0.2, -0.25, 1.1), s: 0.52 }, dec: { p: V(-0.2, -1.5, 0.6), s: 0.6 },
        rec: (k: number) => V(3.75, 1.86 - k * 0.37, 0.2), recS: 0.6, style: "strip",
        gate: V(2.6, 1.0, 0.2), gateSide: "left",
        zones: { deal: { cx: -0.2, cy: 0.35, w: 4.6, h: 4.9, frame: false }, firma: { cx: 3.75, cy: 1.2, w: 2.3, h: 2.85, compact: true } },
        divider: null,
        bounds: { cx: 1.3, cy: 0.35, hw: 3.6, hh: 2.5 },
      },
      narrow: {
        bc: V(0, 0.25), box: 0.78,
        slot: (i: number) => ({ p: V((i - 1) * 1.08, 1.62, -0.2), s: 0.36 }),
        focus: { p: V(0, 0.2, 1.2), s: 0.62 }, real: { p: V(0, -0.02, 0.95), s: 0.46 }, dec: { p: V(0, -1.1, 0.6), s: 0.5 },
        rec: (k: number) => V(0.35, -2.42 - k * 0.3, 0.2), recS: 0.6, style: "strip",
        gate: V(1.15, -1.52, 0.2), gateSide: "top",
        zones: { deal: { cx: 0, cy: 0.58, w: 3.5, h: 3.66, frame: false }, firma: { cx: 0.35, cy: -2.87, w: 2.25, h: 2.7, compact: true } },
        divider: null,
        bounds: { cx: 0, cy: -0.8, hw: 1.8, hh: 3.23 },
      },
    },
  };
  let layoutId = 1, drawnZones = "";

  // When each record is sealed: [start, end] of its flight, in scroll steps.
  const flights: ([number, number] | null)[] = [null, [0.3, 0.97], [1.3, 1.97], [2.3, 2.97], [3.62, 3.98], [5.4, 5.97]]; // the outcome leaves for the chain only after it has hit the box
  const TRAVEL = 0.68; // share of each flight spent travelling; the rest is the lock

  function placeCamera(bg: number, P: Layout) {
    const { w, h, aspect, wide } = view;
    const B = P.bounds;
    let dist, ox, oy;
    if (wide) {
      // content framed in the right ~53% of the screen, the large story text on the left
      const fg = Math.max(B.hh / (fov * 0.84), B.hw / (fov * aspect * 0.53));
      dist = lerp(fg * 0.8, fg, bg);
      ox = lerp(0, -w * 0.19, bg); oy = 0;
    } else {
      // content in the top half of the screen (below the header), above the story text
      const fg = Math.max(B.hh / (fov * 0.47), B.hw / (fov * aspect * 0.94));
      dist = lerp(fg * 0.9, fg, bg);
      ox = 0; oy = lerp(h * 0.04, h * 0.145, bg);
    }
    camera.aspect = aspect;
    camera.setViewOffset(w, h, ox, oy, w, h);
    camera.position.set(B.cx, B.cy + dist * 0.1, dist);
    camera.lookAt(B.cx, B.cy, 0);
    camera.updateProjectionMatrix();
  }

  function placeZones(P: Layout) {
    const key = `${layoutId}-${view.wide}`;
    if (key === drawnZones) return;
    drawnZones = key;
    for (const kind of ["deal", "firma"]) {
      const z: Zone = { ...P.zones[kind as "deal" | "firma"], kind, gate: P.gate, gateSide: P.gateSide };
      const m = zones[kind as "deal" | "firma"];
      const cv = canvasOf(Math.min(2048, Math.round(z.w * 170)), Math.min(2048, Math.round(z.h * 170)));
      drawZone(cv, z);
      m.material.map?.dispose();
      m.material.map = texOf(cv);
      m.material.needsUpdate = true;
      m.position.set(z.cx, z.cy, 0); // same depth as the records, so they sit inside their panel
      m.scale.set(z.w, z.h, 1);
    }
    if (P.divider) setLine(divider, P.divider[0].clone().setZ(0), P.divider[1].clone().setZ(0)), divider.computeLineDistances();
  }

  // landing: the canvas is a soft, dim background; it sharpens as it comes forward
  let lastBg = -1;
  function setBackdrop(bg: number) {
    if (Math.abs(bg - lastBg) < 0.004) return;
    lastBg = bg;
    backdrop?.(bg);
  }

  // Outcome impact timeline (in seconds, not scroll): it fires once as the scroll carries the result onto
  // the box, so it always plays at the same pace, and re-arms when you scroll back above it.
  const HIT = 3.5, PRE = 0.16; // the result lands at scroll step 3.5; a short held breath, then the hit
  let hitAt = -1, judgedAt = -1, booted = false;
  const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
  const easeBack = (x: number) => { x = clamp01(x) - 1; return 1 + 2.9 * x * x * x + 1.9 * x * x; };
  const WHITE = new Color("#ffffff"), WIN = new Color("#7ef0a8");

  const tmp = new Vector3(), tmpC = new Color();
  // Story steps 0–8 are the deal's own timeline (hero network, scores, outcome, judging, decision, verify,
  // rewrite attempt); 8–10 are the month end, where the deal waits in its last state while the report forms.
  function update({ step: s, t, dt, still }: FrameCtx) {
    const step = Math.min(s, 8);
    const P = LAYOUTS[layoutId][view.wide ? "wide" : "narrow"];
    const BS = P.box, BC = P.bc;
    const D = DIMS[P.style];
    placeZones(P);
    const bg = ease(clamp01(step / 0.85)); // 0 = background, 1 = foreground subject
    const open = clamp01(step * 1.6);
    const rl = phase(step, 3.1, 3.5);
    const cmp = phase(step, 4.35, 5);
    const dec = phase(step, 5.1, 5.45);
    const tp = phase(step, 7.35, 8);
    const fl = flights.map((f) => (f ? clamp01((step - f[0]) / (f[1] - f[0])) : 1));
    // ---- outcome impact clock ----
    const now = performance.now() / 1000;
    const won = reality.result === "won";
    if (!booted) { booted = true; if (step >= HIT) hitAt = now - 10; if (cmp > 0.3) judgedAt = now - 10; } // loaded mid-story: no replay
    if (step >= HIT && hitAt < 0) { hitAt = now; seedSparks(won); }
    if (step < HIT - 0.2) hitAt = -1;
    if (cmp > 0.3 && judgedAt < 0) judgedAt = now;
    if (cmp < 0.15) judgedAt = -1;
    const landed = hitAt >= 0;
    const k = landed ? now - hitAt - (still ? 0 : PRE) : -1; // seconds since the hit; negative while holding the breath
    const boom = landed && k >= 0;
    const charge = landed ? (boom ? 0 : 1) : phase(step, 3.2, HIT); // build-up as the result comes in
    const jt = judgedAt >= 0 ? now - judgedAt : -1;
    const jolt = boom && !still ? (won ? 0.05 : 0.075) * BS * Math.exp(-k * 10) : 0;
    setBackdrop(bg);
    placeCamera(bg, P);
    // zones fade in as the scene comes forward; the divider separates them
    zones.deal.material.opacity = bg;
    zones.firma.material.opacity = Math.max(0.35, bg);
    divider.visible = !!P.divider;
    divider.material.opacity = 0.7 * bg;

    stage.rotation.y = still ? 0 : Math.sin(t * 0.25) * 0.05;
    stage.position.y = still ? 0 : Math.sin(t * 0.6) * 0.04;
    stage.position.x = jolt * Math.sin(k * 70);
    stage.position.y += jolt * 0.6 * Math.cos(k * 55);

    // box
    shell.scale.setScalar(BS);
    scan.scale.setScalar(BS);
    shell.position.copy(BC);
    // the hit: a win flares the box bright, a loss splits it into pieces; afterwards a faint tint remains
    const flash = boom && !still ? Math.exp(-k * 3.2) : 0;
    const split = boom && !still && !won ? (k < 0.55 ? easeOut(k / 0.55) : k < 1.0 ? 1 : 1 - ease(clamp01((k - 1.0) / 0.9))) : 0;
    const shattered = boom && !still && !won && k < 1.9;
    shell.material.opacity = shattered ? 0 : Math.max(lerp(0.55, 0.25, open) + (landed ? 0.15 : 0), won ? 0.55 + 0.45 * flash : 0);
    tmpC.copy(GOLD).lerp(won ? WIN : BAD, landed ? (won ? 0.3 : 0.45) : 0).lerp(WHITE, won ? flash * 0.6 : 0);
    shell.material.color.copy(tmpC);
    shards.forEach((m) => {
      m.visible = shattered;
      if (!shattered) return;
      const { dir, spin } = m.userData;
      m.position.copy(BC).addScaledVector(dir, 0.42 * BS * split);
      m.rotation.set(spin.x * split, spin.y * split, spin.z * split);
      m.scale.setScalar(BS);
      m.material.color.copy(BAD).lerp(GOLD, clamp01((k - 1.2) / 0.7) * 0.55);
      m.material.opacity = 0.95;
    });
    scanMat.uniforms.uOpacity.value = 1 - open;
    scan.visible = open < 1 && !still;
    scan.position.set(BC.x, BC.y + Math.sin(t * 0.9) * (SLAB.gap * n * 0.5) * BS, 0);
    scan.updateMatrixWorld();
    const scanY = scan.getWorldPosition(tmp).y;

    layers.forEach((l) => {
      const a = ease(clamp01(step - l.i));
      const b = ease(clamp01(step - l.i - 1));
      const S = P.slot(l.i), F = P.focus;
      l.g.position.set(
        lerp(lerp(BC.x, F.p.x, a), S.p.x, b),
        lerp(lerp(BC.y + l.stackY * BS, F.p.y, a), S.p.y, b),
        lerp(lerp(0, F.p.z, a), S.p.z, b) + Math.sin(Math.PI * a) * 0.4 * (1 - b)
      );
      l.g.rotation.x = lerp(lerp(0, Math.PI / 2 - 0.2, a), Math.PI / 2 - 0.08, b);
      l.g.scale.setScalar(lerp(lerp(BS, F.s, a), S.s, b) * lerp(1, l.s.check.ok ? 1.1 : 0.94, cmp));
      const reveal = clamp01((step - l.i) * 1.6);
      tmpC.copy(IDLE).lerp(l.color, reveal).lerp(l.s.check.ok ? OK : IDLE, cmp);
      l.fill.material.uniforms.uColor.value.copy(tmpC);
      l.edges.material.color.copy(cmp > 0.5 ? (l.s.check.ok ? OK : BAD) : tmpC);
      l.fill.material.uniforms.uOpacity.value = lerp(0.55 + 0.35 * open, 0.85, reveal) * (l.s.check.ok ? 1 : lerp(1, 0.65, cmp));
      l.fill.material.uniforms.uGrid.value = 1 - reveal * 0.6;
      l.edges.material.opacity = lerp(0.55, 1, reveal);
      const face = clamp01((a - 0.35) * 2.5);
      l.plain.material.opacity = face * (1 - cmp);
      l.checkedFace.material.opacity = face * cmp;
      // judged: right ones light up with a pulse, wrong ones shudder (and show their crack)
      if (jt >= 0 && jt < 1 && !still) {
        const e = Math.exp(-jt * 6);
        if (l.s.check.ok) { l.g.scale.multiplyScalar(1 + 0.2 * e); l.edges.material.color.lerp(WHITE, 0.6 * e); l.edges.material.opacity = 1; }
        else l.g.position.x += 0.05 * BS * e * Math.sin(jt * 70);
      }
      l.fill.material.uniforms.uScanY.value = scanY;
      l.fill.material.uniforms.uScan.value = scan.visible ? 1 - open : 0;
    });

    const R = P.real;
    real.g.position.set(lerp(BC.x, R.p.x, rl), lerp(BC.y, R.p.y, rl), lerp(0, R.p.z, rl));
    real.g.rotation.x = lerp(0, Math.PI / 2 - 0.12, rl);
    real.g.scale.setScalar(lerp(0.3, R.s, rl));
    real.fill.material.uniforms.uOpacity.value = 0.8 * rl;
    real.fill.material.uniforms.uGrid.value = 0.3;
    real.edges.material.opacity = rl;
    // held up as it arrives, then slammed down onto the box
    real.g.position.z += 0.3 * (boom ? Math.exp(-k * 28) : charge) * (still ? 0 : 1);
    real.g.scale.multiplyScalar(boom && !still ? 1 + 0.12 * Math.exp(-k * 12) : 1);
    const res = boom ? clamp01(k / (still ? 0.35 : 0.06)) : 0;
    realFace.material.opacity = clamp01((rl - 0.4) * 1.8) * (1 - res);
    resFace.material.opacity = clamp01((rl - 0.4) * 1.8) * res;
    real.edges.material.color.copy(REAL).lerp(won ? OK : BAD, res);
    real.g.visible = rl > 0.01;
    layers.forEach((l) => {
      const from = real.g.position.clone().add(new Vector3(0, (SLAB.d / 2) * R.s * 0.95, 0));
      const to = l.g.position.clone().add(new Vector3(0, -(SLAB.d / 2) * l.g.scale.x, 0));
      setLine(l.line, from, to);
      l.line.material.opacity = cmp * 0.8;
    });

    tmpC.copy(GOLD).lerp(REAL, rl * 0.7).lerp(WHITE, still ? 0 : charge * 0.5).lerp(won ? WIN : BAD, res * (won ? 0.6 : 0.75)).lerp(WHITE, flash * 0.5);
    coreFill.material.uniforms.uColor.value.copy(tmpC);
    coreWire.material.color.copy(tmpC);
    // once reality is out, the core steps up and back so the outcome plate reads cleanly;
    // it tightens while the result is held, then flares on a win or sinks on a loss
    const corePulse = still ? 1 : (1 - 0.22 * charge) * (won ? 1 + 0.8 * flash : 1 - 0.25 * res);
    core.scale.setScalar(BS * (1 + 0.2 * open) * lerp(1, 0.62, rl) * corePulse);
    core.position.set(BC.x, BC.y + 0.42 * rl * BS, -0.4 * rl);
    if (!still) { const spin = 1 + 5 * charge + 6 * flash; core.rotation.y += dt * 0.35 * spin; core.rotation.x += dt * 0.12 * spin; }

    // ---- shockwave rings, flare, sparks and the stamp ----
    const at = real.g.position;
    rings.forEach((m, i) => {
      const kk = k - i * 0.08, life = 0.8;
      m.visible = boom && !still && kk >= 0 && kk < life;
      if (!m.visible) return;
      m.position.set(at.x, at.y, at.z + 0.05);
      m.scale.setScalar(BS * (0.35 + (won ? 3.4 : 2.8) * easeOut(kk / life)));
      m.material.color.copy(won ? GOLD : BAD).lerp(won ? WIN : WHITE, won ? i * 0.45 : i * 0.15);
      m.material.opacity = 0.85 * Math.pow(1 - kk / life, 1.6);
    });
    flare.visible = boom && !still && k < 1.2;
    if (flare.visible) {
      flare.position.set(at.x, at.y, at.z - 0.1);
      flare.scale.setScalar(BS * (won ? 1.2 + 5.5 * easeOut(k / 0.3) : 1 + 3 * easeOut(k / 0.25)));
      flare.material.color.copy(won ? GOLD : BAD).lerp(WHITE, won ? 0.35 : 0);
      flare.material.opacity = won ? 0.9 * Math.exp(-k * 4) : 0.5 * Math.exp(-k * 8);
    }
    sparks.visible = boom && !still && k < 1.4;
    if (sparks.visible) {
      const drag = (1 - Math.exp(-3 * k)) / 3;
      for (let i = 0; i < NP; i++) {
        sparkPos[i * 3] = at.x + sparkVel[i * 3] * drag * BS;
        sparkPos[i * 3 + 1] = at.y + sparkVel[i * 3 + 1] * drag * BS - (won ? 0.15 : 0.9) * k * k * BS;
        sparkPos[i * 3 + 2] = at.z + sparkVel[i * 3 + 2] * drag * BS;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.computeBoundingSphere();
      sparks.material.size = (won ? 0.17 : 0.12) * BS;
      sparks.material.opacity = Math.pow(1 - k / 1.4, 1.2) * (won ? 1 : 0.85);
    }
    // the stamp slams on just as it hits, then settles onto the plate's corner like a rubber stamp
    const ks = k + (still ? 0 : 0.05);
    stamp.visible = landed && ks > 0 && rl > 0.5;
    if (stamp.visible) {
      const Rs = P.real.s;
      const hitPos = tmp.set(BC.x, lerp(BC.y, at.y, 0.5), at.z + 0.6); // big, over the middle of the box
      const restX = at.x + SLAB.w * Rs * 0.3, restY = at.y + SLAB.d * Rs * 0.3;
      const m = still ? (k > 1.3 ? 1 : 0) : ease(clamp01((k - 1.0) / 0.45));
      stamp.position.set(lerp(hitPos.x, restX, m), lerp(hitPos.y, restY, m), lerp(hitPos.z, at.z + 0.3, m));
      const big = BS * 1.3, slam = still ? 1 : lerp(2.6, 1, easeBack(ks / 0.14));
      stamp.scale.setScalar(lerp(big * slam, Rs * 0.42, m));
      stamp.rotation.set(0, 0, (won ? -0.12 : 0.14) + (still ? 0 : 0.25 * (1 - easeOut(ks / 0.14))));
      stamp.material.opacity = still ? clamp01(ks / 0.35) : clamp01(ks / 0.05);
    }

    decFace.position.copy(P.dec.p).setY(P.dec.p.y - (1 - dec) * 0.2);
    decFace.scale.setScalar(P.dec.s);
    decFace.material.opacity = dec;
    decFace.visible = dec > 0.01;

    // ---- chain: a copy travels from the box along a visible path, the link locks, then shows what it holds ----
    const sources = [null, ...layers.map((l) => l.g.position), real.g.position, decFace.position];
    const vSweep = clamp01((step - 6.3) / 0.7) * recs.length;
    const verifiedAt = (k: number) => (still ? (step >= 6.5 ? 1 : 0) : clamp01(vSweep - k)) * (1 - tp);
    recs.forEach((rc, k) => {
      const f = fl[k];
      const slot = P.rec(k);
      const src = sources[k];
      const travel = src ? clamp01(f / TRAVEL) : 1;
      const lock = src ? clamp01((f - TRAVEL) / (1 - TRAVEL)) : 1;
      const forged = k === tamper.index ? tp : 0;
      const broken = k === tamper.index + 1 ? tp : 0;

      rc.g.position.copy(slot);
      if (P.style === "tile") rc.g.position.y += forged * 0.16; // nudged out of line
      else rc.g.position.x -= forged * 0.22;
      rc.g.scale.setScalar(P.recS * (1 + Math.sin(Math.PI * lock) * 0.04));
      const vis = src ? clamp01(lock * 3) : 1;
      const ver = verifiedAt(k);
      const show = { sealed: vis * (1 - ver) * (1 - forged) * (1 - broken), verified: vis * ver * (1 - forged) * (1 - broken), forged: vis * forged, broken: vis * broken };
      STATES.forEach((st) => {
        for (const [style, set] of [["full", rc.faces], ["strip", rc.strips], ["tile", rc.tiles]] as const) {
          const on = style === P.style;
          set[st].m.visible = on;
          set[st].m.material.opacity = on ? show[st] : 0;
        }
      });
      rc.body.scale.set(D.w / REC.w, D.h / REC.h, 1);
      tmpC.copy(GOLD).lerp(OK, ver).lerp(BAD, Math.max(forged, broken));
      rc.body.material.uniforms.uColor.value.copy(tmpC);
      rc.body.material.uniforms.uOpacity.value = 0.45 * vis + 0.6 * Math.sin(Math.PI * lock) * (src ? 1 : 0);
      rc.g.visible = vis > 0.01;
      Object.entries(rc.emblems).forEach(([kind, e]) => {
        e.g.visible = kind === treatment && vis > 0.01;
        e.g.position.set(P.style === "tile" ? -0.35 : EMB_X, P.style === "tile" ? 0.15 : 0, 0.07);

        if (e.g.visible) {
          e.g.scale.setScalar(1);
          e.set(lock, ver, forged, vis); // may set its own press/rise scale
          if (P.style === "tile") e.g.scale.multiplyScalar(0.62);
        }
      });
      rc.vis = lock >= 0.98 ? 1 : 0;

      // empty link, waiting
      const prevDone = k === 0 || fl[k - 1] >= 1;
      const ghostOn = src && prevDone ? clamp01((step - (flights[k]![0] - 0.35)) / 0.25) * (1 - clamp01(lock * 4)) : 0;
      rc.ghost.position.copy(slot);
      rc.ghost.scale.set(P.recS * D.w / REC.w, P.recS * D.h / REC.h, 1);
      rc.ghost.material.opacity = ghostOn * 0.8;
      rc.ghost.visible = ghostOn > 0.01;

      // the travelling copy
      if (src) {
        // out of the box, across the gap, in through Firma's gate, into the slot
        const gate = P.gate;
        const out = P.gateSide === "left" ? gate.clone().add(V(-0.45, 0, 0.5)) : gate.clone().add(V(0, 0.45, 0.5));
        const inside = P.gateSide === "left" ? gate.clone().add(V(0.35, 0, 0.2)) : gate.clone().add(V(0, -0.3, 0.2));
        const curve = new CatmullRomCurve3([src.clone(), src.clone().lerp(out, 0.5).add(V(0, 0.3, 0.7)), out, gate.clone().setZ(0.35), inside, slot.clone().add(V(0, 0, 0.1))], false, "centripetal");
        const arr = rc.trail.geometry.attributes.position.array;
        for (let i = 0; i < rc.N; i++) { const p = curve.getPoint(i / (rc.N - 1)); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
        rc.trail.geometry.attributes.position.needsUpdate = true;
        rc.trail.computeLineDistances();
        rc.trail.geometry.computeBoundingSphere();
        const u = ease(travel);
        rc.trail.geometry.setDrawRange(0, Math.max(2, Math.round(u * rc.N)));
        const inFlight = f > 0 && f < 1;
        rc.trail.material.opacity = inFlight ? 0.7 * (1 - clamp01((lock - 0.3) * 2)) : 0;
        rc.trail.visible = inFlight;
        rc.token.position.copy(curve.getPoint(u));
        rc.token.scale.setScalar(lerp(view.wide ? 0.5 : 0.48, Math.min(P.recS * 0.95, (D.w * P.recS) / 2.6), u));
        rc.gatePass = inFlight ? Math.exp(-Math.pow((u - 0.6) * 9, 2)) : 0;
        rc.token.material.opacity = (f > 0 ? clamp01(f * 8) : 0) * (1 - clamp01(lock * 3));
        rc.token.visible = rc.token.material.opacity > 0.01;
      } else { rc.token.visible = false; rc.trail.visible = false; rc.gatePass = 0; }
    });
    links.forEach((ln, k) => {
      const a = recs[k], b = recs[k + 1];
      const hw = (D.w / 2) * P.recS, hh = (D.h / 2) * P.recS;
      const pa = a.g.position, pb = b.g.position;
      if (Math.abs(pa.y - pb.y) < 0.2) setLine(ln.line, V(pa.x + hw, pa.y, pa.z), V(pb.x - hw, pb.y, pb.z));
      else setLine(ln.line, V(pa.x, pa.y - hh, pa.z), V(pb.x, pb.y + hh, pb.z));
      const on = Math.min(a.vis, b.vis);
      const brokenLink = k === tamper.index ? tp : 0;
      const ver = verifiedAt(k + 1);
      tmpC.copy(GOLD).lerp(OK, ver).lerp(BAD, brokenLink);
      ln.line.material.color.copy(tmpC);
      ln.line.material.opacity = on * (brokenLink ? lerp(1, 0.25 + 0.4 * Math.abs(Math.sin(t * 5)), brokenLink) : 1);
      ln.node.material.color.copy(tmpC);
      ln.node.material.opacity = on;
      const lp = ln.line.geometry.attributes.position.array;
      ln.node.position.set((lp[0] + lp[3]) / 2 + 0.12 * brokenLink, (lp[1] + lp[4]) / 2, lp[2]);
      if (!still) ln.node.rotation.y += dt * 0.8;
    });
    // C: the vault column wraps the slots, glows green on verify, red when breached
    const top = P.rec(0), bot = P.rec(recs.length - 1);
    vault.position.set((top.x + bot.x) / 2, (top.y + bot.y) / 2, 0.15);
    vault.scale.set(Math.abs(bot.x - top.x) + D.w * P.recS + 0.3, Math.abs(top.y - bot.y) + D.h * P.recS + 0.3, 0.5);
    vault.visible = treatment === "c";
    // the gate flashes as each copy passes through it
    const pass = Math.max(0, ...recs.map((rc) => rc.gatePass || 0));
    gateFlash.position.copy(P.gate).setZ(0.3);
    gateFlash.material.opacity = pass * 0.55;
    gateFlash.scale.setScalar(1 + pass * 0.6);
    tmpC.copy(GOLD).lerp(OK, verifiedAt(recs.length - 1)).lerp(BAD, tp);
    vault.material.color.copy(tmpC);
    vault.material.opacity = 0.25 + 0.45 * Math.max(verifiedAt(recs.length - 1), tp);
    monthStep = s;
    // after this frame's opacities are set: Firma's record comes in with the deal as it leaves the hero network,
    // and steps out again at month end (there is one Firma: the report)
    fadeFirma(Math.min(ease(clamp01((s - 0.2) / 0.7)), 1 - phase(s, 8.05, 8.45)));
    const dz = P.zones.deal;
    month.update({ s, t, still, wide: view.wide, bounds: P.bounds, zone: { cx: dz.cx, cy: dz.cy, w: dz.w, h: dz.h } });
    hero.update({ s, t, still, wide: view.wide, featured: P.bc });
  }
  return {
    update,
    // the stage reports the viewport; the camera is framed per layout every frame
    setView(v: View) { Object.assign(view, v); },
    setTreatment(kind: string) { if (makers[kind]) treatment = kind; },
    setLayout(id: number) { if (LAYOUTS[id]) layoutId = id; },
    // a new outcome rewrites the faces (the data objects were updated in place by the page)
    setOutcome() { redraw(); },
    // the month end replays poorly out of sight: callers scroll back to the deal instead
    inMonth: () => monthStep > 8.4,
    // play the impact again where you are; the judging follows it
    replayOutcome() {
      const now = performance.now() / 1000;
      if (hitAt >= 0) { hitAt = now; seedSparks(reality.result === "won"); }
      if (judgedAt >= 0) judgedAt = now + PRE + 0.9;
    },
    dispose() {
      alive = false;
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
