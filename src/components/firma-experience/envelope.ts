import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  type Color,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  type Texture,
} from "three";

/**
 * The deal as a sealed contract envelope: a thin paper box with a V flap drawn on its face, crisp edges, and a
 * wax seal pressed on the flap's tip (Firma's wax seal). Used by the hero stream, the featured deal, and the
 * month-end cards, so they all match.
 */
export const ENV = { w: 2.9, h: 1.9, d: 0.16 };
export const FLAP_Y = 0.08; // the flap's tip, as a share of the height above the centre

type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };

// the paper face: a dark contract envelope with its flap and a few faint address lines (no text that needs reading)
// the paper face: a metallic gold contract envelope (a brushed sheen baked in diagonally, so it reads as metal
// rather than flat yellow), with its flap, folds, a few address lines and a small handshake
export function drawEnvelopeFace(cv: HTMLCanvasElement, opts: { label?: string; mono?: string } = {}) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#6b4a17"); g.addColorStop(0.28, "#b8862e"); g.addColorStop(0.42, "#f0cf7e");
  g.addColorStop(0.5, "#c99a3c"); g.addColorStop(0.72, "#8a6322"); g.addColorStop(1, "#5a3e12");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // fine brushed grain
  let r = 77;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.globalAlpha = 0.08;
  for (let n = 0; n < 140; n++) {
    const y = rnd() * H;
    c.fillStyle = rnd() > 0.5 ? "#fff3cf" : "#3b2808";
    c.fillRect(0, y, W, 1 + rnd() * 2);
  }
  c.globalAlpha = 1;
  // the flap: a slightly lighter triangle from the top corners to the seal, with a shadowed crease
  const tipY = H * (0.5 - FLAP_Y);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W / 2, tipY); c.closePath();
  c.fillStyle = "rgba(255,240,200,0.12)"; c.fill();
  c.strokeStyle = "rgba(60,38,8,0.55)"; c.lineWidth = W * 0.007;
  c.beginPath(); c.moveTo(W * 0.004, H * 0.006); c.lineTo(W / 2, tipY); c.lineTo(W * 0.996, H * 0.006); c.stroke();
  // the lower folds
  c.strokeStyle = "rgba(60,38,8,0.3)";
  c.beginPath(); c.moveTo(0, H); c.lineTo(W * 0.42, H * 0.55); c.moveTo(W, H); c.lineTo(W * 0.58, H * 0.55); c.stroke();
  // faint embossed address lines, bottom left
  c.fillStyle = "rgba(60,38,8,0.28)";
  [0.72, 0.79, 0.86].forEach((y, i) => c.fillRect(W * 0.08, H * y, W * (0.3 - i * 0.06), H * 0.018));
  // a small handshake, pressed into the bottom right corner: this envelope is a deal
  handshake(c, W * 0.85, H * 0.8, H * 0.15, "rgba(60,38,8,0.5)");
  if (opts.label) {
    c.fillStyle = "rgba(60,38,8,0.8)"; c.font = `600 ${Math.round(H * 0.07)}px ${opts.mono ?? "monospace"}`;
    c.fillText(opts.label, W * 0.08, H * 0.66);
  }
  c.strokeStyle = "rgba(255,236,180,0.55)"; c.lineWidth = W * 0.008; c.strokeRect(1, 1, W - 2, H - 2);
}

// A minimal line handshake (two forearms meeting in a clasp), centred at (x, y), about s wide.
function handshake(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  c.save();
  c.translate(x, y); c.scale(s / 100, s / 100);
  c.strokeStyle = col; c.lineWidth = 7; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath();
  // left sleeve and hand, reaching up to the clasp
  c.moveTo(-50, 18); c.lineTo(-28, 0); c.lineTo(-8, -10); c.quadraticCurveTo(4, -14, 14, -6);
  // right sleeve and hand, its fingers folding over
  c.moveTo(50, 18); c.lineTo(28, 0); c.lineTo(10, 4); c.quadraticCurveTo(-4, 8, -12, 2);
  // the knuckles of the clasp
  c.moveTo(-2, 10); c.lineTo(6, 16); c.moveTo(6, 6); c.lineTo(14, 12);
  c.stroke();
  c.restore();
}

// A 3D envelope: box with the paper face in front, darker paper elsewhere, crisp edges, and an optional seal.
export function makeEnvelope(face: Texture, seal?: Emblem) {
  const g = new Group();
  const side = new MeshBasicMaterial({ color: "#7a5719", transparent: true });
  const back = new MeshBasicMaterial({ color: "#5a3e12", transparent: true });
  const front = new MeshBasicMaterial({ map: face, transparent: true });
  const box = new Mesh(new BoxGeometry(ENV.w, ENV.h, ENV.d), [side, side, side, side, front, back]);
  const edges = new LineSegments(new EdgesGeometry(new BoxGeometry(ENV.w, ENV.h, ENV.d)),
    new LineBasicMaterial({ color: "#c9a04e", transparent: true, depthWrite: false }));
  g.add(box, edges);
  let sealHolder: Group | null = null;
  if (seal) {
    sealHolder = new Group();
    sealHolder.position.set(0, ENV.h * FLAP_Y, ENV.d / 2 + 0.005);
    sealHolder.scale.setScalar(2.1);
    sealHolder.add(seal.g);
    g.add(sealHolder);
  }
  const mats = [side, back, front];
  return {
    g, box, edges, seal,
    // lit by a light beam: the gold catches it (brighter, a touch of the beam's green in the highlights);
    // unlit it sits a little darker, like metal in shadow (0 = unlit)
    // glow: as a light source itself, the gold brightens beyond what the beam gives it (0 = reflective only)
    setLight(k: number, glow = 0) {
      front.color.setRGB(0.72 + 0.5 * k, 0.72 + 0.55 * k, 0.7 + 0.42 * k).multiplyScalar(1 + glow);
      side.color.setRGB(0.32 + 0.3 * k, 0.23 + 0.24 * k, 0.08 + 0.1 * k);
      (edges.material as LineBasicMaterial).color.setRGB(0.6 + 0.4 * k, 0.45 + 0.4 * k, 0.18 + 0.3 * k);
    },
    setOpacity(a: number) {
      mats.forEach((m) => { m.opacity = a; m.depthWrite = a > 0.98; });
      (edges.material as LineBasicMaterial).opacity = 0.9 * a;
      seal?.set(1, 0, 0, a);
      g.visible = a > 0.005;
    },
  };
}

// Envelope outline for the X-ray view: the box edges plus the flap's V (and its folds), as one line set.
export function envelopeOutline() {
  const box = new EdgesGeometry(new BoxGeometry(ENV.w, ENV.h, ENV.d));
  const pts = Array.from(box.attributes.position.array as Float32Array);
  const z = ENV.d / 2, top = ENV.h / 2, tip = ENV.h * FLAP_Y;
  pts.push(-ENV.w / 2, top, z, 0, tip, z, 0, tip, z, ENV.w / 2, top, z);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return geo;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Firma's wax seal art, drawn light so the material colour can tint it (crimson, or green / red when checked).
export function drawWaxSeal(cv: HTMLCanvasElement, sans: string) {
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
  c.fillStyle = "#b39a6c"; c.font = `700 ${W * 0.36}px ${sans}`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("F", cx, cy + W * 0.02);
}

// The wax seal on the envelope's flap: stamped down when sealed, cracks in two when tampered. The colours are
// read every time it is set (the Fides scene changes the seal colour live).
export function makeWaxSeal(tex: Texture, colors: { seal: Color; ok: Color; bad: Color }): Emblem {
  const g = new Group();
  const halves = [0, 1].map((side) => {
    const m = new Mesh(new CircleGeometry(0.15, 40, side ? -Math.PI / 2 : Math.PI / 2, Math.PI),
      new MeshBasicMaterial({ map: tex, color: colors.seal.clone(), transparent: true }));
    g.add(m);
    return m;
  });
  return {
    g,
    set(lock, ver, brk, alpha) {
      const press = easeIO(clamp01(lock));
      g.scale.setScalar(mix(1.9, 1, press) * (1 + Math.sin(Math.PI * clamp01((lock - 0.7) * 3.3)) * -0.08));
      g.position.z = mix(0.45, 0.05, press);
      halves.forEach((h, i) => {
        const dir = i ? 1 : -1;
        h.position.x = dir * brk * 0.05; h.position.y = -brk * 0.02 * (i ? 1 : -1);
        h.rotation.z = dir * brk * -0.28;
        h.material.color.copy(colors.seal).lerp(colors.ok, ver * 0.55).lerp(colors.bad, brk);
        h.material.opacity = alpha * clamp01(lock * 2.5);
      });
    },
  };
}

// The envelope's back, for where it can be seen from behind (the home ring): the same brushed gold, the four
// folds meeting in the middle, a seam along the bottom flap and a small Firma mark (no seal: that is on the front).
export function drawEnvelopeBack(cv: HTMLCanvasElement, opts: { sans?: string } = {}) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const g = c.createLinearGradient(W, 0, 0, H);
  g.addColorStop(0, "#5f4214"); g.addColorStop(0.3, "#a87a28"); g.addColorStop(0.45, "#dcb766");
  g.addColorStop(0.55, "#b98a33"); g.addColorStop(0.75, "#7d5a1e"); g.addColorStop(1, "#4f360f");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  let r = 91;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.globalAlpha = 0.07;
  for (let n = 0; n < 140; n++) { c.fillStyle = rnd() > 0.5 ? "#fff3cf" : "#3b2808"; c.fillRect(0, rnd() * H, W, 1 + rnd() * 2); }
  c.globalAlpha = 1;
  // the folds: side flaps and the bottom flap overlapping in the middle
  c.strokeStyle = "rgba(60,38,8,0.45)"; c.lineWidth = W * 0.006;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.5, H * 0.56); c.lineTo(W, 0); c.stroke();
  c.fillStyle = "rgba(255,240,200,0.08)";
  c.beginPath(); c.moveTo(0, H); c.lineTo(W * 0.5, H * 0.42); c.lineTo(W, H); c.closePath(); c.fill();
  c.strokeStyle = "rgba(60,38,8,0.55)";
  c.beginPath(); c.moveTo(W * 0.004, H * 0.994); c.lineTo(W * 0.5, H * 0.42); c.lineTo(W * 0.996, H * 0.994); c.stroke();
  // a small embossed Firma mark
  c.strokeStyle = "rgba(60,38,8,0.5)"; c.lineWidth = W * 0.005;
  c.beginPath(); c.arc(W * 0.5, H * 0.74, H * 0.075, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "rgba(60,38,8,0.55)"; c.font = `700 ${Math.round(H * 0.085)}px ${opts.sans ?? "sans-serif"}`;
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("F", W * 0.5, H * 0.745);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.strokeStyle = "rgba(255,236,180,0.55)"; c.lineWidth = W * 0.008; c.strokeRect(1, 1, W - 2, H - 2);
}
