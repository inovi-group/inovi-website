import {
  AdditiveBlending,
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
  Vector3,
  type Texture,
} from "three";
import { makeEnvelope } from "./envelope";

/**
 * The hero background. A spotlight shines down from a point at the top right; sealed contract envelopes come
 * out of that point and fan out as they fall, following the widening cone of light toward the middle bottom.
 * Behind the beam, slow aurora ribbons; in and around it, fine stardust catching the light. Everything is
 * drawn crisp (additive shaders, no blur pass). Envelopes inside the beam are lit by it.
 * One envelope is the featured deal: when the visitor starts scrolling (story step 0 → 0.45) it is picked out
 * and carried to the deal's place, where the deal's own envelope takes over (and is scanned); the beam, aurora,
 * dust and the rest of the stream fade. Reduced motion: a still beam and aurora, no moving dust or envelopes.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Emblem = { g: Group; set(lock: number, ver: number, brk: number, alpha: number): void };
type Bounds = { cx: number; cy: number; hw: number; hh: number };
type Item = { env: ReturnType<typeof makeEnvelope>; u0: number; lat: number; z: number; size: number; ph: number };

export const PICK_END = 0.45; // by here the featured envelope has arrived and the deal's own envelope takes over

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// The light cone: uv.y runs from the source (0) down the axis (1); uv.x across. Soft edges that widen with
// distance, slow drifting streaks, brightest at the source and fading out toward the bottom.
const beamMaterial = (core: boolean) => new ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uW0: { value: 0.04 }, uColor: { value: new Color(core ? "#fff3d6" : "#f2c77a") } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uW0; uniform vec3 uColor; varying vec2 vUv;
    ${NOISE}
    void main() {
      float y = 1.0 - vUv.y, x = abs(vUv.x - 0.5) * 2.0; // the plane is turned so its top (v = 1) is at the source
      float half_ = mix(uW0, 1.0, y) * ${core ? "0.45" : "1.0"};
      float edge = 1.0 - smoothstep(half_ * 0.35, half_, x);
      float along = pow(1.0 - y, 0.9) * smoothstep(0.0, 0.03, y) * (1.0 - smoothstep(0.82, 1.0, y));
      float streaks = 0.65 + 0.35 * fbm(vec2(x / max(half_, 0.05) * 3.0, y * 2.0 - uTime * 0.04));
      float glow = exp(-pow(y * 14.0, 2.0)) * (1.0 - smoothstep(0.0, 0.25, x)) * 1.6; // the hot source
      float a = (edge * along * streaks + glow) * uAlpha * ${core ? "0.42" : "0.4"};
      gl_FragColor = vec4(uColor * a, a);
    }`,
  transparent: true, depthWrite: false, blending: AdditiveBlending,
});

// Aurora: slow flowing ribbons of colour, strongest behind the beam, kept away from the text on the left.
const auroraMaterial = () => new ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uMaskL: { value: 0.3 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uMaskL; varying vec2 vUv;
    ${NOISE}
    float ribbon(vec2 uv, float c, float w, float sp, float f) {
      float y = c + 0.12 * sin(uv.x * f + uTime * sp) + 0.1 * (fbm(vec2(uv.x * 2.0 + uTime * sp * 0.6, c * 9.0)) - 0.5);
      float d = (uv.y - y) / w;
      float curtain = 0.55 + 0.45 * fbm(vec2(uv.x * 14.0 - uTime * sp * 2.0, uv.y * 2.0)); // fine vertical folds
      return exp(-d * d) * curtain;
    }
    void main() {
      vec2 uv = vUv;
      vec3 c = vec3(0.12, 0.78, 0.72) * ribbon(uv, 0.66, 0.07, 0.05, 3.1)
             + vec3(0.48, 0.36, 0.96) * ribbon(uv, 0.5, 0.09, 0.035, 2.3)
             + vec3(0.85, 0.62, 0.28) * ribbon(uv, 0.36, 0.05, 0.045, 4.0) * 0.6;
      float mask = smoothstep(uMaskL, uMaskL + 0.35, uv.x) * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.75, uv.y);
      float a = 0.75 * mask * uAlpha;
      gl_FragColor = vec4(c * a, a * max(c.r, max(c.g, c.b)));
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
  aurora.renderOrder = -3;
  const beams = [false, true].map((core) => { const m = new Mesh(new PlaneGeometry(1, 1), beamMaterial(core)); m.renderOrder = -2; return m; });
  hero.add(aurora, ...beams);

  const MAX = 16;
  // item 0 is the featured deal; it holds its place in the stream so it is on screen when the scroll begins
  const items: Item[] = Array.from({ length: MAX }, (_, k) => {
    const env = makeEnvelope(face, makeSeal());
    hero.add(env.g);
    return k === 0
      ? { env, u0: 0.5, lat: 0.15, z: 0.6, size: 0.62, ph: 1.3 }
      : { env, u0: k / MAX + rnd() * 0.04, lat: rnd() * 2 - 1, z: lerp(-4.5, 1.4, rnd()), size: lerp(0.3, 0.6, rnd()), ph: rnd() * 6.28 };
  });

  // stardust: fine particles drifting down through and around the cone
  const DUST = { wide: 260, narrow: 110 };
  const dust = Array.from({ length: DUST.wide }, () => ({ u: rnd(), lat: (rnd() * 2 - 1) * 1.5, z: lerp(-5, 2, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(new Float32Array(DUST.wide * 3), 3));
  dustGeo.setAttribute("color", new BufferAttribute(new Float32Array(DUST.wide * 3), 3));
  const dustMat = new PointsMaterial({ size: 0.05, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true });
  const stardust = new Points(dustGeo, dustMat);
  stardust.renderOrder = -1;
  hero.add(stardust);

  const E = new Vector3(), P1 = new Vector3(), dir = new Vector3(), perp = new Vector3(), pos = new Vector3(), mid = new Vector3();
  const warm = new Color("#ffe2a8");

  function update({ s, t, still, wide, bounds: B, bc, bs }: { s: number; t: number; still: boolean; wide: boolean; bounds: Bounds; bc: Vector3; bs: number }) {
    // the source at the top right, the beam falling toward the middle bottom
    if (wide) { E.set(B.cx + B.hw * 0.86, B.cy + B.hh * 1.16, -1.2); P1.set(B.cx - B.hw * 0.42, B.cy - B.hh * 1.6, -1.2); }
    else { E.set(B.cx + B.hw * 0.9, B.cy + B.hh * 1.05, -1.2); P1.set(B.cx - B.hw * 0.35, B.cy - B.hh * 0.45, -1.2); }
    dir.subVectors(P1, E);
    const L = dir.length();
    dir.normalize();
    perp.set(-dir.y, dir.x, 0);
    const W1 = (wide ? 0.85 : 0.75) * B.hw, W0 = 0.035 * B.hw; // half-width of the cone at the bottom and at the source
    const halfAt = (u: number) => lerp(W0, W1, u);
    const tilt = Math.atan2(dir.y, dir.x) + Math.PI / 2;

    const pick = still ? 0 : ease(clamp01(s / PICK_END));
    const fade = still ? 1 - clamp01(s / 0.4) : 1 - ease(clamp01(s / 0.6));
    hero.visible = s < 1;
    if (s < 1) deal.visible = still ? s > 0.3 : s >= PICK_END;
    if (!hero.visible) return;

    // ---- the beam ----
    const ext = 1.25; // the light carries on a little past the stream
    mid.copy(E).addScaledVector(dir, (L * ext) / 2);
    beams.forEach((m) => {
      m.position.copy(mid);
      m.rotation.set(0, 0, Math.atan2(dir.y, dir.x) + Math.PI / 2);
      m.scale.set(W1 * 2 * ext, L * ext, 1);
      const u = (m.material as ShaderMaterial).uniforms;
      u.uTime.value = t; u.uAlpha.value = fade; u.uW0.value = W0 / (W1 * ext);
    });

    // ---- aurora: a wide plane far behind, covering the right of the view ----
    aurora.position.set(B.cx + B.hw * 0.4, B.cy + B.hh * 0.2, -9);
    aurora.scale.set(B.hw * 6, B.hh * 4.2, 1);
    const au = (aurora.material as ShaderMaterial).uniforms;
    au.uTime.value = t; au.uAlpha.value = fade; au.uMaskL.value = wide ? 0.32 : 0.05;

    // ---- envelopes: out of the source, fanning out with the cone ----
    const count = wide ? MAX : 9;
    items.forEach((it, k) => {
      const featured = k === 0;
      if (k >= count) { it.env.setOpacity(0); return; }
      const u = featured || still ? it.u0 : (it.u0 + t * 0.012) % 1;
      const along = lerp(0.02, 0.98, u) * L;
      pos.copy(E).addScaledVector(dir, along).addScaledVector(perp, it.lat * halfAt(u) * 0.9);
      pos.z = lerp(E.z, it.z, Math.min(1, u * 1.6)); // close together at the source, spread in depth as they fall
      const sway = still ? 0 : 1;
      const g = it.env.g;
      g.position.copy(pos);
      g.position.y += Math.sin(t * 0.4 + it.ph) * 0.05 * sway * u;
      g.rotation.set(0.18 + Math.sin(t * 0.21 + it.ph) * 0.12 * sway, Math.sin(t * 0.17 + it.ph * 1.7) * 0.4 * sway, tilt * 0.35 + Math.sin(t * 0.13 + it.ph) * 0.08 * sway);
      g.scale.setScalar(it.size * bs * lerp(0.35, 1, Math.min(1, u * 1.4))); // small as they emerge
      // lit by the beam: brighter near its axis
      it.env.setLight(1 - Math.min(1, Math.abs(it.lat) * 0.85));
      const ends = clamp01(u / 0.07) * clamp01((1 - u) / 0.1);
      if (featured) {
        if (!still && s > 0) {
          g.position.lerp(bc, pick);
          g.rotation.x *= 1 - pick; g.rotation.y *= 1 - pick; g.rotation.z *= 1 - pick;
          g.scale.setScalar(lerp(g.scale.x / bs, 1, pick) * bs);
          it.env.setLight(lerp(1, 0, pick));
        }
        it.env.setOpacity(still ? fade : s >= PICK_END ? 0 : 1);
      } else {
        g.position.z -= 3 * (1 - fade);
        it.env.setOpacity(ends * fade);
      }
    });

    // ---- stardust ----
    const nd = wide ? DUST.wide : DUST.narrow;
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
      const inBeam = 1 - clamp01((Math.abs(d.lat) - 0.6) / 0.6);
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * (1.1 + (i % 5) * 0.3) + d.ph);
      const b = 1.5 * (0.2 + 0.8 * inBeam) * d.mag * tw * fade * clamp01(u / 0.05) * clamp01((1 - u) / 0.15) * (1.1 - 0.5 * u);
      dc.set([warm.r * b, warm.g * b, warm.b * b], i * 3);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
    dustGeo.computeBoundingSphere();
    dustMat.size = 0.028 * B.hh;
  }

  return { update };
}
