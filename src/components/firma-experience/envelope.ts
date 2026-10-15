import {
  BoxGeometry,
  BufferGeometry,
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
export function drawEnvelopeFace(cv: HTMLCanvasElement, opts: { label?: string; mono?: string } = {}) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b2333"); g.addColorStop(1, "#141a26");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // the flap: a slightly lighter triangle from the top corners to the seal
  const tipY = H * (0.5 - FLAP_Y);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W / 2, tipY); c.closePath();
  c.fillStyle = "rgba(255,255,255,0.045)"; c.fill();
  c.strokeStyle = "rgba(201,210,227,0.38)"; c.lineWidth = W * 0.006;
  c.beginPath(); c.moveTo(W * 0.004, H * 0.006); c.lineTo(W / 2, tipY); c.lineTo(W * 0.996, H * 0.006); c.stroke();
  // the lower folds
  c.strokeStyle = "rgba(201,210,227,0.12)";
  c.beginPath(); c.moveTo(0, H); c.lineTo(W * 0.42, H * 0.55); c.moveTo(W, H); c.lineTo(W * 0.58, H * 0.55); c.stroke();
  // faint address lines, bottom left
  c.fillStyle = "rgba(201,210,227,0.16)";
  [0.72, 0.79, 0.86].forEach((y, i) => c.fillRect(W * 0.08, H * y, W * (0.3 - i * 0.06), H * 0.018));
  if (opts.label) {
    c.fillStyle = "rgba(217,163,74,0.75)"; c.font = `600 ${Math.round(H * 0.07)}px ${opts.mono ?? "monospace"}`;
    c.fillText(opts.label, W * 0.08, H * 0.66);
  }
  c.strokeStyle = "rgba(201,210,227,0.28)"; c.lineWidth = W * 0.008; c.strokeRect(1, 1, W - 2, H - 2);
}

// A 3D envelope: box with the paper face in front, darker paper elsewhere, crisp edges, and an optional seal.
export function makeEnvelope(face: Texture, seal?: Emblem) {
  const g = new Group();
  const side = new MeshBasicMaterial({ color: "#0f141d", transparent: true });
  const back = new MeshBasicMaterial({ color: "#121824", transparent: true });
  const front = new MeshBasicMaterial({ map: face, transparent: true });
  const box = new Mesh(new BoxGeometry(ENV.w, ENV.h, ENV.d), [side, side, side, side, front, back]);
  const edges = new LineSegments(new EdgesGeometry(new BoxGeometry(ENV.w, ENV.h, ENV.d)),
    new LineBasicMaterial({ color: "#56637a", transparent: true, depthWrite: false }));
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
