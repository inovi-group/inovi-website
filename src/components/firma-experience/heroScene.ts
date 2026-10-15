import {
  type PerspectiveCamera,
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
  Vector3,
  type Texture,
} from "three";
import { makeEnvelope } from "./envelope";
import { heroTune as T, LIMITS } from "./heroTuning";

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
type Item = { env: ReturnType<typeof makeEnvelope>; jit: number; lat: number; zr: number; sr: number; ph: number };

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
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uW0: { value: 0.04 }, uColor: { value: new Color(core ? "#b8f5dc" : "#2b9c80") }, uBody: { value: 0.5 }, uCoreK: { value: 0.22 }, uGlow: { value: 0.5 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uW0, uBody, uCoreK, uGlow; uniform vec3 uColor; varying vec2 vUv;
    ${NOISE}
    void main() {
      float y = 1.0 - vUv.y, x = abs(vUv.x - 0.5) * 2.0; // the plane is turned so its top (v = 1) is at the source
      float half_ = mix(uW0, 1.0, y) * ${core ? "0.4" : "1.0"};
      float edge = 1.0 - smoothstep(half_ * ${core ? "0.2" : "0.62"}, half_, x);
      float along = smoothstep(0.0, 0.04, y) * (1.0 - smoothstep(0.8, 1.0, y)) * ${core ? "pow(1.0 - y, 1.4)" : "mix(1.0, 0.7, y)"};
      float streaks = 0.75 + 0.25 * fbm(vec2(x / max(half_, 0.05) * 3.0, y * 2.0 - uTime * 0.04));
      float glow = exp(-pow(y * 14.0, 2.0)) * (1.0 - smoothstep(0.0, 0.3, x)) * 1.6; // the hot source
      float a = ${core ? "(edge * along * streaks * uCoreK + glow * uGlow)" : "edge * along * streaks * uBody"} * uAlpha;
      ${core ? "gl_FragColor = vec4(uColor * a, a);" : "gl_FragColor = vec4(uColor, a);"}
    }`,
  transparent: true, depthWrite: false, blending: core ? AdditiveBlending : NormalBlending,
});

// Aurora, inside the beam only: slow flowing ribbons of colour running down the cone, drawn on the beam's own
// plane and masked by the cone's edge, so none of it spreads across the rest of the background.
const auroraMaterial = () => new ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uW0: { value: 0.04 }, uIntensity: { value: 0.45 }, uMix: { value: new Vector3(1, 1, 0.5) } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform float uTime, uAlpha, uW0, uIntensity; uniform vec3 uMix; varying vec2 vUv;
    ${NOISE}
    float ribbon(float xn, float y, float c, float w, float sp, float f) {
      float cx = c + 0.18 * sin(y * f + uTime * sp) + 0.14 * (fbm(vec2(y * 2.0 - uTime * sp * 0.6, c * 9.0)) - 0.5);
      float d = (xn - cx) / w;
      float folds = 0.55 + 0.45 * fbm(vec2(xn * 10.0, y * 6.0 - uTime * sp * 2.5));
      return exp(-d * d) * folds;
    }
    void main() {
      float y = 1.0 - vUv.y, x = (vUv.x - 0.5) * 2.0;
      float half_ = mix(uW0, 1.0, y), xn = x / max(half_, 0.02); // -1 … 1 across the cone at this height
      float cone = 1.0 - smoothstep(0.6, 0.95, abs(xn));
      vec3 c = vec3(0.16, 0.86, 0.66) * ribbon(xn, y, -0.35, 0.18, 0.2, 3.1) * uMix.x
             + vec3(0.42, 0.42, 0.95) * ribbon(xn, y, 0.25, 0.2, 0.14, 2.3) * uMix.y
             + vec3(0.9, 0.7, 0.32) * ribbon(xn, y, 0.0, 0.1, 0.18, 4.0) * uMix.z;
      float a = uIntensity * cone * smoothstep(0.03, 0.18, y) * (1.0 - smoothstep(0.75, 1.0, y)) * uAlpha;
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
  aurora.renderOrder = -1.5; // over the beam's body, under the dust and envelopes
  const beams = [false, true].map((core) => { const m = new Mesh(new PlaneGeometry(1, 1), beamMaterial(core)); m.renderOrder = -2; return m; });
  hero.add(aurora, ...beams);

  // item 0 is the featured deal; it holds its place in the stream so it is on screen when the scroll begins.
  // Each item keeps its own random draws (jitter, side, depth, size); the tuning ranges map them every frame.
  const items: Item[] = Array.from({ length: LIMITS.envelopes }, (_, k) => {
    const env = makeEnvelope(face, makeSeal());
    hero.add(env.g);
    return k === 0
      ? { env, jit: 0, lat: 0.15, zr: 0.85, sr: 1, ph: 1.3 }
      : { env, jit: rnd() * 0.04, lat: rnd() * 2 - 1, zr: rnd(), sr: rnd(), ph: rnd() * 6.28 };
  });

  // stardust: fine particles drifting down through and around the cone
  const dust = Array.from({ length: LIMITS.dust }, () => ({ u: rnd(), lat: (rnd() * 2 - 1) * 0.95, z: lerp(-2.5, 1.2, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(new Float32Array(LIMITS.dust * 3), 3));
  dustGeo.setAttribute("color", new BufferAttribute(new Float32Array(LIMITS.dust * 3), 3));
  const dustMat = new PointsMaterial({ size: 0.05, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true });
  const stardust = new Points(dustGeo, dustMat);
  stardust.renderOrder = -1;
  hero.add(stardust);

  const E = new Vector3(), P1 = new Vector3(), dir = new Vector3(), perp = new Vector3(), pos = new Vector3(), mid = new Vector3();
  const warm = new Color("#ffe2a8");

  const ndc = new Vector3(), pickAt = new Vector3(), shift = new Vector3();
  // the aurora's own clock: the speed slider changes how fast it advances, so changing it never jumps the ribbons
  let auroraClock = 0, lastT = 0;
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
    });
    (beams[0].material as ShaderMaterial).uniforms.uColor.value.set(T.beamColor);

    // ---- aurora: inside the cone, on its own plane along the same axis, as far down as its length says ----
    auroraClock += Math.max(0, Math.min(0.1, t - lastT)) * T.auroraSpeed;
    lastT = t;
    const aLen = T.auroraLength, aMax = W0 + grow * aLen;
    aurora.position.copy(E).addScaledVector(dir, (L * aLen) / 2).setZ(E.z + 0.01);
    aurora.rotation.copy(beams[0].rotation);
    aurora.scale.set(aMax * 2, L * aLen, 1);
    const au = (aurora.material as ShaderMaterial).uniforms;
    au.uTime.value = auroraClock; au.uAlpha.value = fade; au.uW0.value = W0 / aMax;
    au.uIntensity.value = T.auroraIntensity; au.uMix.value.set(T.auroraTeal, T.auroraViolet, T.auroraGold);

    // ---- envelopes: out of the source, fanning out with the cone ----
    const count = Math.min(LIMITS.envelopes, Math.max(1, Math.round(T.envelopeCount * (wide ? 1 : 0.56))));
    items.forEach((it, k) => {
      const featured = k === 0;
      if (k >= count) { it.env.setOpacity(0); return; }
      // u: distance along the path in beam lengths; envelopes keep falling past the beam until they have faded
      const uEnd = T.fadeStart + T.fadeLength;
      const u0 = featured ? 0.5 : (k / count + it.jit) * uEnd;
      const u = featured || still ? u0 : (u0 + t * T.fallSpeed) % uEnd;
      const along = lerp(0.02, 0.98, u) * L;
      // never past half the cone's width, so even the largest envelope stays inside the light
      pos.copy(E).addScaledVector(dir, along).addScaledVector(perp, it.lat * halfAt(u) * T.emitterSpread);
      pos.z = lerp(E.z, lerp(T.depthFar, T.depthNear, it.zr), Math.min(1, u * 1.6)); // close together at the source, a little depth as they fall
      const sway = still ? 0 : T.rotation;
      const g = it.env.g;
      g.position.copy(pos);
      g.position.y += Math.sin(t * 0.4 + it.ph) * 0.05 * sway * u;
      g.rotation.set(0.18 + Math.sin(t * 0.21 + it.ph) * 0.12 * sway, Math.sin(t * 0.17 + it.ph * 1.7) * 0.4 * sway, tilt * 0.35 + Math.sin(t * 0.13 + it.ph) * 0.08 * sway);
      const size = featured ? 0.62 : lerp(T.sizeMin, T.sizeMax, it.sr);
      g.scale.setScalar(size * bs * lerp(0.35, 1, Math.min(1, u * 1.4))); // small as they emerge
      // lit by the beam: brighter near its axis
      // lit by the beam (brighter near its axis), less so once past its end
      const pastEnd = clamp01((u - 1.25) / 0.3);
      it.env.setLight((1 - Math.min(1, Math.abs(it.lat) * T.emitterSpread * 1.1)) * (1 - pastEnd));
      const ends = clamp01(u / 0.07) * (1 - clamp01((u - T.fadeStart) / T.fadeLength));
      if (featured) {
        if (!still && s > 0) {
          g.position.lerp(pickAt, pick);
          g.rotation.x *= 1 - pick; g.rotation.y *= 1 - pick; g.rotation.z *= 1 - pick;
          g.scale.setScalar(lerp(g.scale.x / bs, T.pickSize, pick) * bs);
          it.env.setLight(lerp(1, 0, pick));
        }
        it.env.setOpacity(still ? fade : s >= PICK_END ? 0 : 1);
      } else {
        g.position.z -= 3 * (1 - fade);
        it.env.setOpacity(ends * fade);
      }
    });

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
      const b = T.dustBrightness * (0.2 + 0.8 * inBeam) * d.mag * tw * fade * clamp01(u / 0.05) * clamp01((1 - u) / 0.15) * (1.1 - 0.5 * u);
      dc.set([warm.r * b, warm.g * b, warm.b * b], i * 3);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
    dustGeo.computeBoundingSphere();
    dustMat.size = T.dustSize * B.hh;
  }

  return { update };
}
