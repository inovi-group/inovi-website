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

/**
 * Month end, after the single deal has been judged (story steps 5 → 8):
 *   5.15–5.95  the view pulls back from the deal to the month's pipeline, every deal with its own outcome and seals
 *   6.15–7.0   the deals fly in, one after another, and stack into the report (it thickens as they land)
 *   7.15–7.9   the report turns to face you, its cover swings open onto the month-end summary, and the seal presses
 *   8.15–8.9   back into the deal, for verify and the rewrite attempt
 * Reduced motion: no flight, no zoom; each stage crossfades into the next.
 */
type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Bounds = { cx: number; cy: number; hw: number; hh: number };
export type MonthFrame = { s: number; t: number; still: boolean; wide: boolean; bounds: Bounds };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (s: number, a: number, b: number) => ease(clamp01((s - a) / (b - a)));

const GOLD = "#d9a34a", OKC = "#46b876", BADC = "#ef5a4c", MIXC = "#e8913a";
const COLS = 4, ROWS = 3;
const RW = 2.2, RH = 2.9; // the report, in its own units
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const tierColor = (v: number) => (v >= 0.67 ? OKC : v >= 0.34 ? MIXC : BADC);

type Fonts = { sans: string; mono: string };

// One deal of the month, shaped like the deal view it stands for: scores and outcome, and its sealed chain.
function drawTile(cv: HTMLCanvasElement, d: MonthDeal, F: Fonts, tall: boolean) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  rrect(c, 4, 4, W - 8, H - 8, 22);
  c.fillStyle = "rgba(16,20,28,0.96)"; c.fill();
  c.lineWidth = d.main ? 7 : 4; c.strokeStyle = d.main ? GOLD : "rgba(92,102,120,0.8)";
  if (!d.main) c.setLineDash([14, 10]);
  c.stroke(); c.setLineDash([]);
  const col = d.result === "won" ? OKC : d.result === "lost" ? BADC : "#94a0b4";
  const badge = d.result === "won" ? "WON" : d.result === "lost" ? "LOST" : "OPEN";
  // deal side: label, outcome, three scores with their verdicts
  const dw = tall ? W : W * 0.6;
  c.fillStyle = d.main ? GOLD : "#94a0b4"; c.font = `600 ${tall ? 34 : 38}px ${F.mono}`;
  c.fillText(d.label, 30, tall ? 62 : 66);
  c.font = `700 ${tall ? 54 : 58}px ${F.sans}`;
  const bw = c.measureText(badge).width + 36, by = tall ? 92 : 96;
  c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(30, by, bw, tall ? 74 : 78);
  c.fillStyle = col; c.fillText(badge, 48, by + (tall ? 57 : 60));
  const rows = tall ? [214, 262, 310] : [232, 286, 340];
  d.levels.forEach((v, k) => {
    const y = rows[k], x0 = 30, bwid = dw - (tall ? 110 : 120);
    c.fillStyle = "#1f2735"; c.fillRect(x0, y - 16, bwid, 20);
    c.fillStyle = tierColor(v); c.fillRect(x0, y - 16, bwid * v, 20);
    if (d.right) {
      c.fillStyle = d.right[k] ? OKC : BADC; c.font = `700 40px ${F.sans}`;
      c.fillText(d.right[k] ? "✓" : "✕", x0 + bwid + 18, y + 8);
    }
  });
  // record side: the deal's own chain of wax seals
  const fx = tall ? 22 : W * 0.63, fy = tall ? 352 : 22, fw = tall ? W - 44 : W * 0.37 - 22, fh = tall ? H - 374 : H - 44;
  rrect(c, fx, fy, fw, fh, 16);
  c.fillStyle = "rgba(26,22,14,0.9)"; c.fill();
  c.lineWidth = 4; c.strokeStyle = "rgba(217,163,74,0.75)"; c.stroke();
  c.fillStyle = GOLD; c.fillRect(fx + 16, fy + 18, 16, 16);
  c.fillStyle = "#f2e6cc"; c.font = `700 30px ${F.sans}`; c.fillText("FIRMA", fx + 40, fy + 36);
  const seals = d.seals, r = 15;
  for (let k = 0; k < seals; k++) {
    let x: number, y: number;
    if (tall) { x = fx + 34 + (k % 3) * ((fw - 68) / 2); y = fy + 80 + Math.floor(k / 3) * 54; }
    else { x = fx + fw / 2; y = fy + 76 + k * ((fh - 100) / Math.max(1, seals - 1)); }
    if (k > 0 && !tall) { c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - r - 2); c.lineTo(x, y - ((fh - 100) / Math.max(1, seals - 1)) + r + 2); c.stroke(); }
    c.fillStyle = GOLD; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#7a5a22"; c.font = `700 17px ${F.sans}`; c.textAlign = "center"; c.fillText("F", x, y + 6); c.textAlign = "left";
  }
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
  c.fillText("This month's", 104, 470); c.fillText("scores,", 104, 590); c.fillText("checked.", 104, 710);
  c.fillStyle = GOLD; c.font = `600 44px ${F.sans}`; c.fillText("Decisions inside.", 108, 800);
  c.fillStyle = "#5c6678"; c.font = `500 30px ${F.mono}`;
  c.fillText(`${m.deals.length} deals · ${m.scored} scores checked`, 108, 880);
}

// The month-end summary page: how many scores matched reality, who to trust, the decisions, all sealed.
function drawSummary(cv: HTMLCanvasElement, m: Month, F: Fonts, big: boolean) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height, z = big ? 1.1 : 1;
  const px = (n: number) => Math.round(n * z);
  c.fillStyle = "#131924"; c.fillRect(0, 0, W, H);
  c.strokeStyle = GOLD; c.lineWidth = 5;
  c.beginPath(); c.moveTo(40, 110); c.lineTo(40, 40); c.lineTo(110, 40);
  c.moveTo(W - 40, H - 110); c.lineTo(W - 40, H - 40); c.lineTo(W - 110, H - 40); c.stroke();
  const L = 76;
  let y = px(104);
  c.fillStyle = GOLD; c.font = `600 ${px(27)}px ${F.mono}`; c.fillText("FIRMA · MONTH-END REPORT", L, y);
  y += px(70);
  c.fillStyle = "#e7eaf0"; c.font = `700 ${px(54)}px ${F.sans}`; c.fillText("This month, checked.", L, y);
  y += px(150);
  c.fillStyle = "#f2f4f8"; c.font = `700 ${px(140)}px ${F.sans}`;
  const big1 = `${m.matched}`, big2 = ` / ${m.scored}`;
  c.fillText(big1, L - 4, y);
  const w1 = c.measureText(big1).width;
  c.fillStyle = "#5c6678"; c.font = `600 ${px(70)}px ${F.sans}`; c.fillText(big2, L + w1, y);
  y += px(52);
  c.fillStyle = "#c3cad6"; c.font = `500 ${px(34)}px ${F.sans}`; c.fillText("scores matched reality", L, y);
  y += px(44);
  c.fillStyle = "#5c6678"; c.font = `500 ${px(24)}px ${F.mono}`;
  c.fillText(`${m.deals.length} deals · ${m.closed} closed · ${m.open} still open`, L, y);

  y += px(80);
  c.fillStyle = GOLD; c.font = `600 ${px(26)}px ${F.mono}`; c.fillText("WHO TO TRUST", L, y);
  y += px(24);
  for (const p of m.providers) {
    const col = p.tone === "ok" ? OKC : p.tone === "bad" ? BADC : MIXC;
    y += px(80);
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

  y += px(104);
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
    y += px(62);
    c.fillStyle = GOLD; c.font = `600 ${px(26)}px ${F.mono}`; c.fillText(`0${i + 1}`, L, y);
    c.fillStyle = "#e7eaf0"; c.font = `600 ${px(32)}px ${F.sans}`;
    y = wrap(d, L + px(58), y, W - L - px(58) - 70, px(40));
  });

  // footer: everything above is on the record
  const fy = H - px(150);
  c.strokeStyle = "#1f2735"; c.lineWidth = 2; c.beginPath(); c.moveTo(L, fy); c.lineTo(W - 70, fy); c.stroke();
  c.fillStyle = "#94a0b4"; c.font = `600 ${px(23)}px ${F.mono}`;
  c.fillText(`SEALED · ${m.records} records + this report`, L, fy + px(48));
  c.fillStyle = "#5c6678"; c.font = `500 ${px(22)}px ${F.mono}`;
  c.fillText(`report hash ${m.hash} · FIRMA v2.0`, L, fy + px(88));
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
    const cvW = canvasOf(560, 404), cvN = canvasOf(300, 564);
    const texW = texOf(cvW), texN = texOf(cvN);
    const m = new Mesh(unit, new MeshBasicMaterial({ map: texW, transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 11;
    m.visible = false;
    layer.add(m);
    return { i, d, m, cvW, cvN, texW, texN, ord: 0, slot: new Vector3(), bob: (i * 1.7) % 6.28 };
  });

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
      drawTile(tl.cvW, tl.d, F, false); tl.texW.needsUpdate = true;
      drawTile(tl.cvN, tl.d, F, true); tl.texN.needsUpdate = true;
    });
    drawCover(coverCv, month, F); coverMat.map!.needsUpdate = true;
    drawSummary(pageCv, month, F, !wide); pageMat.map!.needsUpdate = true;
  };
  redraw();

  const C = new Vector3(), A = new Vector3(), S = new Vector3(), land = new Vector3(), tmp = new Vector3();
  const qBook = new Quaternion(), qId = new Quaternion();

  function update({ s, t, still, wide, bounds: B }: MonthFrame) {
    if (wide !== drawnWide) redraw(wide); // the summary page is set larger on phones
    const mz = phase(s, 5.15, 5.95), g = clamp01((s - 6.15) / 0.85), opn = phase(s, 7.15, 7.9), rz = phase(s, 8.15, 8.9);
    const active = s > 5.1 && s < 9;

    // the grid: the deal's own framing, with room for the month around it (wider on phones)
    const regW = 2 * B.hw * (wide ? 1 : 1.75), regH = 2 * B.hh;
    const cellW = regW / COLS, cellH = regH / ROWS;
    const sD = Math.min(cellW / (2 * B.hw), cellH / (2 * B.hh)) * 0.9; // the deal, shrunk into one cell
    const tw = 2 * B.hw * sD, th = 2 * B.hh * sD;
    C.set(B.cx, B.cy, 0);
    tiles.forEach((tl) => {
      const col = tl.i % COLS, row = Math.floor(tl.i / COLS);
      tl.slot.set(B.cx + (col - (COLS - 1) / 2) * cellW, B.cy + ((ROWS - 1) / 2 - row) * cellH, 0);
    });
    S.copy(tiles[MONTH_MAIN].slot);
    // stacking order: nearest deals first, this deal last, on top
    const byDist = [...tiles].sort((a, b) => (a.d.main ? 1 : b.d.main ? -1 : a.slot.distanceTo(C) - b.slot.distanceTo(C)));
    byDist.forEach((tl, k) => { tl.ord = k / (tiles.length - 1); });

    // ---- pulling back: the deal and the month share one transform, like a camera dolly ----
    const zoom = still ? 1 : rz > 0 ? 1 - rz : mz;
    const k = still ? 1 : Math.exp(Math.log(1 / sD) * (1 - zoom));
    // out of the deal toward its place in the month; on the way back it grows out of the report
    A.copy(C).lerp(S, still ? 1 : rz > 0 ? 0 : ease(zoom));
    layer.scale.setScalar(k);
    layer.position.copy(A).addScaledVector(S, -k);
    if (active || rz > 0) {
      const ds = still ? 1 : k * sD;
      deal.scale.setScalar(ds);
      deal.position.copy(A).addScaledVector(C, -ds);
      if (still) deal.position.set(0, 0, 0);
    } else { deal.scale.setScalar(1); deal.position.set(0, 0, 0); }
    deal.visible = still ? !(s > 5.55 && s < 8.55) : !(mz > 0.999 && rz < 0.001);

    // ---- the report: appears as the deals converge, opens onto the summary, then steps aside ----
    const bkC = (2 * B.hh * (wide ? 0.62 : 0.5)) / RH;
    const bkO = wide ? (2 * B.hh * 0.94) / RH : Math.min((2 * B.hh * 0.9) / RH, (regW * 0.85) / RW);
    const thick = 0.03 + 0.22 * (still ? 1 : ease(g));
    let alpha: number;
    if (still) {
      alpha = clamp01((s - 6.35) / 0.5) * (1 - clamp01((s - 8.3) / 0.4));
      book.position.set(B.cx, B.cy, 0.4);
      book.rotation.set(0, 0, 0);
      book.scale.setScalar(bkO);
      hinge.rotation.y = 0;
      coverMat.opacity = alpha * (1 - opn);
      pageMat.opacity = alpha * opn;
    } else {
      const appear = ease(clamp01(g / 0.35));
      alpha = appear * (1 - ease(clamp01(rz / 0.6)));
      book.position.set(B.cx, B.cy, lerp(0.25, 0.4, opn) - rz * 0.8);
      book.rotation.set(lerp(-0.32, -0.03, opn), lerp(0.38, -0.05, opn) + Math.sin(t * 0.4) * 0.015 * (1 - opn), 0);
      book.scale.setScalar(lerp(bkC * lerp(0.85, 1, appear), bkO, opn) * lerp(1, 0.8, rz));
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
    pageSeal.set(still ? (opn > 0.5 ? 1 : 0) : phase(s, 7.6, 7.98), 0, 0, pageMat.opacity);
    book.visible = alpha > 0.005;
    book.updateMatrixWorld();
    layer.updateMatrixWorld();
    qBook.copy(book.quaternion); // book and month layer share a parent; the layer never rotates

    // ---- the deals: revealed by the pull-back, then each flies into the report ----
    tiles.forEach((tl) => {
      const m = tl.m, mat = m.material as MeshBasicMaterial;
      const want = wide ? tl.texW : tl.texN;
      if (mat.map !== want) { mat.map = want; mat.needsUpdate = true; }
      const reveal = tl.d.main ? clamp01((mz - 0.72) / 0.28) : clamp01((mz - 0.15) / 0.5);
      let op = (still ? clamp01((mz - 0.25) / 0.5) : reveal) * (rz > 0 ? 0 : 1);
      m.position.copy(tl.slot);
      if (!still) m.position.z += Math.sin(t * 0.6 + tl.bob) * 0.03 * (1 - g);
      m.quaternion.identity();
      m.scale.set(tw, th, 1);
      if (still) op *= 1 - clamp01((s - 6.3) / 0.5);
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
