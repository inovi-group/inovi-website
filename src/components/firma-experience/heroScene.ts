import {
  type PerspectiveCamera,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  AdditiveBlending,
  NormalBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { ENV, makeEnvelope } from "./envelope";
const ENV_W = ENV.w;
import { heroTune as T, LIMITS } from "./heroTuning";

/**
 * The hero background. A spotlight shines down from a point at the top right; sealed contract envelopes come
 * out of that point and fan out as they fall, following the widening cone of light toward the middle bottom.
 * The stream is a register: each envelope is linked to the one before it by a fine gold thread (the hash link).
 * Behind the beam, slow aurora ribbons; in and around it, fine stardust catching the light. Everything is
 * drawn crisp (additive shaders, no blur pass). Envelopes inside the beam are lit by it.
 * When the visitor starts scrolling (story step 0 → 0.45), the best placed falling envelope is picked out
 * and carried to the deal's place, where the deal's own envelope takes over (and is scanned); the beam, aurora,
 * dust and the rest of the stream fade. Reduced motion: a still beam and aurora, no moving dust or envelopes.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Bounds = { cx: number; cy: number; hw: number; hh: number };
type Item = { env: ReturnType<typeof makeEnvelope>; jit: number; lat: number; zr: number; sr: number; ph: number; off: number; u: number; ends: number; size: number; cycle: number; delays: number };

export const PICK_END = 0.45; // by here the featured envelope has arrived and the deal's own envelope takes over

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// The light cone: uv.y runs from the source (0) down the axis (1); uv.x across. A dense, softly opaque body of
// green light (normal blending, so it reads as a solid shaft rather than a bright glare) that widens with
// distance, slow drifting streaks, and a brighter additive core with a hot source.
const beamMaterial = (core: boolean) => new ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uW0: { value: 0.04 }, uColor: { value: new Color(core ? "#b8f5dc" : "#2b9c80") }, uBody: { value: 0.5 }, uCoreK: { value: 0.22 }, uGlow: { value: 0.5 }, uFluct: { value: 1 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uW0, uBody, uCoreK, uGlow, uFluct; uniform vec3 uColor; varying vec2 vUv;
    ${NOISE}
    void main() {
      float y = 1.0 - vUv.y, x = abs(vUv.x - 0.5) * 2.0; // the plane is turned so its top (v = 1) is at the source
      // fluctuation: 0 = perfectly smooth and even; 1 = soft drifting streaks; above 1 the density flickers and
      // the edges ripple too
      float wild = max(0.0, uFluct - 1.0);
      float wave = 1.0 + 0.35 * wild * (fbm(vec2(y * 5.0 - uTime * 0.5, vUv.x < 0.5 ? 1.7 : 6.3)) - 0.5);
      float half_ = mix(uW0, 1.0, y) * ${core ? "0.4" : "1.0"} * wave;
      float edge = 1.0 - smoothstep(half_ * ${core ? "0.2" : "0.62"}, half_, x);
      float along = smoothstep(0.0, 0.04, y) * (1.0 - smoothstep(0.8, 1.0, y)) * ${core ? "pow(1.0 - y, 1.4)" : "mix(1.0, 0.7, y)"};
      float k = min(uFluct * 0.25, 0.85);
      float streaks = 1.0 - k + k * fbm(vec2(x / max(half_, 0.05) * (3.0 + 3.0 * wild), y * 2.0 - uTime * 0.04));
      streaks *= 1.0 - 0.45 * wild * fbm(vec2(y * 9.0 - uTime * 0.9, uTime * 0.3 + x * 2.0)); // flicker
      float glow = exp(-pow(y * 14.0, 2.0)) * (1.0 - smoothstep(0.0, 0.3, x)) * 1.6; // the hot source
      float a = ${core ? "(edge * along * streaks * uCoreK + glow * uGlow)" : "edge * along * streaks * uBody"} * uAlpha;
      ${core ? "gl_FragColor = vec4(uColor * a, a);" : "gl_FragColor = vec4(uColor, a);"}
    }`,
  transparent: true, depthWrite: false, blending: core ? AdditiveBlending : NormalBlending,
});

// Aurora, inside the beam only: slow flowing ribbons of colour running down the cone, drawn on the beam's own
// plane and masked by the cone's edge, so none of it spreads across the rest of the background.
const auroraMaterial = () => new ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uW0: { value: 0.04 }, uIntensity: { value: 0.45 }, uMix: { value: new Vector3(1, 1, 0.5) }, uCount: { value: 3 }, uWidth: { value: 0.17 }, uSpread: { value: 0.35 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uW0, uIntensity, uCount, uWidth, uSpread; uniform vec3 uMix; varying vec2 vUv;
    ${NOISE}
    float ribbon(float xn, float y, float c, float w, float sp, float f, float sw) {
      float cx = c + sw * (0.18 * sin(y * f + uTime * sp) + 0.14 * (fbm(vec2(y * 2.0 - uTime * sp * 0.6, c * 9.0)) - 0.5));
      float d = (xn - cx) / w;
      float folds = 0.55 + 0.45 * fbm(vec2(xn * 10.0, y * 6.0 - uTime * sp * 2.5));
      return exp(-d * d) * folds;
    }
    void main() {
      float y = 1.0 - vUv.y, x = (vUv.x - 0.5) * 2.0;
      // the aurora's plane is lim times as wide as the beam (lim = 1 up to spread 1, then the spread itself), so
      // xn runs −1 … 1 across the beam at each height and up to ±lim across the plane
      float lim = max(1.0, uSpread);
      float half_ = mix(uW0, 1.0, y), xn = x * lim / max(half_, 0.02);
      float cone = 1.0 - smoothstep(0.8 * lim, lim, abs(xn));
      // uCount ribbons spaced across the cone (xn is relative to the beam's width at each height, so they follow
      // its widening and slant). Spread 0 puts them all in the centre, 1 spaces them across the beam's full width,
      // 2 across twice its width (outside the beam). The sway shrinks near the outer edge. Colours cycle
      // teal, violet, gold.
      vec3 c = vec3(0.0);
      float span = uSpread * max(0.0, 0.88 - uWidth);
      float sw = clamp((0.98 * lim - span - uWidth) / 0.25, 0.0, 1.0);
      for (int i = 0; i < 8; i++) {
        if (float(i) >= uCount) break;
        float fi = float(i), m = mod(fi, 3.0);
        float cx = uCount < 1.5 ? 0.0 : -span + 2.0 * span * fi / (uCount - 1.0);
        vec3 col = m < 0.5 ? vec3(0.16, 0.86, 0.66) * uMix.x : m < 1.5 ? vec3(0.42, 0.42, 0.95) * uMix.y : vec3(0.9, 0.7, 0.32) * uMix.z;
        c += col * ribbon(xn, y, cx, uWidth, 0.14 + 0.03 * m, 2.3 + 0.8 * fi, sw);
      }
      float a = uIntensity * cone * smoothstep(0.03, 0.18, y) * (1.0 - smoothstep(0.75, 1.0, y)) * uAlpha;
      gl_FragColor = vec4(c * a, a * max(c.r, max(c.g, c.b)));
    }`,
  transparent: true, depthWrite: false, blending: AdditiveBlending,
});

// The glow an envelope radiates, hugging its rectangular shape: a rounded rectangle with a soft falloff,
// drawn on a plane a little larger than the envelope and turned with it.
const rectGlowMaterial = () => new ShaderMaterial({
  uniforms: { uHalf: { value: new Vector2(1.45, 0.95) }, uPlane: { value: new Vector2(4, 3) }, uFall: { value: 0.4 }, uColor: { value: new Color("#ffc561") }, uOpacity: { value: 0 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform vec2 uHalf, uPlane; uniform float uFall, uOpacity; uniform vec3 uColor; varying vec2 vUv;
    float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main() {
      vec2 p = (vUv - 0.5) * uPlane;
      float d = sdRound(p, uHalf, 0.14);
      float a = d < 0.0 ? 0.55 : exp(-d / max(uFall, 0.001)) * (1.0 - smoothstep(0.8, 1.0, d / (2.4 * uFall + 0.001)));
      a *= uOpacity;
      gl_FragColor = vec4(uColor * a, a);
    }`,
  transparent: true, depthWrite: false, blending: AdditiveBlending,
});
function dotTexture() {
  const cv = Object.assign(document.createElement("canvas"), { width: 32, height: 32 });
  const c = cv.getContext("2d")!, g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace;
  return t;
}

export function createHero(opts: { parent: Group; deal: Group; face: Texture; makeSeal: () => Emblem }) {
  const { parent, deal, face, makeSeal } = opts;
  const hero = new Group();
  parent.add(hero);
  let seed = 4111;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // aurora far behind, then the beam (a wide soft cone and a brighter inner core), then dust and envelopes
  const aurora = new Mesh(new PlaneGeometry(1, 1), auroraMaterial());
  aurora.renderOrder = -1.5; // over the beam's body, under the dust and envelopes
  const beams = [false, true].map((core) => { const m = new Mesh(new PlaneGeometry(1, 1), beamMaterial(core)); m.renderOrder = -2; return m; });
  hero.add(aurora, ...beams);

  // Each item keeps its own random draws (jitter, side, depth, size); the tuning ranges map them every frame.
  // The featured deal is not a fixed item: on scroll, whichever falling envelope is best placed is picked.
  const items: Item[] = Array.from({ length: LIMITS.envelopes }, () => {
    const env = makeEnvelope(face, makeSeal());
    hero.add(env.g);
    return { env, jit: rnd() * 0.04, lat: rnd() * 2 - 1, zr: rnd(), sr: rnd(), ph: rnd() * 6.28, off: 0, u: 0, ends: 0, size: 0, cycle: 0, delays: 0 };
  });
  let picked = -1, pickedU = 0, spawnKey = "";

  // stardust: fine particles drifting down through and around the cone
  const dust = Array.from({ length: LIMITS.dust }, () => ({ u: rnd(), lat: (rnd() * 2 - 1) * 0.95, z: lerp(-2.5, 1.2, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(new Float32Array(LIMITS.dust * 3), 3));
  dustGeo.setAttribute("color", new BufferAttribute(new Float32Array(LIMITS.dust * 3), 3));
  const dustMat = new PointsMaterial({ size: 0.05, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true });
  const stardust = new Points(dustGeo, dustMat);
  stardust.renderOrder = -1;
  hero.add(stardust);

  // each envelope's glow: a child of the envelope, just behind it, so it turns with it
  const glowGeo = new PlaneGeometry(1, 1);
  const glows = items.map((it) => {
    const m = new Mesh(glowGeo, rectGlowMaterial());
    m.renderOrder = -0.8;
    m.position.z = -ENV.d / 2 - 0.01;
    it.env.g.add(m);
    return m;
  });

  // the register's links: one segment from each envelope to the next one down the stream
  const linkGeo = new BufferGeometry();
  linkGeo.setAttribute("position", new BufferAttribute(new Float32Array(LIMITS.envelopes * 6), 3));
  linkGeo.setAttribute("color", new BufferAttribute(new Float32Array(LIMITS.envelopes * 6), 3));
  const links = new LineSegments(linkGeo, new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  links.renderOrder = -0.9;
  hero.add(links);
  const order: number[] = [];

  const E = new Vector3(), P1 = new Vector3(), dir = new Vector3(), perp = new Vector3(), pos = new Vector3(), mid = new Vector3();
  const warm = new Color("#ffe2a8");

  const ndc = new Vector3(), pickAt = new Vector3(), shift = new Vector3();
  // the aurora's own clock: the speed slider changes how fast it advances, so changing it never jumps the ribbons
  let auroraClock = 0, beamClock = 0, lastT = 0;
  function update({ s, t, still, wide, bounds: B, bc, bs, camera }: { s: number; t: number; still: boolean; wide: boolean; bounds: Bounds; bc: Vector3; bs: number; camera: PerspectiveCamera }) {
    // ---- where the featured envelope is picked and scanned: a place on screen (tunable), not the story's spot.
    // The whole deal view is shifted and scaled there for the scan, then glides back as the story begins.
    camera.updateMatrixWorld();
    ndc.copy(bc).project(camera);
    pickAt.set(ndc.x + 2 * T.pickX, 1 - 2 * T.pickY, ndc.z).unproject(camera);
    const hold = 1 - ease(clamp01((s - 1.1) / 0.6)); // 1 through the scan, back to 0 by story step 1.7
    shift.subVectors(pickAt, bc).multiplyScalar(hold);
    const ks = lerp(1, T.pickSize, hold);
    if (s < 1.7) { deal.scale.setScalar(ks); deal.position.copy(bc).multiplyScalar(1 - ks).add(shift); }
    // the source at the top right, the beam falling toward the middle bottom
    // (phones: the same settings, scaled to their taller, narrower framing)
    const nx = wide ? 1 : 1.047, ny = wide ? 1 : 0.905;
    E.set(B.cx + B.hw * T.sourceX * nx, B.cy + B.hh * T.sourceHeight * ny, T.sourceDepth);
    // the destination: the beam's axis, the envelopes' fall paths and the dust all run from E to P1
    P1.set(B.cx + B.hw * T.destX * (wide ? 1 : 0.833), B.cy + B.hh * T.destY * (wide ? 1 : 0.281), T.sourceDepth);
    dir.subVectors(P1, E);
    const L = dir.length() * T.beamLength;
    dir.normalize();
    perp.set(-dir.y, dir.x, 0);
    // the beam's half-width: W0 at the source, widening by the spread along its length (0 = parallel sides)
    const nw = wide ? 1 : 0.786, W0 = T.beamWidth * nw * B.hw, grow = T.beamSpread * nw * B.hw;
    const halfAt = (u: number) => W0 + grow * u;
    const tilt = Math.atan2(dir.y, dir.x) + Math.PI / 2;

    const pick = still ? 0 : ease(clamp01(s / PICK_END));
    const fade = still ? 1 - clamp01(s / 0.4) : 1 - ease(clamp01(s / 0.6));
    hero.visible = s < 1;
    if (s < 1) deal.visible = still ? s > 0.3 : s >= PICK_END;
    if (!hero.visible) return;

    auroraClock += Math.max(0, Math.min(0.1, t - lastT)) * T.auroraSpeed;
    beamClock += Math.max(0, Math.min(0.1, t - lastT)) * T.fluctuationSpeed;
    lastT = t;
    // ---- the beam ----
    const ext = 1.25; // the light carries on a little past the stream
    const Wmax = W0 + grow * ext; // the plane's half-width: the beam's width at its far end
    mid.copy(E).addScaledVector(dir, (L * ext) / 2);
    beams.forEach((m) => {
      m.position.copy(mid);
      m.rotation.set(0, 0, Math.atan2(dir.y, dir.x) + Math.PI / 2);
      m.scale.set(Wmax * 2, L * ext, 1);
      const u = (m.material as ShaderMaterial).uniforms;
      u.uTime.value = t; u.uAlpha.value = fade; u.uW0.value = W0 / Wmax;
      u.uBody.value = T.beamOpacity; u.uCoreK.value = T.beamBrightness; u.uGlow.value = T.coreGlow;
      u.uTime.value = beamClock; u.uFluct.value = T.beamFluctuation;
    });
    (beams[0].material as ShaderMaterial).uniforms.uColor.value.set(T.beamColor);

    // ---- aurora: inside the cone, on its own plane along the same axis, as far down as its length says ----
    const aLen = T.auroraLength, aMax = W0 + grow * aLen, aOut = Math.max(1, T.auroraSpread);
    aurora.position.copy(E).addScaledVector(dir, (L * aLen) / 2).setZ(E.z + 0.01);
    aurora.rotation.copy(beams[0].rotation);
    aurora.scale.set(aMax * 2 * aOut, L * aLen, 1);
    const au = (aurora.material as ShaderMaterial).uniforms;
    au.uTime.value = auroraClock; au.uAlpha.value = fade; au.uW0.value = W0 / aMax; // relative to the beam; the shader widens by the spread itself
    au.uIntensity.value = T.auroraIntensity; au.uMix.value.set(T.auroraTeal, T.auroraViolet, T.auroraGold);
    au.uCount.value = T.auroraRibbons; au.uWidth.value = T.auroraWidth; au.uSpread.value = T.auroraSpread;

    // ---- envelopes: out of the source, fanning out with the cone ----
    const count = Math.min(LIMITS.envelopes, Math.max(1, Math.round(T.envelopeCount * (wide ? 1 : 0.56))));
    const uEnd = T.fadeStart + T.fadeLength;
    const rawU = (it: Item, k: number) => (k / count + it.jit) * uEnd + it.off + (still ? 0 : t * T.fallSpeed);
    const flowU = (it: Item, k: number) => ((rawU(it, k) % uEnd) + uEnd) % uEnd;

    // ---- spawn spacing: no envelope starts right next to another ----
    // They all fall at the same speed, so two envelopes that start close (along the path and across it) stay
    // close. Their separation is measured where they are fully in view (60% down the beam), across the path,
    // along it (cyclic) and in depth; minimum: the slider, in widths of the largest envelope.
    const halfRef = halfAt(0.6) * T.emitterSpread, depthSpan = T.depthNear - T.depthFar;
    const dMin = T.minSpawnDistance * ENV_W * T.sizeMax * bs;
    const sep = (a: Item, ua: number, b: Item, ub: number) => {
      let du = Math.abs(ua - ub); du = Math.min(du, uEnd - du);
      return Math.hypot(du * L, (a.lat - b.lat) * halfRef, (a.zr - b.zr) * depthSpan * 0.5);
    };
    // try a few starting spots (side and depth) and keep the first that is clear, else the most open one
    const place = (k: number, u: number, others: number[]) => {
      const it = items[k];
      let best = { lat: it.lat, zr: it.zr, d: -1 };
      for (let tries = 0; tries < 16; tries++) {
        it.lat = rnd() * 2 - 1; it.zr = rnd();
        let d = Infinity;
        for (const j of others) d = Math.min(d, sep(it, u, items[j], items[j].u));
        if (d > best.d) best = { lat: it.lat, zr: it.zr, d };
        if (d >= dMin) break;
      }
      it.lat = best.lat; it.zr = best.zr;
      return best.d >= dMin;
    };
    const layoutKey = `${count}|${uEnd.toFixed(3)}|${T.emitterSpread}|${T.minSpawnDistance}|${T.sizeMax}|${wide}`;
    if (layoutKey !== spawnKey && picked < 0) {
      // the starting configuration: each envelope placed clear of the ones placed before it
      spawnKey = layoutKey;
      const placed: number[] = [];
      for (let k = 0; k < count; k++) {
        const it = items[k];
        it.off = 0; it.delays = 0;
        it.u = flowU(it, k);
        place(k, it.u, placed);
        it.cycle = Math.floor(rawU(it, k) / uEnd);
        placed.push(k);
      }
    }
    for (let k = 0; k < count; k++) items[k].u = k === picked ? pickedU : flowU(items[k], k);
    if (!still) {
      for (let k = 0; k < count; k++) {
        if (k === picked) continue;
        const it = items[k], cyc = Math.floor(rawU(it, k) / uEnd);
        if (cyc === it.cycle) continue;
        // it has wrapped round to the source: respawn it somewhere clear, or hold it back a moment (it waits
        // unseen at the far end of its path) and try again, rather than spawn in a cluster
        const others = [];
        for (let j = 0; j < count; j++) if (j !== k) others.push(j);
        it.sr = rnd(); it.ph = rnd() * 6.28;
        if (place(k, it.u, others) || it.delays >= 6) { it.cycle = cyc; it.delays = 0; }
        else { it.off -= 0.012 * uEnd; it.delays++; it.u = flowU(it, k); }
      }
    }
    // the stream: every envelope falls along the beam (u: distance along the path in beam lengths; they keep
    // falling past the beam's end until they have faded)
    items.forEach((it, k) => {
      if (k >= count) { it.env.setOpacity(0); return; }
      const u = it.u; // the picked one stops where it was taken from the stream
      const along = lerp(0.02, 0.98, u) * L;
      pos.copy(E).addScaledVector(dir, along).addScaledVector(perp, it.lat * halfAt(u) * T.emitterSpread);
      pos.z = lerp(E.z, lerp(T.depthFar, T.depthNear, it.zr), Math.min(1, u * 1.6)); // close together at the source, a little depth as they fall
      const sway = still ? 0 : T.rotation;
      const g = it.env.g;
      g.position.copy(pos);
      g.position.y += Math.sin(t * 0.4 + it.ph) * 0.05 * sway * u;
      g.rotation.set(0.18 + Math.sin(t * 0.21 + it.ph) * 0.12 * sway, Math.sin(t * 0.17 + it.ph * 1.7) * 0.4 * sway, tilt * 0.35 + Math.sin(t * 0.13 + it.ph) * 0.08 * sway);
      it.size = lerp(T.sizeMin, T.sizeMax, it.sr) * lerp(0.35, 1, Math.min(1, u * 1.4)); // small as they emerge
      g.scale.setScalar(it.size * bs);
      // lit by the beam (brighter near its axis), less so once past its end
      const pastEnd = clamp01((u - 1.25) / 0.3);
      it.env.setLight((1 - Math.min(1, Math.abs(it.lat) * T.emitterSpread * 1.1)) * (1 - pastEnd), T.envelopeGlow);
      it.ends = clamp01(u / 0.07) * (1 - clamp01((u - T.fadeStart) / T.fadeLength));
    });

    // ---- the pick: as the scroll begins, the best placed falling envelope is taken out of the stream ----
    if (s <= 0.001 && picked >= 0) {
      // back at the top: it rejoins the stream where it stands, and carries on falling from there
      const it = items[picked];
      it.off = 0;
      it.off = pickedU - flowU(it, picked);
      it.cycle = Math.floor(rawU(it, picked) / uEnd); // carrying on from where it stands is not a respawn
      picked = -1;
    }
    if (s > 0.001 && picked < 0) {
      // closest on screen to the scan position, fully visible, not small, and not about to fade
      ndc.copy(pickAt).project(camera);
      const px = ndc.x, py = ndc.y;
      let best = -1, bestScore = Infinity;
      items.forEach((it, k) => {
        if (k >= count || it.ends < 0.98 || it.u > T.fadeStart - 0.12 || it.u < 0.2) return;
        ndc.copy(it.env.g.position).project(camera);
        if (Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.92) return;
        const score = Math.hypot(ndc.x - px, ndc.y - py) - 0.4 * it.size;
        if (score < bestScore) { bestScore = score; best = k; }
      });
      if (best < 0) best = items.slice(0, count).reduce((b, it, k) => (it.ends > items[b].ends ? k : b), 0);
      picked = best; pickedU = items[best].u;
    }

    items.forEach((it, k) => {
      if (k >= count) return;
      const g = it.env.g;
      if (k === picked) {
        // pulled out and brought forward to the scan position, facing the viewer; the deal's own envelope
        // takes over from here (and is scanned)
        if (!still) {
          g.position.lerp(pickAt, pick);
          g.rotation.x *= 1 - pick; g.rotation.y *= 1 - pick; g.rotation.z *= 1 - pick;
          g.scale.setScalar(lerp(it.size, T.pickSize * T.scanZoom, pick) * bs); // the size the deal's envelope is scanned at
          it.env.setLight(lerp(1, 0, pick), T.envelopeGlow * (1 - pick));
        }
        it.env.setOpacity(still ? it.ends * fade : s >= PICK_END ? 0 : it.ends);
      } else {
        g.position.z -= 3 * (1 - fade);
        it.env.setOpacity(it.ends * fade);
      }
    });

    // ---- glow: each envelope radiates from its own rectangular edges ----
    const fall = 0.12 + 0.55 * T.glowRadius, margin = 2.4 * fall; // e^-2.4: the glow has all but faded by here
    items.forEach((it, k) => {
      const m = glows[k], u = (m.material as ShaderMaterial).uniforms;
      const a0 = k < count && it.env.g.visible ? (it.env.box.material as MeshBasicMaterial[])[4].opacity : 0;
      const on = a0 * T.envelopeGlow * (k === picked ? 1 - pick : 1);
      m.visible = on > 0.005 && T.glowRadius > 0;
      if (!m.visible) return;
      const pw = ENV.w + 2 * margin, ph = ENV.h + 2 * margin;
      m.scale.set(pw, ph, 1);
      u.uPlane.value.set(pw, ph); u.uHalf.value.set(ENV.w / 2, ENV.h / 2); u.uFall.value = fall;
      u.uOpacity.value = Math.min(1.5, 0.9 * on);
    });

    // ---- the register's links: envelopes in stream order, each joined to the next (bottom edge to top edge) ----
    order.length = 0;
    for (let k = 0; k < count; k++) if (k !== picked && items[k].env.g.visible) order.push(k);
    order.sort((a, b) => items[a].u - items[b].u);
    const lp = linkGeo.attributes.position.array as Float32Array, lc = linkGeo.attributes.color.array as Float32Array;
    let nl = 0;
    for (let i = 0; i + 1 < order.length && T.registerLinks > 0; i++) {
      const a = items[order[i]], b = items[order[i + 1]];
      const ga = a.env.g, gb = b.env.g;
      const al = Math.min(a.ends, b.ends) * fade * T.registerLinks;
      if (al < 0.01) continue;
      const ha = ENV.h * 0.5 * ga.scale.y, hb = ENV.h * 0.5 * gb.scale.y;
      lp.set([ga.position.x, ga.position.y - ha, ga.position.z, gb.position.x, gb.position.y + hb, gb.position.z], nl * 6);
      lc.set([0.85 * al, 0.62 * al, 0.26 * al, 0.85 * al, 0.62 * al, 0.26 * al], nl * 6);
      nl++;
    }
    linkGeo.setDrawRange(0, nl * 2);
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
    linkGeo.computeBoundingSphere();

    // ---- stardust ----
    const nd = Math.min(LIMITS.dust, Math.round(T.dustCount * (wide ? 1 : 0.42)));
    dustGeo.setDrawRange(0, nd);
    const dp = dustGeo.attributes.position.array as Float32Array, dc = dustGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < nd; i++) {
      const d = dust[i];
      const u = still ? d.u : (d.u + t * 0.006 * d.sp) % 1;
      pos.copy(E).addScaledVector(dir, u * L * ext).addScaledVector(perp, d.lat * halfAt(u));
      if (!still) { pos.x += Math.sin(t * 0.3 + d.ph) * 0.05; pos.y += Math.cos(t * 0.25 + d.ph * 1.3) * 0.05; }
      pos.z = d.z;
      dp.set([pos.x, pos.y, pos.z], i * 3);
      // catches the light inside the cone, faint outside it; twinkles as it turns
      const inBeam = 1 - clamp01((Math.abs(d.lat) - 0.7) / 0.3);
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * (1.1 + (i % 5) * 0.3) + d.ph);
      // light cast: dust near a glowing envelope picks up its light
      let lit = 0;
      if (T.lightCast > 0 && T.envelopeGlow > 0) {
        for (let k = 0; k < count; k++) {
          const g = items[k].env.g;
          if (!g.visible) continue;
          const r = ENV_W * g.scale.x * Math.max(0.6, T.glowRadius) * 0.6;
          const dx = g.position.x - pos.x, dy = g.position.y - pos.y;
          lit += Math.exp(-(dx * dx + dy * dy) / (r * r));
        }
        lit *= T.lightCast * T.envelopeGlow * 2.5;
      }
      const b = (1 + lit) * T.dustBrightness * (0.2 + 0.8 * inBeam) * d.mag * tw * fade * clamp01(u / 0.05) * clamp01((1 - u) / 0.15) * (1.1 - 0.5 * u);
      dc.set([warm.r * b, warm.g * b, warm.b * b], i * 3);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
    dustGeo.computeBoundingSphere();
    dustMat.size = T.dustSize * B.hh;
  }

  return { update };
}
