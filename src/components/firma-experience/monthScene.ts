import {
  BoxGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from "three";
import type { Month, MonthDeal, StoryData } from "./content";
import { MONTH_MAIN } from "./content";
import { ENV, drawEnvelopeFace } from "./envelope";

/**
 * Month end, the last act (deal steps 8 → 10, story steps 9 → 11), after the deal's verify and rewrite attempt:
 *   8.05–8.45  Firma steps out of the deal view: its record panel and chain fade (there is one Firma, not one per deal)
 *   8.45–9.0   the deal shrinks into a plain envelope and the view pulls back to the month's closed deals as
 *              envelopes, each stamped won or lost (no seals on them: the report is the one Firma record)
 *   9.1–9.7    the cards fly in, one after another, and stack into the report (it thickens as they land)
 *   9.6–10     the report turns to face you, its cover swings open onto the month-end summary, and the seal presses;
 *              the page ends on it, with the call to action beside it
 * Reduced motion: no flight, no zoom; each stage crossfades into the next.
 */
type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Bounds = { cx: number; cy: number; hw: number; hh: number };
type Zone = { cx: number; cy: number; w: number; h: number };
export type MonthFrame = { s: number; t: number; still: boolean; wide: boolean; bounds: Bounds; zone: Zone };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (s: number, a: number, b: number) => ease(clamp01((s - a) / (b - a)));

const GOLD = "#d9a34a", OKC = "#46b876", BADC = "#ef5a4c", MIXC = "#e8913a";
// Firma wax-seal crimson — same as the stamp on the report (heroTune.stampColor)
const CRIMSON = "#8f1d2c";
const COLS = 4, ROWS = 3;
const RW = 2.2, RH = 2.9; // the report, in its own units
// Named regimes whose record-keeping / audit obligations a sealed FIRMA trail supports (not a certification claim).
const AUDIT_REGS = ["EU AI Act", "GDPR", "SOX", "DORA", "ISO/IEC 42001"] as const;
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const tierColor = (v: number) => (v >= 0.67 ? OKC : v >= 0.34 ? MIXC : BADC);

/** Small verification-frame badge (matches the site Stamp: crimson corners, mono label). */
function drawRegBadge(c: CanvasRenderingContext2D, label: string, x: number, y: number, h: number, F: Fonts) {
  c.font = `600 ${Math.round(h * 0.42)}px ${F.mono}`;
  const padX = Math.round(h * 0.38);
  const w = Math.ceil(c.measureText(label).width) + padX * 2;
  c.fillStyle = "rgba(16,20,28,0.92)";
  c.fillRect(x, y, w, h);
  c.strokeStyle = "rgba(143,29,44,0.55)";
  c.lineWidth = 1.5;
  c.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  // bracket corners, like the site Stamp
  const corner = Math.max(6, Math.round(h * 0.28));
  c.strokeStyle = CRIMSON;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, y + corner); c.lineTo(x, y); c.lineTo(x + corner, y);
  c.moveTo(x + w, y + h - corner); c.lineTo(x + w, y + h); c.lineTo(x + w - corner, y + h);
  c.stroke();
  c.fillStyle = CRIMSON;
  const dot = Math.max(3, Math.round(h * 0.14));
  c.fillRect(x + padX * 0.45, y + (h - dot) / 2, dot, dot);
  c.fillStyle = "#e7eaf0";
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillText(label, x + padX * 0.45 + dot + Math.round(h * 0.18), y + h / 2 + 1);
  c.textBaseline = "alphabetic";
  return w;
}

type Fonts = { sans: string; mono: string };

// One closed deal of the month, as a plain envelope: which deal, and a WON or LOST stamp on it. No seal and no
// chain: there is one Firma, and it is the report these envelopes are gathered into.
function drawCard(cv: HTMLCanvasElement, d: MonthDeal, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height, m = Math.min(W, H);
  c.clearRect(0, 0, W, H);
  c.fillStyle = d.main ? GOLD : "#94a0b4"; c.font = `600 ${Math.round(m * 0.09)}px ${F.mono}`;
  c.fillText(d.label, W * 0.06, m * 0.12);
  // the envelope, as large as fits under the label
  const top = m * 0.18, ew = Math.min(W * 0.94, (H - top - m * 0.04) * (ENV.w / ENV.h)), eh = ew * (ENV.h / ENV.w);
  const env = Object.assign(document.createElement("canvas"), { width: Math.round(ew), height: Math.round(eh) });
  drawEnvelopeFace(env, { mono: F.mono });
  const ex = (W - ew) / 2, ey = top + (H - top - eh) / 2;
  c.drawImage(env, ex, ey);
  // the outcome, stamped across it
  const won = d.result === "won", col = won ? OKC : BADC, word = won ? "WON" : "LOST";
  c.save();
  c.translate(W / 2, ey + eh * 0.6); c.rotate(won ? -0.1 : 0.1);
  c.font = `800 ${Math.round(eh * 0.3)}px ${F.sans}`;
  const tw = c.measureText(word).width, bw = tw + eh * 0.2, bh = eh * 0.42;
  c.fillStyle = "rgba(10,13,19,0.8)"; c.fillRect(-bw / 2, -bh / 2, bw, bh);
  c.strokeStyle = col; c.lineWidth = eh * 0.03; c.strokeRect(-bw / 2, -bh / 2, bw, bh);
  c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(word, 0, eh * 0.01);
  c.restore();
}
// card canvases follow the shape of the deal panel they stand in for (it differs per layout and screen)
function cardCanvas(aspect: number) {
  const L = 440;
  return aspect >= 1 ? canvasOf(L, Math.round(L / aspect)) : canvasOf(Math.round(L * aspect), L);
}

function drawCover(cv: HTMLCanvasElement, m: Month, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.fillStyle = "#10141c"; c.fillRect(0, 0, W, H);
  c.strokeStyle = GOLD; c.lineWidth = 6;
  c.beginPath(); c.moveTo(60, 150); c.lineTo(60, 60); c.lineTo(150, 60);
  c.moveTo(W - 60, H - 150); c.lineTo(W - 60, H - 60); c.lineTo(W - 150, H - 60); c.stroke();
  c.fillStyle = GOLD; c.fillRect(110, 168, 30, 30);
  c.fillStyle = "#f2e6cc"; c.font = `700 52px ${F.sans}`; c.fillText("FIRMA", 158, 198);
  c.fillStyle = "#94a0b4"; c.font = `600 30px ${F.mono}`; c.fillText("MONTH-END REPORT", 112, 262);
  c.fillStyle = "#e7eaf0"; c.font = `700 112px ${F.sans}`;
  c.fillText("Your month", 104, 470); c.fillText("end, done", 104, 590); c.fillText("for you.", 104, 710);
  c.fillStyle = GOLD; c.font = `600 44px ${F.sans}`; c.fillText("Sealed. Ready for audit.", 108, 800);
  c.fillStyle = "#5c6678"; c.font = `500 30px ${F.mono}`;
  c.fillText(`${m.deals.length} deals · ${m.scored} scores checked`, 108, 880);
  // cover line: named regimes, phrased as support for obligations (not a compliance claim)
  c.fillStyle = CRIMSON; c.font = `600 22px ${F.mono}`;
  c.fillText("AUDIT-READY FOR", 108, 1000);
  c.fillStyle = "#94a0b4"; c.font = `500 24px ${F.sans}`;
  c.fillText("Supports your record-keeping and audit", 108, 1048);
  c.fillText("obligations under", 108, 1084);
  c.fillStyle = "#c3cad6"; c.font = `600 23px ${F.mono}`;
  c.fillText(AUDIT_REGS.join("  ·  "), 108, 1136);
}

// The month-end summary page: how many scores matched reality, how reliable each source was, the decisions, all sealed.
function drawSummary(cv: HTMLCanvasElement, m: Month, F: Fonts, big: boolean) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  // phone draws the book smaller, so type is bumped; keep rhythm slightly tighter so the audit row still fits
  const z = big ? 1.06 : 1;
  const px = (n: number) => Math.round(n * z);
  c.fillStyle = "#131924"; c.fillRect(0, 0, W, H);
  c.strokeStyle = GOLD; c.lineWidth = 5;
  c.beginPath(); c.moveTo(40, 110); c.lineTo(40, 40); c.lineTo(110, 40);
  c.moveTo(W - 40, H - 110); c.lineTo(W - 40, H - 40); c.lineTo(W - 110, H - 40); c.stroke();
  const L = 76;
  let y = px(96);
  c.fillStyle = GOLD; c.font = `600 ${px(27)}px ${F.mono}`; c.fillText("FIRMA · MONTH-END REPORT", L, y);
  y += px(62);
  c.fillStyle = "#e7eaf0"; c.font = `700 ${px(54)}px ${F.sans}`; c.fillText("This month, checked.", L, y);
  y += px(130);
  c.fillStyle = "#f2f4f8"; c.font = `700 ${px(140)}px ${F.sans}`;
  const big1 = `${m.matched}`, big2 = ` / ${m.scored}`;
  c.fillText(big1, L - 4, y);
  const w1 = c.measureText(big1).width;
  c.fillStyle = "#5c6678"; c.font = `600 ${px(70)}px ${F.sans}`; c.fillText(big2, L + w1, y);
  y += px(48);
  c.fillStyle = "#c3cad6"; c.font = `500 ${px(34)}px ${F.sans}`; c.fillText("scores matched reality", L, y);
  y += px(40);
  c.fillStyle = "#5c6678"; c.font = `500 ${px(24)}px ${F.mono}`;
  c.fillText(m.open ? `${m.deals.length} deals · ${m.closed} closed · ${m.open} still open` : `${m.closed} deals closed this month, won or lost`, L, y);

  y += px(68);
  c.fillStyle = GOLD; c.font = `600 ${px(26)}px ${F.mono}`; c.fillText("SOURCE RELIABILITY", L, y);
  y += px(20);
  for (const p of m.providers) {
    const col = p.tone === "ok" ? OKC : p.tone === "bad" ? BADC : MIXC;
    y += px(72);
    c.fillStyle = "#e7eaf0"; c.font = `600 ${px(34)}px ${F.sans}`; c.fillText(p.name, L, y);
    c.font = `700 ${px(24)}px ${F.mono}`;
    const tw = c.measureText(p.verdict).width + 28, tx = W - 70 - tw;
    c.strokeStyle = col; c.lineWidth = 3; c.strokeRect(tx, y - px(30), tw, px(42));
    c.fillStyle = col; c.fillText(p.verdict, tx + 14, y);
    const bx = L, by = y + px(18), bwid = W - L - 70 - px(330); // same length on every row, clear of the widest chip
    c.fillStyle = "#1f2735"; c.fillRect(bx, by, bwid, px(10));
    c.fillStyle = col; c.fillRect(bx, by, (bwid * p.right) / p.total, px(10));
    c.fillStyle = "#94a0b4"; c.font = `600 ${px(22)}px ${F.mono}`; c.fillText(`${p.right}/${p.total}`, bx + bwid + 16, by + px(12));
  }

  y += px(84);
  c.fillStyle = GOLD; c.font = `600 ${px(26)}px ${F.mono}`; c.fillText("DECISIONS", L, y);
  const wrap = (text: string, x: number, y0: number, max: number, lh: number) => {
    let line = "", yy = y0;
    for (const w of text.split(" ")) {
      if (line && c.measureText(line + w).width > max) { c.fillText(line.trim(), x, yy); yy += lh; line = ""; }
      line += `${w} `;
    }
    c.fillText(line.trim(), x, yy);
    return yy;
  };
  m.decisions.forEach((d, i) => {
    y += px(54);
    c.fillStyle = GOLD; c.font = `600 ${px(26)}px ${F.mono}`; c.fillText(`0${i + 1}`, L, y);
    c.fillStyle = "#e7eaf0"; c.font = `600 ${px(32)}px ${F.sans}`;
    y = wrap(d, L + px(58), y, W - L - px(58) - 70, px(38));
  });

  // footer: audit-ready badges (from the bottom so phone layouts keep them on the page), then the seal line
  const fy = H - px(248);
  c.strokeStyle = "#1f2735"; c.lineWidth = 2; c.beginPath(); c.moveTo(L, fy); c.lineTo(W - 70, fy); c.stroke();
  c.fillStyle = CRIMSON; c.font = `600 ${px(22)}px ${F.mono}`;
  c.fillText("AUDIT-READY FOR", L, fy + px(36));
  c.fillStyle = "#94a0b4"; c.font = `500 ${px(21)}px ${F.sans}`;
  c.fillText("Supports your record-keeping and audit obligations under", L, fy + px(64));
  const badgeH = px(34), gap = px(8);
  let bx = L, by = fy + px(80);
  for (const name of AUDIT_REGS) {
    c.font = `600 ${Math.round(badgeH * 0.42)}px ${F.mono}`;
    const need = Math.ceil(c.measureText(name).width) + Math.round(badgeH * 0.38) * 2 + gap;
    if (bx + need > W - 70 && bx > L) {
      bx = L;
      by += badgeH + gap;
    }
    bx += drawRegBadge(c, name, bx, by, badgeH, F) + gap;
  }
  const sealY = Math.max(by + badgeH + px(24), H - px(100));
  c.fillStyle = "#94a0b4"; c.font = `600 ${px(23)}px ${F.mono}`;
  c.fillText(`SEALED · ${m.records} records + this report`, L, sealY);
  c.fillStyle = "#5c6678"; c.font = `500 ${px(22)}px ${F.mono}`;
  c.fillText(`report hash ${m.hash} · FIRMA v2.0`, L, sealY + px(36));
}

export function createMonth(opts: {
  parent: Group; deal: Group; data: StoryData; fonts: Fonts;
  texOf: (cv: HTMLCanvasElement) => Texture;
  makeSeal: () => Emblem;
  glass: (color: Color, opacity?: number) => ShaderMaterial;
}) {
  const { parent, deal, data, fonts: F, texOf, makeSeal, glass } = opts;
  const month = data.month;
  const layer = new Group(); // month space: the grid of deals around this one
  parent.add(layer);

  // ---- the month's deals ----
  const unit = new PlaneGeometry(1, 1);
  const tiles = month.deals.map((d, i) => {
    const cv = cardCanvas(1), tex = texOf(cv);
    const m = new Mesh(unit, new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 11;
    m.visible = false;
    layer.add(m);
    return { i, d, m, cv, tex, aspect: 1, ord: 0, slot: new Vector3(), bob: (i * 1.7) % 6.28 };
  });
  const shapeCards = (aspect: number) => {
    tiles.forEach((tl) => {
      if (Math.abs(tl.aspect - aspect) < 0.01) return;
      tl.aspect = aspect;
      tl.cv = cardCanvas(aspect);
      tl.tex.dispose();
      tl.tex = texOf(tl.cv);
      const mat = tl.m.material as MeshBasicMaterial;
      mat.map = tl.tex; mat.needsUpdate = true;
      drawCard(tl.cv, tl.d, F);
    });
  };

  // ---- the report: a book with the Firma seal on its cover ----
  const book = new Group();
  parent.add(book);
  const body = new Mesh(new BoxGeometry(RW, RH, 1), glass(new Color(GOLD), 0.6));
  const edges = new LineSegments(new EdgesGeometry(new BoxGeometry(RW, RH, 1)), new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false }));
  const pageCv = canvasOf(1024, 1365), coverCv = canvasOf(1024, 1365);
  const pageMat = new MeshBasicMaterial({ map: texOf(pageCv), transparent: true, opacity: 0, depthWrite: false });
  const page = new Mesh(new PlaneGeometry(RW - 0.08, RH - 0.08), pageMat);
  const hinge = new Group();
  const coverMat = new MeshBasicMaterial({ map: texOf(coverCv), transparent: true, opacity: 0, depthWrite: false });
  const cover = new Mesh(new PlaneGeometry(RW - 0.08, RH - 0.08), coverMat);
  cover.position.x = (RW - 0.08) / 2;
  const insideMat = new MeshBasicMaterial({ color: "#10141c", transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
  const inside = new Mesh(new PlaneGeometry(RW - 0.08, RH - 0.08), insideMat);
  inside.position.set((RW - 0.08) / 2, 0, -0.002);
  inside.rotation.y = Math.PI;
  hinge.add(inside, cover);
  [body, edges, page, cover, inside].forEach((o) => { o.renderOrder = 9; });
  const sealOn = (host: Group | Mesh, x: number, y: number, size: number) => {
    const holder = new Group();
    holder.position.set(x, y, 0.01);
    holder.scale.setScalar(size);
    const e = makeSeal();
    e.g.position.set(0, 0, 0);
    e.g.children.forEach((ch) => { ch.renderOrder = 12; });
    holder.add(e.g);
    host.add(holder);
    return e;
  };
  const coverSeal = sealOn(cover, 0.62, -0.95, 1.9);
  const pageSeal = sealOn(page, RW / 2 - 0.3, -RH / 2 + 0.24, 1.05);
  book.add(body, edges, page, hinge);
  book.visible = false;

  let drawnWide: boolean | null = null;
  const redraw = (wide = drawnWide ?? true) => {
    drawnWide = wide;
    tiles.forEach((tl) => {
      tl.d = month.deals[tl.i]; // the outcome toggle rebuilds the month in place
      drawCard(tl.cv, tl.d, F); tl.tex.needsUpdate = true;
    });
    drawCover(coverCv, month, F); coverMat.map!.needsUpdate = true;
    drawSummary(pageCv, month, F, !wide); pageMat.map!.needsUpdate = true;
  };
  redraw();

  const C = new Vector3(), Z = new Vector3(), A = new Vector3(), S = new Vector3(), land = new Vector3(), tmp = new Vector3();
  const qBook = new Quaternion(), qId = new Quaternion();

  function update({ s, t, still, wide, bounds: B, zone: Zd }: MonthFrame) {
    if (wide !== drawnWide) redraw(wide); // the summary page is set larger on phones
    shapeCards(Zd.w / Zd.h);
    // the deal first sheds its Firma side (see checkScene), then shrinks into a card among the month's deals
    const mz = phase(s, 8.45, 9.0), g = clamp01((s - 9.1) / 0.6), opn = phase(s, 9.6, 9.97);
    const active = s > 8.0;

    // the grid: the deal's own framing, with room for the month around it (wider on phones)
    const regW = 2 * B.hw * (wide ? 1 : 1.75), regH = 2 * B.hh;
    const cellW = regW / COLS, cellH = regH / ROWS;
    // the deal's own panel (what is left once Firma has stepped out), shrunk into one cell
    const sD = Math.min(cellW / Zd.w, cellH / Zd.h) * 0.85;
    const tw = Zd.w * sD, th = Zd.h * sD;
    C.set(B.cx, B.cy, 0);
    Z.set(Zd.cx, Zd.cy, 0);
    tiles.forEach((tl) => {
      const col = tl.i % COLS, row = Math.floor(tl.i / COLS);
      tl.slot.set(B.cx + (col - (COLS - 1) / 2) * cellW, B.cy + ((ROWS - 1) / 2 - row) * cellH, 0);
    });
    S.copy(tiles[MONTH_MAIN].slot);
    // stacking order: nearest deals first, this deal last, on top
    const byDist = [...tiles].sort((a, b) => (a.d.main ? 1 : b.d.main ? -1 : a.slot.distanceTo(C) - b.slot.distanceTo(C)));
    byDist.forEach((tl, k) => { tl.ord = k / (tiles.length - 1); });

    // ---- pulling back: the deal and the month share one transform, like a camera dolly ----
    const zoom = still ? 1 : mz;
    const k = still ? 1 : Math.exp(Math.log(1 / sD) * (1 - zoom));
    // out of the deal toward its place in the month
    if (still) A.copy(S);
    else A.copy(Z).lerp(S, ease(zoom));
    layer.scale.setScalar(k);
    layer.position.copy(A).addScaledVector(S, -k);
    if (active) {
      const ds = still ? 1 : k * sD;
      deal.scale.setScalar(ds);
      deal.position.copy(A).addScaledVector(Z, -ds);
      if (still) deal.position.set(0, 0, 0);
    } else { deal.scale.setScalar(1); deal.position.set(0, 0, 0); }
    deal.visible = still ? s < 8.55 : mz < 0.999;

    // ---- the report: appears as the deals converge, opens onto the summary, then steps aside ----
    const bkC = (2 * B.hh * (wide ? 0.62 : 0.5)) / RH;
    const bkO = wide ? (2 * B.hh * 0.94) / RH : Math.min((2 * B.hh * 0.9) / RH, (regW * 0.85) / RW);
    const thick = 0.03 + 0.22 * (still ? 1 : ease(g));
    let alpha: number;
    if (still) {
      alpha = clamp01((s - 9.25) / 0.4);
      book.position.set(B.cx, B.cy, 0.4);
      book.rotation.set(0, 0, 0);
      book.scale.setScalar(bkO);
      hinge.rotation.y = 0;
      coverMat.opacity = alpha * (1 - opn);
      pageMat.opacity = alpha * opn;
    } else {
      const appear = ease(clamp01(g / 0.35));
      alpha = appear;
      book.position.set(B.cx, B.cy, lerp(0.25, 0.4, opn));
      book.rotation.set(lerp(-0.32, -0.03, opn), lerp(0.38, -0.05, opn) + Math.sin(t * 0.4) * 0.015 * (1 - opn), 0);
      book.scale.setScalar(lerp(bkC * lerp(0.85, 1, appear), bkO, opn));
      hinge.rotation.y = -opn * 1.9;
      coverMat.opacity = alpha * (1 - clamp01((opn - 0.55) / 0.4));
      pageMat.opacity = alpha * clamp01((opn - 0.15) / 0.5);
    }
    body.scale.z = thick;
    page.position.z = thick / 2 + 0.004;
    hinge.position.set(-RW / 2 + 0.04, 0, thick / 2 + 0.012);
    (body.material as ShaderMaterial).uniforms.uOpacity.value = 0.55 * alpha;
    (edges.material as LineBasicMaterial).opacity = 0.8 * alpha;
    insideMat.opacity = coverMat.opacity * 0.95;
    coverSeal.set(1, 0, 0, coverMat.opacity);
    // the report itself is sealed as it opens
    pageSeal.set(still ? (opn > 0.5 ? 1 : 0) : phase(s, 9.8, 10), 0, 0, pageMat.opacity);
    book.visible = alpha > 0.005;
    book.updateMatrixWorld();
    layer.updateMatrixWorld();
    qBook.copy(book.quaternion); // book and month layer share a parent; the layer never rotates

    // ---- the deals: revealed by the pull-back, then each flies into the report ----
    tiles.forEach((tl) => {
      const m = tl.m, mat = m.material as MeshBasicMaterial;
      const reveal = tl.d.main ? clamp01((mz - 0.72) / 0.28) : clamp01((mz - 0.15) / 0.5);
      let op = still ? clamp01((mz - 0.25) / 0.5) : reveal;
      m.position.copy(tl.slot);
      if (!still) m.position.z += Math.sin(t * 0.6 + tl.bob) * 0.03 * (1 - g);
      m.quaternion.identity();
      m.scale.set(tw, th, 1);
      if (still) op *= 1 - clamp01((s - 9.2) / 0.4);
      else if (g > 0) {
        const u = ease(clamp01(g * 3 - tl.ord * 2)); // one after another, a few in the air at a time
        // landing spot on the report, in month space (the layer is at rest by now)
        land.set(0, 0, thick / 2 + 0.06);
        book.localToWorld(land);
        layer.worldToLocal(land);
        tmp.copy(tl.slot).lerp(land, u);
        tmp.z += Math.sin(Math.PI * u) * 0.9;
        m.position.copy(tmp);
        m.quaternion.slerpQuaternions(qId, qBook, u);
        const f = lerp(1, ((RW - 0.2) * book.scale.x * 0.75) / tw, u);
        m.scale.set(tw * f, th * f, 1);
        op *= 1 - clamp01((u - 0.8) / 0.2);
      }
      // desktop: deals sliding in from the left fade before they reach the story text
      if (wide && !still) {
        const wx = layer.position.x + m.position.x * k;
        op *= clamp01((wx - (B.cx - B.hw - 0.3)) / 1.0);
      }
      mat.opacity = op;
      m.visible = op > 0.005;
    });
  }

  return { update, redraw: () => redraw() };
}
