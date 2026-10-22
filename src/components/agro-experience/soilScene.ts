import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  RingGeometry,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { agroTune as T, AGRO_LIMITS } from "./agroTuning";

/**
 * AGRO's soil, in cutaway. A block of field floats over a faint grid under a soft column of light: crops on top,
 * a drip line along each row, and the cut face shows the strata, the roots and the probes that live underground.
 * The moisture under the field is a field function (same formula in the shader and here, for the sensors):
 * a baseline that is wetter with depth, a root zone that dries out, and a wetting front spreading down from
 * each dripper as water is dosed.
 *
 * Scroll steps: 0 hero (water breathing, sensors pulsing), 1 the probes underground, 2 the moisture map,
 * 3 the root zone dries, 4 water is dosed, 5 it stops at the bottom of the root zone, 6 a text message to a
 * basic phone, 7 many small plots. Reduced motion: no time-based movement, the scroll still tells the story.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (s: number, a: number, b: number) => ease(clamp01((s - a) / (b - a)));

// the block: 6 wide (x), 3 deep (z), 3.2 tall; its top at y = 1
export const BLOCK = { w: 6, d: 3, h: 3.2, top: 1 };
const LINES = [1.12, -0.08, -1.28];           // drip lines (z); each row of crops sits just behind its line
const ROWS = LINES.map((z) => z + 0.18);
const EMIT = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]; // drippers along each line (x)
const PROBES = [-2.0, 0.0, 2.05];              // probe positions along the cut face (x)
const SENSORS = [0.3, 0.8, 1.55];              // sensor depths below the surface (1 unit ≈ 40 cm)
const ROOT_BOTTOM = 1.25;                      // the wetting front stops here: the bottom of the root zone
const FACE_Z = BLOCK.d / 2;

// moisture at a point (x, z) at depth d: the same formula as the shader, without the noise on the front
function moisture(x: number, z: number, d: number, F: number, dry: number) {
  const base = 0.3 + 0.4 * smooth(1.3, 2.7, d) - dry * 0.2 * Math.exp(-(((d - 0.6) / 0.55) ** 2));
  let wet = 0;
  if (F > 0.001) {
    let w = 1e3;
    for (const lz of LINES) for (const ex of EMIT) w = Math.min(w, d + (0.9 * ((x - ex) ** 2 + (z - lz) ** 2)) / (0.25 + d));
    wet = (1 - smooth(F - 0.1, F + 0.05, w)) * (0.55 + 0.45 * clamp01(1 - w / F)) * smooth(0, 0.05, F);
  }
  return clamp01(base + 0.7 * wet);
}
function smooth(a: number, b: number, x: number) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
// the moisture field, shared by the soil and the roots
const FIELD = /* glsl */ `
  uniform float uF, uDry;
  float wetAt(vec3 p, float d, float jit, out float frontL) {
    // the plumes merge: the wetting front is the outer edge of all of them together
    float w = 1e3;
    for (int j = 0; j < 3; j++) {
      float lz = j == 0 ? ${LINES[0].toFixed(2)} : j == 1 ? ${LINES[1].toFixed(2)} : ${LINES[2].toFixed(2)};
      for (int i = 0; i < 6; i++) {
        float ex = -2.5 + float(i);
        float r2 = (p.x - ex) * (p.x - ex) + (p.z - lz) * (p.z - lz);
        w = min(w, d + 0.9 * r2 / (0.25 + d));
      }
    }
    w += jit;
    float inside = 1.0 - smoothstep(uF - 0.1, uF + 0.05, w);
    float wet = inside * (0.55 + 0.45 * clamp(1.0 - w / max(uF, 0.01), 0.0, 1.0)) * smoothstep(0.0, 0.05, uF);
    frontL = exp(-pow((w - uF) / 0.022, 2.0)) * smoothstep(0.02, 0.15, uF);
    return wet;
  }`;

function soilUniforms() {
  return {
    uTop: { value: BLOCK.top }, uTime: { value: 0 }, uF: { value: 0 }, uDry: { value: 0 }, uMap: { value: 0 }, uFlow: { value: 0 },
    uSoil0: { value: new Color() }, uSoil1: { value: new Color() }, uSoil2: { value: new Color() }, uWater: { value: new Color() },
    uLines: { value: 0.35 }, uGrain: { value: 1 }, uDepthShade: { value: 0.5 }, uWetDark: { value: 0.3 }, uWetTint: { value: 0.3 },
    uGlow: { value: 1 }, uSparkle: { value: 1 }, uMapK: { value: 0.6 },
  };
}
type SoilU = ReturnType<typeof soilUniforms>;

// One face of the block. vP is the point in the block's own space, so the strata and the water run on
// continuously across the faces.
function soilMaterial(shared: SoilU, face: Object3D, shade: number, isTop: boolean) {
  face.updateMatrix();
  return new ShaderMaterial({
    uniforms: { ...shared, uFace: { value: face.matrix.clone() }, uShade: { value: shade } },
    vertexShader: /* glsl */ `
      uniform mat4 uFace; varying vec3 vP;
      void main() { vP = (uFace * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTop, uTime, uMap, uFlow, uLines, uGrain, uDepthShade, uWetDark, uWetTint, uGlow, uSparkle, uMapK, uShade;
      uniform vec3 uSoil0, uSoil1, uSoil2, uWater;
      varying vec3 vP;
      ${NOISE}
      ${FIELD}
      void main() {
        float d = max(0.0, uTop - vP.y);
        vec2 hz = vec2(vP.x + vP.z * 0.9, vP.z - vP.x * 0.2);
        float b1 = 0.42 + 0.12 * (fbm(hz * 0.9) - 0.5);
        float b2 = 1.6 + 0.24 * (fbm(hz * 0.6 + 7.0) - 0.5);
        vec3 col = mix(uSoil0, uSoil1, smoothstep(b1 - 0.05, b1 + 0.05, d));
        col = mix(col, uSoil2, smoothstep(b2 - 0.08, b2 + 0.08, d));
        // grain and small stones
        vec2 gp = vec2(vP.x * 31.0 + vP.z * 17.0, d * 36.0 + vP.z * 29.0 - vP.x * 3.0);
        col *= 1.0 + uGrain * 0.26 * (noise(gp) - 0.5) + uGrain * 0.12 * (noise(gp * 3.1) - 0.5);
        float peb = smoothstep(0.8, 0.84, noise(gp * 0.21 + 3.0)) * smoothstep(b1, b1 + 0.25, d);
        col = mix(col, col * 1.45 + 0.02, peb * 0.6 * uGrain);
        ${isTop ? `
        // the surface: ridged rows where the crops grow
        float ridge = 0.5 + 0.5 * cos((vP.z - ${ROWS[0].toFixed(2)}) * 6.2832 / 1.2);
        col *= 0.8 + 0.35 * ridge;` : ""}
        col *= 1.0 - uDepthShade * 0.85 * smoothstep(0.0, 3.0, d);
        float ll = exp(-pow((d - b1) / 0.007, 2.0)) + exp(-pow((d - b2) / 0.007, 2.0));
        // water
        float frontL;
        float wet = wetAt(vP, d, 0.16 * (fbm(hz * 2.6 + vec2(0.0, d * 3.0)) - 0.5), frontL);
        float base = 0.3 + 0.4 * smoothstep(1.3, 2.7, d) - uDry * 0.2 * exp(-pow((d - 0.6) / 0.55, 2.0));
        float m = clamp(base + 0.7 * wet, 0.0, 1.0);
        ${isTop ? "wet *= 0.45; frontL = 0.0; // on the surface: damp patches, not rings" : "frontL *= 0.55 + 0.45 * wet;"}
        col *= 1.0 - uWetDark * wet;
        col = mix(col, col * 0.6 + uWater * 0.32, uWetTint * wet);
        // the moisture map: dry amber → green → water, with contour lines
        vec3 ramp = mix(vec3(0.88, 0.55, 0.22), vec3(0.27, 0.72, 0.46), smoothstep(0.16, 0.42, m));
        ramp = mix(ramp, uWater, smoothstep(0.5, 0.78, m));
        float fm = m * 9.0, iso = 1.0 - smoothstep(0.0, 1.2 * fwidth(fm) + 0.02, abs(fract(fm) - 0.5) * 2.0 - 0.94);
        col = mix(col, col * 0.5 + ramp * 0.16, uMap * uMapK) + ramp * iso * uMap * uMapK * 0.55;
        col += (uWater * 0.75 + vec3(0.2)) * frontL * uGlow * 0.55;
        float sp = noise(vec2(vP.x * 24.0 + vP.z * 13.0, (d - uTime * 0.22) * 26.0));
        col += uWater * smoothstep(0.86, 0.98, sp) * wet * uFlow * uSparkle * 0.8;
        col += vec3(0.85, 0.64, 0.29) * ll * uLines * 0.45 * (1.0 - uMap * 0.6);
        gl_FragColor = vec4(col * uShade, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// the crops: line drawings of young plants, swaying a little; they yellow when the roots run dry
function plantsMaterial() {
  return new ShaderMaterial({
    uniforms: { uTop: { value: BLOCK.top }, uTime: { value: 0 }, uHeight: { value: 0.42 }, uSway: { value: 1 }, uStress: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aRel; attribute vec3 aBase; attribute float aH;
      uniform float uTop, uTime, uHeight, uSway; varying float vH;
      void main() {
        vec3 p = vec3(aBase.x, uTop, aBase.y) + aRel * uHeight;
        float s = aRel.y * aRel.y * uSway * uHeight;
        p.x += sin(uTime * 0.9 + aBase.z) * 0.07 * s;
        p.z += cos(uTime * 0.7 + aBase.z * 1.3) * 0.04 * s;
        vH = aH;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uStress, uAlpha; varying float vH;
      void main() {
        vec3 healthy = mix(vec3(0.16, 0.42, 0.26), vec3(0.5, 0.9, 0.6), vH);
        vec3 dry = mix(vec3(0.36, 0.32, 0.16), vec3(0.78, 0.66, 0.32), vH);
        gl_FragColor = vec4(mix(healthy, dry, uStress * vH), 0.9 * uAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
}

// roots on the cut face: pale gold, lit with the water's colour once the front has reached them
function rootsMaterial() {
  return new ShaderMaterial({
    uniforms: { uF: { value: 0 }, uOpacity: { value: 0.45 }, uWater: { value: new Color() } },
    vertexShader: /* glsl */ `
      attribute float aDepth; attribute float aW; varying float vD; varying float vW;
      void main() { vD = aDepth; vW = aW; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uF, uOpacity; uniform vec3 uWater; varying float vD; varying float vW;
      void main() {
        float wet = (1.0 - smoothstep(uF - 0.12, uF + 0.02, vD)) * smoothstep(0.02, 0.1, uF);
        vec3 c = mix(vec3(0.9, 0.78, 0.55), uWater * 1.3 + 0.15, wet * 0.75);
        float a = uOpacity * (0.25 + 0.75 * vW) * (1.0 + wet * 0.8);
        gl_FragColor = vec4(c * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
}

// the drip line: a dark tube with water pulsing along it while the valve is open
function tubeMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uWater: { value: new Color() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlow; uniform vec3 uWater; varying vec2 vUv;
      void main() {
        float dash = smoothstep(0.55, 0.95, sin((vUv.x * 46.0 - uTime * 3.0) * 3.1416));
        vec3 c = vec3(0.1, 0.13, 0.15) + vec3(0.06) * smoothstep(0.3, 0.0, abs(vUv.y - 0.25));
        c += uWater * (0.25 + 0.75 * dash) * uFlow * 0.8;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// the column of light from above, behind the block
function beamMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0.3 }, uColor: { value: new Color() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAlpha; uniform vec3 uColor; varying vec2 vUv;
      ${NOISE}
      void main() {
        float y = 1.0 - vUv.y, x = abs(vUv.x - 0.5) * 2.0;
        float half_ = mix(0.35, 1.0, y);
        float edge = 1.0 - smoothstep(half_ * 0.45, half_, x);
        float along = smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(0.75, 1.0, y));
        float streaks = 0.75 + 0.25 * fbm(vec2(x / half_ * 4.0, y * 1.5 - uTime * 0.03));
        float a = edge * along * streaks * uAlpha;
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
}

// the floor: a faint hairline grid (the site's backdrop motif) fading out around a soft glow under the block
function plinthMaterial() {
  return new ShaderMaterial({
    uniforms: { uAlpha: { value: 0.5 }, uColor: { value: new Color("#3d8f6a") } },
    vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha; uniform vec3 uColor; varying vec2 vP;
      void main() {
        vec2 g = abs(fract(vP / 0.6) - 0.5) / (fwidth(vP) / 0.6);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float r = length(vP / vec2(1.0, 0.7));
        float fade = 1.0 - smoothstep(2.5, 9.0, r);
        float pool = exp(-pow(r / 3.4, 2.0)) * 0.35;
        float a = (line * 0.22 * fade + pool) * uAlpha;
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
}

function dotTexture() {
  const cv = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
  const c = cv.getContext("2d")!, g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace;
  return t;
}

type Fonts = { sans: string; mono: string };

// the depth ruler beside the cut face, and the root-zone bracket
function drawRuler(cv: HTMLCanvasElement, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height, k = H / BLOCK.h; // px per unit
  c.clearRect(0, 0, W, H);
  c.strokeStyle = "rgba(148,160,180,0.55)"; c.fillStyle = "rgba(148,160,180,0.8)"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(W - 6, 0); c.lineTo(W - 6, H); c.stroke();
  c.font = `500 ${Math.round(k * 0.13)}px ${F.mono}`; c.textAlign = "right"; c.textBaseline = "middle";
  for (let cm = 0; cm <= 120; cm += 10) {
    const y = (cm / 40) * k, major = cm % 20 === 0;
    c.beginPath(); c.moveTo(W - 6, y + 1.5); c.lineTo(W - (major ? 40 : 22), y + 1.5); c.stroke();
    if (major) c.fillText(cm === 0 ? "0" : `${cm} cm`, W - 52, Math.max(k * 0.08, y));
  }
}
function drawBracket(cv: HTMLCanvasElement, F: Fonts) {
  // a bracket opening to the right (it sits on the cut face, at its left edge), its label beside it
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = "#46b876"; c.lineWidth = 5;
  c.beginPath(); c.moveTo(34, 4); c.lineTo(6, 4); c.lineTo(6, H - 4); c.lineTo(34, H - 4); c.stroke();
  c.save(); c.translate(40, H / 2); c.rotate(-Math.PI / 2);
  c.fillStyle = "#7fe0a0"; c.font = `600 ${Math.round(W * 0.2)}px ${F.mono}`; c.textAlign = "center"; c.textBaseline = "middle";
  c.shadowColor = "rgba(10,13,19,0.9)"; c.shadowBlur = 8;
  c.fillText("ROOT ZONE", 0, 0);
  c.restore();
}

// a basic phone with AGRO's text message on its screen (no smartphone needed)
function drawPhone(cv: HTMLCanvasElement, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1b232d"); g.addColorStop(1, "#0f141b");
  rr(8, 8, W - 16, H - 16, 64); c.fillStyle = g; c.fill();
  c.lineWidth = 6; c.strokeStyle = "rgba(70,184,118,0.75)"; c.stroke();
  rr(W / 2 - 50, 40, 100, 12, 6); c.fillStyle = "#2a3441"; c.fill();
  // the screen
  const sx = 46, sy = 86, sw = W - 92, sh = H * 0.55;
  rr(sx, sy, sw, sh, 18); c.fillStyle = "#0c2419"; c.fill();
  c.lineWidth = 3; c.strokeStyle = "rgba(127,224,160,0.35)"; c.stroke();
  c.fillStyle = "#7fe0a0"; c.font = `700 30px ${F.mono}`; c.fillText("AGRO", sx + 26, sy + 52);
  c.fillStyle = "rgba(127,224,160,0.6)"; c.font = `500 22px ${F.mono}`; c.textAlign = "right"; c.fillText("SMS · 05:40", sx + sw - 24, sy + 50);
  c.textAlign = "left";
  c.fillStyle = "rgba(127,224,160,0.35)"; c.fillRect(sx + 24, sy + 72, sw - 48, 2);
  const lines = ["Plot 2: roots dry", "at 30 cm.", "", "Irrigate 25 min", "after 5 pm.", "", "Deep soil is wet:", "no extra water."];
  c.fillStyle = "#c9f5d8"; c.font = `600 29px ${F.mono}`;
  lines.forEach((l, i) => c.fillText(l, sx + 26, sy + 122 + i * 39));
  // keypad
  const ky = sy + sh + 26, kw = (W - 120) / 3, kh = (H - ky - 60) / 4;
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].forEach((k, i) => {
    const x = 60 + (i % 3) * kw, y = ky + Math.floor(i / 3) * kh;
    rr(x + 8, y + 6, kw - 16, kh - 12, 16); c.fillStyle = "#18202a"; c.fill();
    c.lineWidth = 2; c.strokeStyle = "#2a3441"; c.stroke();
    c.fillStyle = "#94a0b4"; c.font = `600 28px ${F.sans}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(k, x + kw / 2, y + kh / 2 + 2);
    c.textAlign = "left"; c.textBaseline = "alphabetic";
  });
}

type View = { w: number; h: number; aspect: number; wide: boolean };

export function createSoil({ stage, camera, fonts }: { stage: Group; camera: PerspectiveCamera; fonts: Fonts }) {
  let seed = 9173;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const textures: Texture[] = [];
  const texOf = (cv: HTMLCanvasElement) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; textures.push(t); return t; };
  const dot = dotTexture(); textures.push(dot);
  const view: View = { w: 1, h: 1, aspect: 1, wide: true };
  const fov = Math.tan((camera.fov * Math.PI) / 360);

  // world turns (the block and the farm), the stage keeps the light, the motes and the phone facing you
  const world = new Group();
  stage.add(world);
  const block = new Group();
  world.add(block);

  // ---- the soil body: three visible faces (front cut, right side, top) ----
  const SU = soilUniforms();
  const { w: W, d: D, h: H, top: TOP } = BLOCK;
  const faceDefs: [PlaneGeometry, (m: Mesh) => void, number, boolean][] = [
    [new PlaneGeometry(W, H, 1, 1), (m) => m.position.set(0, TOP - H / 2, D / 2), 1.0, false],
    [new PlaneGeometry(D, H, 1, 1), (m) => { m.position.set(W / 2, TOP - H / 2, 0); m.rotation.y = Math.PI / 2; }, 0.7, false],
    [new PlaneGeometry(W, D, 1, 1), (m) => { m.position.set(0, TOP, 0); m.rotation.x = -Math.PI / 2; }, 1.12, true],
  ];
  const plantsGeo = buildPlants(rnd);
  const plantsMat = plantsMaterial();
  const tubeMat = tubeMaterial();
  const tubeGeos = LINES.map((z) => new TubeGeometry(new CatmullRomCurve3([new Vector3(-W / 2 + 0.05, TOP + 0.2, z), new Vector3(W / 2 - 0.05, TOP + 0.2, z)]), 8, 0.03, 8, false));
  const edgeGeo = new EdgesGeometry(new BoxGeometry(W, H, D));
  const edgeMat = new LineBasicMaterial({ color: "#c9a04e", transparent: true, opacity: 0.35, depthWrite: false });
  const faceMats: ShaderMaterial[] = [];
  const faceGeos = faceDefs.map(([geo, place, shade, isTop]) => {
    const tmp = new Mesh(geo); place(tmp);
    faceMats.push(soilMaterial(SU, tmp, shade, isTop));
    return { geo, place };
  });
  // a block's "core": soil faces, edges, crops and drip lines (the farm's small plots are copies of it)
  function makeCore() {
    const g = new Group();
    faceGeos.forEach(({ geo, place }, i) => { const m = new Mesh(geo, faceMats[i]); place(m); g.add(m); });
    const edges = new LineSegments(edgeGeo, edgeMat);
    edges.position.y = TOP - H / 2;
    const plants = new LineSegments(plantsGeo, plantsMat);
    plants.frustumCulled = false;
    g.add(edges, plants, ...tubeGeos.map((t) => new Mesh(t, tubeMat)));
    return g;
  }
  block.add(makeCore());

  // ---- roots, drawn on the cut face under the front row ----
  const roots = new LineSegments(buildRoots(rnd), rootsMaterial());
  roots.renderOrder = 2;
  block.add(roots);

  // ---- the probes: a rod down through the soil, a head above the surface with its LED, three sensors ----
  const probeBody = new BoxGeometry(0.07, 1, 0.07), probeEdges = new EdgesGeometry(probeBody);
  const headGeo = new BoxGeometry(0.24, 0.16, 0.16), headEdges = new EdgesGeometry(headGeo);
  const bandGeo = new BoxGeometry(0.11, 0.05, 0.11);
  const ringGeo = new RingGeometry(0.92, 1, 56);
  const probes = PROBES.map((x, pi) => {
    const g = new Group();
    g.position.set(x, TOP, FACE_Z + 0.06);
    const len = SENSORS[2] + 0.12, above = 0.32;
    const rod = new Mesh(probeBody, new MeshBasicMaterial({ color: "#1d232c" }));
    rod.scale.y = len + above; rod.position.y = (above - len) / 2;
    const rodE = new LineSegments(probeEdges, new LineBasicMaterial({ color: "#8d9aaf", transparent: true, opacity: 0.6 }));
    rodE.scale.copy(rod.scale); rodE.position.copy(rod.position);
    const head = new Mesh(headGeo, new MeshBasicMaterial({ color: "#232b36" }));
    head.position.y = above;
    const headE = new LineSegments(headEdges, new LineBasicMaterial({ color: "#46b876", transparent: true, opacity: 0.9 }));
    headE.position.y = above;
    const led = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
    led.position.set(0, above, 0.1); led.scale.setScalar(0.32);
    g.add(rod, rodE, head, headE, led);
    const sensors = SENSORS.map((d, si) => {
      const band = new Mesh(bandGeo, new MeshBasicMaterial({ color: "#46b876" }));
      band.position.y = -d;
      const glow = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
      glow.position.set(0, -d, 0.06);
      const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
      ring.position.set(0, -d, -0.055); // on the cut face, around the sensor
      g.add(band, glow, ring);
      return { d, band, glow, ring, ph: rnd() + si * 0.33 + pi * 0.21, m: 0.3 };
    });
    block.add(g);
    return { x, g, led, sensors, above };
  });

  // ---- the gateway: a small mast with a solar panel at the back left corner; readings arc over to it ----
  const mast = new Group();
  mast.position.set(-W / 2 + 0.25, TOP, -D / 2 + 0.25);
  const pole = new Mesh(new BoxGeometry(0.06, 1.3, 0.06), new MeshBasicMaterial({ color: "#2a3441" }));
  pole.position.y = 0.65;
  const panel = new Mesh(new PlaneGeometry(0.62, 0.4), new MeshBasicMaterial({ color: "#1a2a3c" }));
  panel.position.set(0.12, 0.95, 0.1); panel.rotation.set(-0.9, 0.5, 0);
  const panelE = new LineSegments(new EdgesGeometry(new PlaneGeometry(0.62, 0.4, 3, 2)), new LineBasicMaterial({ color: "#5c6678" }));
  panelE.position.copy(panel.position); panelE.rotation.copy(panel.rotation);
  const tip = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  tip.position.y = 1.34; tip.scale.setScalar(0.5);
  mast.add(pole, panel, panelE, tip);
  block.add(mast);
  const tipLocal = new Vector3(mast.position.x, TOP + 1.34, mast.position.z);
  const arcs = probes.map((p) => {
    const a = new Vector3(p.x, TOP + p.above + 0.1, FACE_Z + 0.06);
    const curve = new QuadraticBezierCurve3(a, a.clone().lerp(tipLocal, 0.5).add(new Vector3(0, 1.1, 0)), tipLocal);
    const line = new Line(new BufferGeometry().setFromPoints(curve.getPoints(40)), new LineBasicMaterial({ color: "#46b876", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    block.add(line);
    return { curve, line };
  });

  // ---- labels: the depth ruler and the root zone ----
  const rulerCv = Object.assign(document.createElement("canvas"), { width: 180, height: 768 });
  const ruler = new Mesh(new PlaneGeometry(0.75, H), new MeshBasicMaterial({ map: texOf(rulerCv), transparent: true, depthWrite: false }));
  ruler.position.set(-W / 2 - 0.42, TOP - H / 2, FACE_Z);
  const brCv = Object.assign(document.createElement("canvas"), { width: 120, height: 300 });
  const bracket = new Mesh(new PlaneGeometry(0.48, ROOT_BOTTOM - 0.08), new MeshBasicMaterial({ map: texOf(brCv), transparent: true, depthWrite: false }));
  bracket.position.set(-W / 2 + 0.3, TOP - 0.08 - (ROOT_BOTTOM - 0.08) / 2, FACE_Z + 0.01);
  block.add(ruler, bracket);

  // ---- droplets from the drippers ----
  const dropGeo = new BufferGeometry();
  dropGeo.setAttribute("position", new BufferAttribute(new Float32Array(AGRO_LIMITS.droplets * 3), 3));
  dropGeo.setAttribute("color", new BufferAttribute(new Float32Array(AGRO_LIMITS.droplets * 3), 3));
  const dropMat = new PointsMaterial({ size: 0.05, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const drops = new Points(dropGeo, dropMat);
  drops.frustumCulled = false;
  block.add(drops);
  const dropSeeds = Array.from({ length: AGRO_LIMITS.droplets }, (_, i) => ({ e: i % (LINES.length * EMIT.length), ph: rnd() }));

  // ---- the farm: small copies of the plot around the main one, each reporting to the main gateway ----
  const FARM_S = 0.34;
  const farmSpots: [number, number][] = [[-2.6, -1.55], [0, -1.55], [2.6, -1.55], [-2.6, 0], [2.6, 0], [-2.6, 1.55], [0, 1.55], [2.6, 1.55]];
  const tiles = farmSpots.map(([x, z]) => {
    const g = makeCore();
    g.position.set(x, 0, z);
    const led = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
    led.position.set(0, TOP + 0.6, FACE_Z); led.scale.setScalar(0.9);
    g.add(led);
    g.visible = false;
    world.add(g);
    return { g, led, ph: rnd(), dist: Math.hypot(x, z) };
  });
  const farmLinks = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: "#46b876", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
  farmLinks.geometry.setAttribute("position", new BufferAttribute(new Float32Array(tiles.length * 6), 3));
  world.add(farmLinks);

  // ---- stage: the light, the floor, motes, the phone and the moving data dots ----
  const beam = new Mesh(new PlaneGeometry(1, 1), beamMaterial());
  beam.renderOrder = -2;
  const plinth = new Mesh(new PlaneGeometry(22, 22), plinthMaterial());
  plinth.rotation.x = -Math.PI / 2;
  plinth.renderOrder = -1;
  world.add(plinth);
  stage.add(beam);
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute("position", new BufferAttribute(new Float32Array(AGRO_LIMITS.motes * 3), 3));
  moteGeo.setAttribute("color", new BufferAttribute(new Float32Array(AGRO_LIMITS.motes * 3), 3));
  const moteMat = new PointsMaterial({ size: 0.035, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  stage.add(motes);
  const moteSeeds = Array.from({ length: AGRO_LIMITS.motes }, () => ({ x: rnd() * 2 - 1, y: rnd(), z: lerp(-3, 2.5, rnd()), sp: lerp(0.4, 1.2, rnd()), ph: rnd() * 6.28, mag: lerp(0.3, 1, rnd()) }));

  const phoneCv = Object.assign(document.createElement("canvas"), { width: 460, height: 820 });
  const phone = new Mesh(new PlaneGeometry(1.15, 2.05), new MeshBasicMaterial({ map: texOf(phoneCv), transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  phone.renderOrder = 10; // always in front of the plot
  stage.add(phone);
  const phoneGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  stage.add(phoneGlow);
  const phoneLink = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), new LineBasicMaterial({ color: "#46b876", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
  stage.add(phoneLink);

  const NSPARK = 16;
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(new Float32Array(NSPARK * 3), 3));
  sparkGeo.setAttribute("color", new BufferAttribute(new Float32Array(NSPARK * 3), 3));
  const sparks = new Points(sparkGeo, new PointsMaterial({ size: 0.16, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  sparks.frustumCulled = false;
  stage.add(sparks);

  const redraw = () => {
    drawRuler(rulerCv, fonts); drawBracket(brCv, fonts); drawPhone(phoneCv, fonts);
    textures.forEach((t) => { t.needsUpdate = true; });
  };
  redraw();

  // ---- per frame ----
  const AMBER = new Color("#e0913c"), GREEN = new Color("#46b876"), WATER = new Color();
  const ramp = (m: number, out: Color) => out.copy(AMBER).lerp(GREEN, smooth(0.16, 0.42, m)).lerp(WATER, smooth(0.5, 0.78, m));
  const tmpC = new Color(), v = new Vector3(), v2 = new Vector3();
  const toStage = (p: Vector3, from: Object3D) => stage.worldToLocal(from.localToWorld(p));

  // camera keyframes per story step: [turn, elevation, zoom, look-at height, shift right (wide screens)]
  const keys = () => [
    [T.heroYaw, T.heroElevation, T.heroZoom, -0.45, T.heroShiftX],
    [-0.2, 0.2, T.storyZoom, -0.75, 0.21],
    [-0.26, 0.24, T.storyZoom, -0.72, 0.21],
    [-0.2, 0.2, T.storyZoom * 1.04, -0.6, 0.21],
    [-0.34, 0.34, T.storyZoom, -0.5, 0.21],
    [-0.28, 0.26, T.storyZoom, -0.7, 0.21],
    [-0.5, 0.36, 0.66, -0.05, 0.13],
    [-0.62, 0.9, 0.78, -0.2, 0.21],
  ];

  function update({ s, t, still }: { s: number; t: number; still: boolean }) {
    const K = keys();
    const i0 = Math.min(K.length - 1, Math.floor(s)), i1 = Math.min(K.length - 1, i0 + 1), f = ease(clamp01(s - i0));
    const k = K[i0].map((a, j) => lerp(a, K[i1][j], f));
    const [yaw, elev, zoom, lookY, shift] = k;

    // ---- the story's state ----
    const hero = 1 - phase(s, 0.15, 0.9);
    const dry = phase(s, 2.2, 3.0);
    const watered = phase(s, 4.2, 5.0);
    const breathe = still ? 0 : Math.sin(t * 0.5) * 0.05;
    const front = hero * (0.78 + breathe) + lerp(0, ROOT_BOTTOM, phase(s, 3.75, 5.0));
    const flow = Math.max(hero, phase(s, 3.55, 3.85) * (1 - phase(s, 4.85, 5.15)), phase(s, 6.4, 7) * 0.6);
    const map = phase(s, 1.45, 2.0) * (1 - phase(s, 3.5, 4.0));
    const card = phase(s, 5.35, 5.85) * (1 - phase(s, 6.45, 6.85));
    const farm = phase(s, 6.3, 7.0);
    const zoneOn = phase(s, 0.6, 1.1) * (1 - phase(s, 5.5, 5.9));
    const data = Math.max(0.55 * hero, phase(s, 1.5, 1.9) * (1 - phase(s, 2.6, 3.0)), phase(s, 5.1, 5.5) * (1 - phase(s, 6.6, 7)), farm);

    WATER.set(T.waterColor);
    SU.uTime.value = t; SU.uF.value = front; SU.uDry.value = dry; SU.uMap.value = map; SU.uFlow.value = flow;
    SU.uSoil0.value.set(T.topsoil); SU.uSoil1.value.set(T.subsoil); SU.uSoil2.value.set(T.clay); SU.uWater.value.copy(WATER);
    SU.uLines.value = T.layerLines; SU.uGrain.value = T.grain; SU.uDepthShade.value = T.depthShade;
    SU.uWetDark.value = T.wetDarken; SU.uWetTint.value = T.wetTint; SU.uGlow.value = T.frontGlow; SU.uSparkle.value = T.sparkle; SU.uMapK.value = T.mapStrength;
    const pu = plantsMat.uniforms;
    pu.uTime.value = t; pu.uHeight.value = T.cropHeight; pu.uSway.value = still ? 0 : T.cropSway; pu.uStress.value = dry * (1 - watered) * 0.85;
    const ru = (roots.material as ShaderMaterial).uniforms;
    ru.uF.value = front; ru.uOpacity.value = T.rootOpacity * (1 - farm); ru.uWater.value.copy(WATER);
    tubeMat.uniforms.uTime.value = t; tubeMat.uniforms.uFlow.value = flow; tubeMat.uniforms.uWater.value.copy(WATER);

    // ---- the turn, the farm zoom-out ----
    world.rotation.y = yaw + (still ? 0 : Math.sin(t * 0.13) * 0.06 * T.drift * (0.4 + 0.6 * hero));
    const bs = lerp(1, FARM_S, farm);
    block.scale.setScalar(bs);
    roots.visible = farm < 0.95;
    ruler.visible = bracket.visible = farm < 0.5;
    (ruler.material as MeshBasicMaterial).opacity = (0.35 + 0.65 * Math.max(zoneOn, 0.3)) * (1 - farm * 2);
    (bracket.material as MeshBasicMaterial).opacity = zoneOn;

    // ---- sensors: their colour is the moisture they read; a ripple spreads on the cut face with each reading ----
    probes.forEach((p, pi) => {
      p.sensors.forEach((se) => {
        se.m = moisture(p.x, FACE_Z, se.d, front, dry);
        ramp(se.m, tmpC);
        (se.band.material as MeshBasicMaterial).color.copy(tmpC);
        const flag = se.d === SENSORS[1] ? phase(s, 2.4, 2.9) * (1 - watered) : 0; // the root-depth sensor flags the dry spell
        const beat = still ? 0.5 : (t * T.pulseSpeed + se.ph) % 1;
        const gm = se.glow.material as SpriteMaterial;
        gm.color.copy(tmpC); gm.opacity = Math.min(1, (0.55 + 0.45 * Math.exp(-beat * 6)) * T.probeGlow * (1 + flag * 0.8));
        se.glow.scale.setScalar(0.42 + 0.25 * flag * (still ? 1 : 0.5 + 0.5 * Math.sin(t * 6)));
        const rm = se.ring.material as MeshBasicMaterial;
        rm.color.copy(tmpC);
        se.ring.scale.setScalar(0.06 + beat * T.pulseSize * (1 + flag * 0.6));
        rm.opacity = still ? 0 : (1 - beat) * (1 - beat) * 0.7 * T.probeGlow * (1 - farm);
      });
      const lm = p.led.material as SpriteMaterial;
      lm.opacity = still ? 0.8 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + pi * 1.7));
      const am = arcs[pi].line.material as LineBasicMaterial;
      am.opacity = 0.28 * data * T.dataPulses * (1 - farm);
    });
    (tip.material as SpriteMaterial).opacity = 0.5 + 0.5 * data;

    // ---- droplets: falling from the drippers while the valve is open ----
    const nd = Math.min(AGRO_LIMITS.droplets, Math.round(T.dropletCount));
    const dp = dropGeo.attributes.position.array as Float32Array, dc = dropGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < nd; i++) {
      const ds = dropSeeds[i], e = ds.e;
      const x = EMIT[e % EMIT.length], z = LINES[Math.floor(e / EMIT.length)];
      const u = still ? ds.ph : (t * 0.9 + ds.ph) % 1;
      dp.set([x + 0.02 * Math.sin(ds.ph * 40), TOP + 0.17 - u * 0.17, z], i * 3);
      const b = flow * Math.sin(Math.PI * u) * 1.2;
      dc.set([WATER.r * b, WATER.g * b, WATER.b * b], i * 3);
    }
    dropGeo.setDrawRange(0, nd);
    dropGeo.attributes.position.needsUpdate = true; dropGeo.attributes.color.needsUpdate = true;
    dropMat.size = T.dropletSize * bs;

    // ---- the farm ----
    const lp = farmLinks.geometry.attributes.position.array as Float32Array;
    tiles.forEach((tl, i) => {
      const a = ease(clamp01(farm * 1.6 - tl.dist * 0.12));
      tl.g.visible = a > 0.01;
      tl.g.scale.setScalar(FARM_S * a);
      const lm = tl.led.material as SpriteMaterial;
      lm.opacity = a * (still ? 0.8 : 0.5 + 0.5 * Math.max(0, Math.sin(t * 2 + tl.ph * 6)));
      v.set(tl.g.position.x, (TOP + 0.6) * FARM_S, tl.g.position.z + FACE_Z * FARM_S);
      lp.set([v.x, v.y, v.z, tipLocal.x * bs, tipLocal.y * bs, tipLocal.z * bs], i * 6);
    });
    farmLinks.geometry.attributes.position.needsUpdate = true;
    farmLinks.geometry.computeBoundingSphere();
    (farmLinks.material as LineBasicMaterial).opacity = 0.35 * farm * T.dataPulses;

    // ---- stage: light, floor, motes ----
    plinth.position.y = (TOP - H) * bs - 0.35 * bs - 0.05;
    (plinth.material as ShaderMaterial).uniforms.uAlpha.value = T.plinthGrid;
    const bu = (beam.material as ShaderMaterial).uniforms;
    bu.uTime.value = t; bu.uAlpha.value = T.beamOpacity * (1 - 0.5 * farm); bu.uColor.value.set(T.beamColor);
    beam.position.set(0, TOP * bs + 3.2, -3.2);
    beam.scale.set(9 * T.beamWidth, 7.5, 1);
    const nm = Math.min(AGRO_LIMITS.motes, Math.round(T.motesCount * (view.wide ? 1 : 0.5)));
    const mp = moteGeo.attributes.position.array as Float32Array, mc = moteGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < nm; i++) {
      const m = moteSeeds[i];
      const y = still ? m.y : (((m.y - t * 0.008 * m.sp) % 1) + 1) % 1;
      const halfW = lerp(1.4, 4.2, 1 - y) * T.beamWidth;
      let x = m.x * halfW, z = m.z;
      if (!still) { x += Math.sin(t * 0.3 + m.ph) * 0.06; z += Math.cos(t * 0.25 + m.ph) * 0.06; }
      mp.set([x, TOP + 0.3 + y * 5.5, z], i * 3);
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * (1.1 + (i % 5) * 0.3) + m.ph);
      const b = T.motesBrightness * m.mag * tw * smooth(0, 0.15, y) * smooth(1, 0.8, y) * 0.5;
      mc.set([0.85 * b, 0.95 * b, 0.75 * b], i * 3);
    }
    moteGeo.setDrawRange(0, nm);
    moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;
    moteMat.size = 0.035;

    // ---- the camera ----
    placeCamera(elev, zoom, lookY, shift);

    // ---- the phone: beside the plot, facing you, linked to the gateway ----
    const wide = view.wide;
    phone.visible = phoneGlow.visible = phoneLink.visible = card > 0.01;
    if (phone.visible) {
      // a fixed place on screen (right of the plot; on phones, above it), at the plot's depth
      v.set(0, 0, 0).project(camera);
      phone.position.set(wide ? 0.8 : 0.55, (wide ? 0.04 : 0.5) - (1 - card) * 0.06, v.z).unproject(camera);
      stage.worldToLocal(phone.position);
      phone.quaternion.copy(camera.quaternion);
      const span = 2 * camera.position.distanceTo(phone.position) * fov; // the viewport's height at the phone's depth
      phone.scale.setScalar((span * (wide ? 0.46 : 0.34)) / 2.05);
      (phone.material as MeshBasicMaterial).opacity = card;
      phoneGlow.position.copy(phone.position).add(v.set(0, 0, -0.1));
      phoneGlow.scale.set(3.2, 4.4, 1);
      (phoneGlow.material as SpriteMaterial).opacity = 0.18 * card;
      const a = toStage(v.copy(tipLocal), block), b = phone.position.clone().add(v2.set(-0.6, 0.35, 0).applyQuaternion(phone.quaternion).multiplyScalar(phone.scale.x));
      (phoneLink.geometry.attributes.position.array as Float32Array).set([a.x, a.y, a.z, b.x, b.y, b.z]);
      phoneLink.geometry.attributes.position.needsUpdate = true;
      phoneLink.geometry.computeBoundingSphere();
      (phoneLink.material as LineBasicMaterial).opacity = 0.45 * card * T.dataPulses;
    }

    // ---- moving data dots: readings up the probes and over to the gateway, the gateway to the phone, plots to the gateway ----
    const sp = sparkGeo.attributes.position.array as Float32Array, sc = sparkGeo.attributes.color.array as Float32Array;
    let n = 0;
    const put = (p: Vector3, b: number) => { if (n >= NSPARK) return; sp.set([p.x, p.y, p.z], n * 3); sc.set([GREEN.r * b, GREEN.g * b, GREEN.b * b], n * 3); n++; };
    if (!still && T.dataPulses > 0) {
      probes.forEach((p, pi) => {
        const u = (t * 0.22 + pi * 0.37) % 1;
        const b = data * T.dataPulses * (1 - farm) * 1.4;
        if (b < 0.02) return;
        if (u < 0.4) put(toStage(v.set(p.x, TOP - lerp(SENSORS[1], -p.above, u / 0.4), FACE_Z + 0.12), block), b * Math.sin(Math.PI * Math.min(1, u / 0.4 + 0.05)));
        else put(toStage(arcs[pi].curve.getPoint((u - 0.4) / 0.6, v), block), b);
      });
      if (card > 0.05) {
        const u = (t * 0.45) % 1;
        const a = (phoneLink.geometry.attributes.position.array as Float32Array);
        put(v.set(lerp(a[0], a[3], u), lerp(a[1], a[4], u), lerp(a[2], a[5], u)), card * 1.6 * T.dataPulses);
      }
      if (farm > 0.05) tiles.forEach((tl, i) => {
        const u = (t * 0.3 + tl.ph) % 1;
        v.set(lerp(lp[i * 6], lp[i * 6 + 3], u), lerp(lp[i * 6 + 1], lp[i * 6 + 4], u), lerp(lp[i * 6 + 2], lp[i * 6 + 5], u));
        put(toStage(v, world), farm * 1.3 * T.dataPulses);
      });
    }
    sparkGeo.setDrawRange(0, n);
    sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
  }

  function placeCamera(elev: number, zoom: number, lookY: number, shift: number) {
    const { w, h, aspect, wide } = view;
    // the block (with its ruler, crops and mast) fits in about 8 × 5.6 units
    const hw = 4.3, hh = 2.9;
    let dist, ox, oy;
    if (wide) {
      dist = Math.max(hh / (fov * 0.86), hw / (fov * aspect * 0.56)) / zoom;
      ox = -w * shift; oy = 0;
    } else {
      dist = Math.max(hh / (fov * 0.5), hw / (fov * aspect * 0.98)) / zoom;
      ox = 0; oy = h * 0.16;
    }
    camera.aspect = aspect;
    camera.setViewOffset(w, h, ox, oy, w, h);
    camera.position.set(0, lookY + Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix();
  }

  return {
    update,
    setView(v: View) { Object.assign(view, v); },
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

// Young crops in rows on top of the block: a stem and a few arching leaves each, drawn as lines.
function buildPlants(rnd: () => number) {
  const rel: number[] = [], base: number[] = [], hs: number[] = [], pos: number[] = [];
  const seg = (a: number[], b: number[], bx: number, bz: number, ph: number, hf: number) => {
    for (const p of [a, b]) {
      rel.push(p[0], p[1], p[2]); base.push(bx, bz, ph); hs.push(Math.min(1, p[1] / hf));
      pos.push(bx + p[0] * 0.42, BLOCK.top + p[1] * 0.42, bz + p[2] * 0.42);
    }
  };
  for (const rz of ROWS) {
    for (let x = -2.7; x <= 2.71; x += 0.36) {
      const bx = x + (rnd() - 0.5) * 0.08, bz = rz + (rnd() - 0.5) * 0.06, ph = rnd() * 6.28, hf = lerp(0.75, 1.15, rnd());
      const lean = (rnd() - 0.5) * 0.12;
      const stem = (u: number) => [lean * u * u, u * hf, 0];
      for (let i = 0; i < 4; i++) seg(stem(i / 4), stem((i + 1) / 4), bx, bz, ph, hf);
      for (let l = 0; l < 4; l++) {
        const h = (0.22 + 0.19 * l) * hf, L = (0.5 - 0.07 * l) * hf, ang = ph + l * 2.4;
        const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx;
        const s0 = stem(h / hf);
        const pt = (u: number, side: number) => {
          const wdt = 0.09 * Math.sin(Math.PI * u) * L * side;
          return [s0[0] + dx * L * u + px * wdt, s0[1] + L * (0.5 * Math.sin(u * Math.PI * 0.85) - 0.3 * u * u), s0[2] + dz * L * u + pz * wdt];
        };
        for (const side of [-1, 0, 1]) for (let k = 0; k < 5; k++) seg(pt(k / 5, side), pt((k + 1) / 5, side), bx, bz, ph, hf);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aRel", new BufferAttribute(new Float32Array(rel), 3));
  g.setAttribute("aBase", new BufferAttribute(new Float32Array(base), 3));
  g.setAttribute("aH", new BufferAttribute(new Float32Array(hs), 1));
  return g;
}

// Roots under the front row, on the cut face: a few main roots wandering down into the root zone, with laterals.
function buildRoots(rnd: () => number) {
  const pos: number[] = [], depth: number[] = [], wts: number[] = [];
  const z = BLOCK.d / 2 + 0.004;
  const walk = (x: number, d: number, ang: number, steps: number, w0: number, branch: boolean) => {
    for (let i = 0; i < steps; i++) {
      ang += (rnd() - 0.5) * 0.5;
      ang = Math.max(-1.3, Math.min(1.3, ang * 0.96));
      const len = 0.045 + rnd() * 0.02;
      const nx = x + Math.sin(ang) * len, nd = d + Math.cos(ang) * len;
      if (nd > ROOT_BOTTOM - 0.05 || nx < -BLOCK.w / 2 + 0.05 || nx > BLOCK.w / 2 - 0.05) break;
      const w = w0 * (1 - i / steps);
      pos.push(x, BLOCK.top - d, z, nx, BLOCK.top - nd, z); depth.push(d, nd); wts.push(w, w);
      if (branch && rnd() < 0.14) walk(nx, nd, ang + (rnd() < 0.5 ? -1 : 1) * lerp(0.7, 1.2, rnd()), 6 + Math.floor(rnd() * 8), w * 0.55, false);
      x = nx; d = nd;
    }
  };
  for (let x = -2.7; x <= 2.71; x += 0.36) {
    const mains = 3 + Math.floor(rnd() * 2);
    for (let r = 0; r < mains; r++) walk(x + (rnd() - 0.5) * 0.05, 0.02, (rnd() - 0.5) * 1.2, 14 + Math.floor(rnd() * 12), 1, true);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aDepth", new BufferAttribute(new Float32Array(depth), 1));
  g.setAttribute("aW", new BufferAttribute(new Float32Array(wts), 1));
  return g;
}
