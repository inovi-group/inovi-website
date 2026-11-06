import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DepthTexture,
  EdgesGeometry,
  Group,
  HalfFloatType,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from "three";
import { AGRO_DEFAULTS } from "../agro-experience/agroTuning";
import { beamMaterial, dotTexture, plinthMaterial, plotKit } from "../agro-experience/soilScene";
import { ENV, drawEnvelopeFace, drawWaxSeal, makeEnvelope, makeWaxSeal } from "../isale-experience/envelope";
import { rectGlowMaterial } from "../isale-experience/heroScene";
import { HERO_DEFAULTS } from "../isale-experience/heroTuning";
import { DepthOfFieldEffect, EffectPass } from "postprocessing";
import { homeTune as T } from "./homeTuning";
import { cameraPosition, objectYaws, stepRing, turnOf } from "./ringMotion";

/**
 * The home page's ring: one 3D scene, three objects on a turntable that physically turns.
 * iSale is the golden envelope with its crimson wax seal; AGRO a block of field in cutaway, a probe glowing in
 * its root zone and water under the crops; FIRMA, the platform under both, a dark certificate plate on which a
 * fine-line seal slowly certifies: a thin ring, a check, a subtle press and a soft light sweep. At the centre, on the floor, a gold ring through
 * all three and FIRMA's seal in the middle.
 *
 * The object at the front is close, large, sharp and lit (a soft column of light falls on it). The two at the
 * back recede in one of two ways (homeTune.depthMode):
 *   0  atmosphere (the default): no blur. The scene is rendered with its depth, then graded by depth: the
 *      objects behind the front one take on a haze, lose some saturation and contrast and are lit less, and
 *      they are drawn a little smaller. Their silhouettes take the grade of the object, so no bright fringe.
 *   1  depth of field: pmndrs postprocessing's DepthOfFieldEffect at full resolution, focused on the front.
 */
const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FLOOR_Y = -1.05;
export const PRODUCTS = ["isale", "agro", "firma"] as const;

type Fonts = { sans: string; mono: string };
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });

// Atmospheric depth, as a grade on the rendered scene: the further an object is behind the front one, the more
// haze, the less saturation and contrast and the less light. The empty background is left as it is; each pixel
// takes the strongest grade of its 3×3 neighbours, so an object's antialiased edge is graded with it.
function gradeMaterial() {
  return new ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: null }, uRes: { value: new Vector2(1, 1) },
      uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 7 }, uRange: { value: 1 }, uSpan: { value: 3 },
      uHaze: { value: 0.3 }, uHazeColor: { value: new Color() }, uDesat: { value: 0.5 }, uContrast: { value: 0.3 }, uDim: { value: 0.5 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform vec3 uHazeColor;
      uniform float uNear, uFar, uFocus, uRange, uSpan, uHaze, uDesat, uContrast, uDim;
      varying vec2 vUv;
      float back(vec2 uv) {
        float r = texture2D(tDepth, uv).r;
        if (r > 0.99999) return 0.0; // background
        float z = r * 2.0 - 1.0, d = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
        return smoothstep(uFocus + uRange, uFocus + uRange + uSpan, d);
      }
      void main() {
        vec4 col = texture2D(tColor, vUv);
        float k = 0.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) k = max(k, back(vUv + vec2(float(x), float(y)) / uRes));
        float l = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
        col.rgb = mix(col.rgb, vec3(l), k * uDesat);                       // less saturation
        col.rgb = mix(col.rgb, vec3(l * 0.6 + 0.02), k * uContrast);       // less contrast (toward a soft mid)
        col.rgb = mix(col.rgb, uHazeColor, k * uHaze);                     // haze
        col.rgb *= mix(1.0, uDim, k);                                      // less light
        gl_FragColor = col;
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
}

/** FIRMA's item on the ring: "seal" (the default, a fine-line seal certifying) or "chain" (a hash computed, then
 *  chained as a new block). Picked with ?firma=seal|chain on the home page. */
export type FirmaVariant = "seal" | "chain";

export function createRing({ camera, renderer, fonts, firma = "seal" }: { camera: PerspectiveCamera; renderer: WebGLRenderer; fonts: Fonts; firma?: FirmaVariant }) {
  let seed = 7741;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const textures: Texture[] = [];
  const texOf = (cv: HTMLCanvasElement) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; textures.push(t); return t; };
  const dot = dotTexture(); textures.push(dot);
  const scene = new Scene();
  const turntable = new Group();
  scene.add(turntable);

  // ---- FIRMA at the centre: the ring through all three, its seal in the middle, records travelling round ----
  const ring = new LineLoop(new BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new Vector3(Math.sin((i / 160) * TAU), 0, Math.cos((i / 160) * TAU)))),
    new LineBasicMaterial({ color: "#d9a34a", transparent: true, opacity: 0.5, depthWrite: false }));
  ring.position.y = FLOOR_Y;
  const ring2 = ring.clone(); ring2.material = (ring.material as LineBasicMaterial).clone();
  ring2.position.y = FLOOR_Y + 0.002;
  turntable.add(ring, ring2);
  const sealCv = canvasOf(256, 256);
  // muted bronze, in the same restrained palette as FIRMA's item (no crimson wax on the floor)
  const seal = new Mesh(new CircleGeometry(0.42, 48), new MeshBasicMaterial({ map: texOf(sealCv), color: "#7a6440", transparent: true, depthWrite: false }));
  seal.rotation.x = -Math.PI / 2; seal.position.y = FLOOR_Y + 0.01;
  const sealGlow = new Mesh(new CircleGeometry(1.2, 48), new MeshBasicMaterial({ map: dot, color: "#d9a34a", transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false }));
  sealGlow.rotation.x = -Math.PI / 2; sealGlow.position.y = FLOOR_Y + 0.005;
  turntable.add(sealGlow, seal);
  const records = [0, 1, 2].map(() => {
    const s = new Sprite(new SpriteMaterial({ map: dot, color: "#ffd98a", transparent: true, blending: AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(0.28);
    turntable.add(s);
    return s;
  });
  const floor = new Mesh(new PlaneGeometry(30, 30), plinthMaterial());
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y - 0.01; floor.renderOrder = -1;
  (floor.material as ShaderMaterial).uniforms.uColor.value.set("#3d6fae");
  scene.add(floor);

  // ---- the soft column of light on the front object (it stays put while the ring turns) ----
  const beam = new Mesh(new PlaneGeometry(1, 1), beamMaterial());
  beam.renderOrder = -2;
  scene.add(beam);
  const pool = new Mesh(new CircleGeometry(1.6, 48), new MeshBasicMaterial({ map: dot, color: "#7fa6e6", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);

  // ---- the three objects ----
  const slots = PRODUCTS.map(() => { const outer = new Group(), inner = new Group(); outer.add(inner); turntable.add(outer); return { outer, inner }; });

  // iSale: the iSale hero's own envelope: the same model, gold face, crimson wax seal (pressed), gold light and
  // rectangular edge glow, with the hero's tuned defaults (HERO_DEFAULTS)
  const faceCv = canvasOf(1024, Math.round((1024 * ENV.h) / ENV.w));
  const face = texOf(faceCv);
  const waxCv = canvasOf(256, 256);
  const sealColors = { seal: new Color(HERO_DEFAULTS.stampColor), ok: new Color("#46b876"), bad: new Color("#ef5a4c") };
  const env = makeEnvelope(face, makeWaxSeal(texOf(waxCv), sealColors));
  env.setOpacity(1);
  // its edges write depth here, so the depth modes keep them with the envelope rather than the background
  (env.edges.material as LineBasicMaterial).depthWrite = true;
  env.g.scale.setScalar(0.62);
  env.g.rotation.set(0.12, 0, -0.04);
  const envGlow = new Mesh(new PlaneGeometry(1, 1), rectGlowMaterial());
  envGlow.renderOrder = -0.8;
  envGlow.position.z = -ENV.d / 2 - 0.01;
  {
    const fall = 0.12 + 0.55 * HERO_DEFAULTS.glowRadius, margin = 2.4 * fall; // as in the hero
    const pw = ENV.w + 2 * margin, ph = ENV.h + 2 * margin, u = (envGlow.material as ShaderMaterial).uniforms;
    envGlow.scale.set(pw, ph, 1);
    u.uPlane.value.set(pw, ph); u.uHalf.value.set(ENV.w / 2, ENV.h / 2); u.uFall.value = fall;
  }
  env.g.add(envGlow);
  slots[0].inner.add(env.g);

  // AGRO: the Agro page's own plot, small: soil strata, crops, drip lines, water under the roots, a glowing probe
  const kit = plotKit(rnd);
  const plot = kit.makeCore();
  plot.scale.setScalar(0.27);
  plot.position.y = -0.15;
  const A = AGRO_DEFAULTS, SU = kit.SU;
  SU.uSoil0.value.set(A.topsoil); SU.uSoil1.value.set(A.subsoil); SU.uSoil2.value.set(A.clay); SU.uWater.value.set(A.waterColor);
  SU.uLines.value = A.layerLines; SU.uGrain.value = A.grain; SU.uDepthShade.value = A.depthShade;
  SU.uWetDark.value = A.wetDarken; SU.uWetTint.value = A.wetTint; SU.uGlow.value = A.frontGlow; SU.uSparkle.value = A.sparkle; SU.uMapK.value = 0;
  kit.plantsMat.uniforms.uHeight.value = A.cropHeight * 1.15;
  kit.tubeMat.uniforms.uWater.value.set(A.waterColor);
  const probe = new Group();
  probe.position.set(0.3, 1, 1.56);
  const rod = new Mesh(new BoxGeometry(0.09, 1.6, 0.09), new MeshBasicMaterial({ color: "#1d232c" }));
  rod.position.y = -0.5;
  const rodE = new LineSegments(new EdgesGeometry(new BoxGeometry(0.09, 1.6, 0.09)), new LineBasicMaterial({ color: "#8d9aaf" }));
  rodE.position.copy(rod.position);
  const head = new Mesh(new BoxGeometry(0.3, 0.2, 0.2), new MeshBasicMaterial({ color: "#232b36" }));
  head.position.y = 0.32;
  const headE = new LineSegments(new EdgesGeometry(new BoxGeometry(0.3, 0.2, 0.2)), new LineBasicMaterial({ color: "#46b876" }));
  headE.position.copy(head.position);
  const sensors = [0.3, 0.8].map((d) => {
    const s = new Sprite(new SpriteMaterial({ map: dot, color: "#5fe0c0", transparent: true, blending: AdditiveBlending, depthWrite: false }));
    s.position.set(0, -d, 0.08); s.scale.setScalar(0.8);
    probe.add(s);
    return s;
  });
  const led = new Sprite(new SpriteMaterial({ map: dot, color: "#46b876", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  led.position.set(0, 0.32, 0.14); led.scale.setScalar(0.6);
  probe.add(rod, rodE, head, headE, led);
  plot.add(probe);
  const plotGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#3fc1d8", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  plotGlow.scale.set(3.2, 2.2, 1); plotGlow.position.set(0, -0.3, -0.4);
  slots[1].inner.add(plotGlow, plot);

  // FIRMA: a certificate plate in the iSale/AGRO language (dark face, fine gold edge lines, a soft glow). On it, a
  // fine-line seal certifies, slowly: the ring draws itself, a check is written inside, the mark presses in a
  // touch, and a soft light sweeps across the plate. Then it fades and begins again.
  const GOLD = new Color("#cfa761"), GOLD_HI = new Color("#f1dcae");
  const cert = new Group();
  cert.rotation.set(0.1, 0, 0.02);
  cert.scale.setScalar(1.15);
  const PW = 1.5, PH = 1.04, PD = 0.04;
  const plateCv = canvasOf(1024, Math.round((1024 * PH) / PW));
  const plate = new Mesh(new BoxGeometry(PW, PH, PD), [
    ...Array.from({ length: 4 }, () => new MeshBasicMaterial({ color: "#1a1f29" })),
    new MeshBasicMaterial({ map: texOf(plateCv) }), new MeshBasicMaterial({ color: "#0d1017" }),
  ]);
  const plateEdge = new LineSegments(new EdgesGeometry(new BoxGeometry(PW, PH, PD)), new LineBasicMaterial({ color: "#cfa761", transparent: true, opacity: 0.55 }));
  cert.add(plate, plateEdge);
  const FZ = PD / 2 + 0.002; // z just in front of the plate's face
  const fine = (pts: Vector3[], opacity = 1) => {
    const line = new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: GOLD.clone(), transparent: true, opacity }));
    return line;
  };
  // the seal: two thin rings (each drawn twice, a hair apart, for a crisp fine line), tick marks between them
  const SX = 0, SY = 0.06, R1 = 0.3, R2 = 0.255;
  const circle = (r: number, n = 160) => Array.from({ length: n + 1 }, (_, i) => new Vector3(SX + Math.cos(Math.PI / 2 - (i / n) * TAU) * r, SY + Math.sin(Math.PI / 2 - (i / n) * TAU) * r, FZ));
  const cseal = new Group();
  const outer = [fine(circle(R1)), fine(circle(R1 + 0.004), 0.6)];
  const inner = [fine(circle(R2), 0.85), fine(circle(R2 - 0.004), 0.45)];
  const tickPts: Vector3[] = [];
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * TAU, a = R2 + 0.012, b = R1 - (i % 5 === 0 ? 0.008 : 0.02);
    tickPts.push(new Vector3(SX + Math.cos(t) * a, SY + Math.sin(t) * a, FZ), new Vector3(SX + Math.cos(t) * b, SY + Math.sin(t) * b, FZ));
  }
  const ticks = new LineSegments(new BufferGeometry().setFromPoints(tickPts), new LineBasicMaterial({ color: GOLD.clone(), transparent: true, opacity: 0 }));
  // the mark: one thin, unhurried check inside the ring (drawn as many points so it can be written progressively),
  // and a short signature rule under it
  const checkPath = [new Vector3(-0.115, 0.005, 0), new Vector3(-0.035, -0.075, 0), new Vector3(0.125, 0.095, 0)];
  const sigPts: Vector3[] = [];
  for (let k = 0; k < 2; k++) for (let i = 0; i < 110; i++) {
    const p = checkPath[k].clone().lerp(checkPath[k + 1], i / 110);
    sigPts.push(new Vector3(SX + p.x, SY + 0.01 + p.y, FZ));
  }
  sigPts.push(new Vector3(SX + checkPath[2].x, SY + 0.01 + checkPath[2].y, FZ));
  const signature = [fine(sigPts), fine(sigPts.map((p) => p.clone().setX(p.x + 0.003)), 0.6)];
  const under = fine([new Vector3(SX - 0.12, SY - 0.12, FZ), new Vector3(SX + 0.12, SY - 0.12, FZ)], 0.5);
  // the embossed disc: a slightly lighter face inside the ring that appears as the mark presses in
  const emboss = new Mesh(new CircleGeometry(R2 - 0.006, 96), new MeshBasicMaterial({ color: "#222a37", transparent: true, opacity: 0, depthWrite: false }));
  emboss.position.set(SX, SY, FZ - 0.001);
  cseal.add(emboss, ...outer, ...inner, ticks, ...signature, under);
  cert.add(cseal);
  // "VERIFIED" under the seal, fading in once the mark is made
  const okCv = canvasOf(512, 64);
  const okLabel = new Mesh(new PlaneGeometry(0.6, 0.075), new MeshBasicMaterial({ map: texOf(okCv), transparent: true, opacity: 0, depthWrite: false }));
  okLabel.position.set(SX, SY - R1 - 0.075, FZ);
  cert.add(okLabel);
  // the light sweep: a soft diagonal band crossing the plate's face
  const sweep = new Mesh(new PlaneGeometry(PW, PH), new ShaderMaterial({
    uniforms: { uPos: { value: -1 }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uPos, uAlpha; varying vec2 vUv;
      void main() {
        float d = (vUv.x * 1.4 + vUv.y * 0.6) - uPos;      // a diagonal band
        float k = exp(-d * d * 60.0) * uAlpha;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.72) * k, k);
      }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false,
  }));
  sweep.position.z = FZ + 0.001;
  cert.add(sweep);
  const firmaGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#cfa761", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  firmaGlow.scale.set(3.0, 2.2, 1); firmaGlow.position.set(0, 0, -0.5);
  slots[2].inner.add(firmaGlow, cert);

  // FIRMA, the chain variant: a document is fingerprinted (a scan line runs down it while its SHA3-512 hash types
  // out), the hash becomes a new block appended to a short chain of linked blocks, a verification pulse runs along
  // the links, and the chain settles into a quiet "anchored" state. Same plate language, fine lines, mono snippets.
  const chain = new Group();
  chain.rotation.set(0.1, 0, 0);
  chain.scale.setScalar(1.2);
  const HASH = "9f3a c27e 41d0 b8e5 07aa 3c19 e26f 5d84";
  // the document, top left
  const DOC = { w: 0.52, h: 0.66, x: -0.5, y: 0.2 };
  const docCv = canvasOf(384, 488);
  const doc = new Mesh(new BoxGeometry(DOC.w, DOC.h, 0.03), [
    ...Array.from({ length: 4 }, () => new MeshBasicMaterial({ color: "#1a1f29" })),
    new MeshBasicMaterial({ map: texOf(docCv) }), new MeshBasicMaterial({ color: "#0d1017" }),
  ]);
  doc.position.set(DOC.x, DOC.y, 0);
  const docEdge = new LineSegments(new EdgesGeometry(new BoxGeometry(DOC.w, DOC.h, 0.03)), new LineBasicMaterial({ color: "#cfa761", transparent: true, opacity: 0.55 }));
  docEdge.position.copy(doc.position);
  const scan = new Line(new BufferGeometry().setFromPoints([new Vector3(-DOC.w / 2 + 0.03, 0, 0), new Vector3(DOC.w / 2 - 0.03, 0, 0)]),
    new LineBasicMaterial({ color: "#f1dcae", transparent: true, opacity: 0 }));
  const scanGlow = new Mesh(new PlaneGeometry(DOC.w - 0.04, 0.06), new MeshBasicMaterial({ map: dot, color: "#cfa761", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  const scanner = new Group(); scanner.add(scan, scanGlow); scanner.position.set(DOC.x, DOC.y, 0.02);
  // the hash, typing out beside the document
  const hashCv = canvasOf(640, 200);
  const hashText = new Mesh(new PlaneGeometry(0.86, 0.27), new MeshBasicMaterial({ map: texOf(hashCv), transparent: true, depthWrite: false }));
  hashText.position.set(0.25, 0.3, 0.01);
  // the chain: three sealed blocks and the slot for the new one, along the bottom, linked by fine lines
  const BW = 0.34, BH = 0.25, BY = -0.36, BX = [-0.72, -0.27, 0.18, 0.63];
  const blocks = BX.map((x, i) => {
    const cv = canvasOf(320, 236);
    const m = new Mesh(new BoxGeometry(BW, BH, 0.05), [
      ...Array.from({ length: 4 }, () => new MeshBasicMaterial({ color: "#1a1f29", transparent: true })),
      new MeshBasicMaterial({ map: texOf(cv), transparent: true }), new MeshBasicMaterial({ color: "#0d1017", transparent: true }),
    ]);
    m.position.set(x, BY, 0);
    const e = new LineSegments(new EdgesGeometry(new BoxGeometry(BW, BH, 0.05)), new LineBasicMaterial({ color: "#cfa761", transparent: true, opacity: 0.5 }));
    e.position.copy(m.position);
    chain.add(m, e);
    return { m, e, cv, n: 1039 + i, isNew: i === 3 };
  });
  const links = BX.slice(0, 3).map((x) => {
    const l = new Line(new BufferGeometry().setFromPoints([new Vector3(x + BW / 2, BY, 0.026), new Vector3(x + 0.45 - BW / 2, BY, 0.026)]),
      new LineBasicMaterial({ color: "#cfa761", transparent: true, opacity: 0.7 }));
    chain.add(l);
    return l;
  });
  // the hash's path from the document down to the new block (a fine dashed drop)
  const dropPts = [new Vector3(0.25, 0.14, 0.02), new Vector3(0.25, -0.02, 0.02), new Vector3(BX[3], -0.02, 0.02), new Vector3(BX[3], BY + BH / 2, 0.02)];
  const drop = new Line(new BufferGeometry().setFromPoints(dropPts), new LineDashedMaterial({ color: "#cfa761", dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: 0 }));
  drop.computeLineDistances();
  // the verification pulse, travelling along the chain, and the anchored label under it
  const pulseDot = new Sprite(new SpriteMaterial({ map: dot, color: "#f1dcae", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  pulseDot.scale.setScalar(0.16);
  const anchorCv = canvasOf(640, 64);
  const anchored = new Mesh(new PlaneGeometry(1.0, 0.1), new MeshBasicMaterial({ map: texOf(anchorCv), transparent: true, opacity: 0, depthWrite: false }));
  anchored.position.set(-0.05, BY - 0.24, 0.01);
  chain.add(doc, docEdge, scanner, hashText, drop, pulseDot, anchored);
  const chainGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#cfa761", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  chainGlow.scale.set(3.0, 2.2, 1); chainGlow.position.set(0, 0, -0.5);
  slots[2].inner.add(chainGlow, chain);
  // one variant shows, the other is hidden (and skipped in update)
  const isChain = firma === "chain";
  cert.visible = firmaGlow.visible = !isChain;
  chain.visible = chainGlow.visible = isChain;

  function drawDoc(cv: HTMLCanvasElement) {
    const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#161b25"); g.addColorStop(1, "#0f131a");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#cfa761"; c.fillRect(30, 32, 12, 12);
    c.fillStyle = "#e7dcc4"; c.font = `600 24px ${fonts.sans}`; c.fillText("Record", 52, 45);
    c.fillStyle = "rgba(148,160,180,0.35)";
    [0.8, 0.64, 0.72, 0.5, 0.78, 0.6, 0.7, 0.42].forEach((w, i) => c.fillRect(30, 84 + i * 40, (W - 60) * w, 8));
    c.fillStyle = "rgba(148,160,180,0.6)"; c.font = `500 16px ${fonts.mono}`; c.fillText("contract_v3.pdf", 30, H - 30);
  }
  let hashShown = -1;
  function drawHash(cv: HTMLCanvasElement, n: number) {
    const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "rgba(148,160,180,0.75)"; c.font = `600 22px ${fonts.mono}`; c.fillText("SHA3-512", 8, 34);
    c.fillStyle = "#e7dcc4"; c.font = `500 30px ${fonts.mono}`;
    const shown = HASH.slice(0, n), parts = shown.split(" ");
    c.fillText(parts.slice(0, 4).join(" "), 8, 92);
    if (parts.length > 4) c.fillText(parts.slice(4).join(" "), 8, 138);
    if (n > 0 && n < HASH.length) { const w = c.measureText(parts.length > 4 ? parts.slice(4).join(" ") : parts.join(" ")).width; c.fillStyle = "#cfa761"; c.fillRect(12 + w, parts.length > 4 ? 114 : 68, 3, 28); }
    c.fillStyle = "rgba(148,160,180,0.5)"; c.font = `500 18px ${fonts.mono}`; c.fillText("…", 8, 176);
  }
  function drawBlock(b: (typeof blocks)[number]) {
    const c = b.cv.getContext("2d")!, W = b.cv.width, H = b.cv.height;
    c.fillStyle = "#121722"; c.fillRect(0, 0, W, H);
    c.fillStyle = b.isNew ? "#cfa761" : "rgba(207,167,97,0.75)"; c.font = `600 26px ${fonts.mono}`; c.fillText(`#${b.n}`, 22, 44);
    c.fillStyle = "rgba(148,160,180,0.7)"; c.font = `500 19px ${fonts.mono}`;
    const prev = ["0000…0000", "b1e4…77a2", "4c0d…19fe", "e83b…a610"][b.n - 1039];
    const own = b.isNew ? "9f3a…5d84" : ["b1e4…77a2", "4c0d…19fe", "e83b…a610"][b.n - 1039];
    c.fillText(`prev ${prev}`, 22, 112);
    c.fillStyle = "#e7dcc4"; c.fillText(`hash ${own}`, 22, 150);
    c.fillStyle = "rgba(148,160,180,0.45)"; c.font = `500 16px ${fonts.mono}`; c.fillText("ed25519 ✓", 22, 204);
  }
  function drawAnchored(cv: HTMLCanvasElement) {
    const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#cfa761"; c.font = `600 28px ${fonts.mono}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("✓  ANCHORED · CHAIN INTACT", W / 2, H / 2 + 2);
  }

  // the plate's face: a faint grid, the FIRMA mark top left, the record's hash and signature scheme along the bottom
  function drawPlate(cv: HTMLCanvasElement) {
    const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#151a24"); g.addColorStop(1, "#0e1219");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(207,167,97,0.06)"; c.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = "rgba(207,167,97,0.55)"; c.lineWidth = 3;
    const k = 46;
    c.beginPath(); c.moveTo(34, 34 + k); c.lineTo(34, 34); c.lineTo(34 + k, 34);
    c.moveTo(W - 34, H - 34 - k); c.lineTo(W - 34, H - 34); c.lineTo(W - 34 - k, H - 34); c.stroke();
    c.fillStyle = "#cfa761"; c.fillRect(64, 62, 16, 16);
    c.fillStyle = "#e7dcc4"; c.font = `600 34px ${fonts.sans}`; c.fillText("FIRMA", 94, 80);
    c.fillStyle = "rgba(148,160,180,0.75)"; c.font = `500 20px ${fonts.mono}`;
    c.textAlign = "right"; c.fillText("RECORD 0042", W - 64, 80); c.textAlign = "left";
    c.fillStyle = "rgba(148,160,180,0.6)"; c.font = `500 19px ${fonts.mono}`;
    c.fillText("sha3-512  9f3a…c27e", 64, H - 74);
    c.textAlign = "right"; c.fillText("ed25519 · signed", W - 64, H - 74); c.textAlign = "left";
  }
  function drawVerified(cv: HTMLCanvasElement) {
    const c = cv.getContext("2d")!, W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#cfa761"; c.font = `600 30px ${fonts.mono}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("V E R I F I E D", W / 2, H / 2 + 2);
  }
  const redraw = () => {
    drawWaxSeal(sealCv, fonts.sans); drawWaxSeal(waxCv, fonts.sans);
    drawEnvelopeFace(faceCv);
    drawPlate(plateCv); drawVerified(okCv);
    drawDoc(docCv); blocks.forEach(drawBlock); drawAnchored(anchorCv); hashShown = -1;
    textures.forEach((t) => { t.needsUpdate = true; });
  };
  redraw();

  // ---- depth: atmosphere (render with depth, then grade) or depth of field (pmndrs postprocessing) ----
  const size = new Vector2();
  const rt = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4, depthTexture: new DepthTexture(1, 1) });
  const grade = gradeMaterial();
  const post = new Scene(), postCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new Mesh(new PlaneGeometry(2, 2), grade);
  quad.frustumCulled = false;
  post.add(quad);

  const glows = [null, plotGlow, firma === "chain" ? chainGlow : firmaGlow];
  // depth of field: pmndrs DepthOfFieldEffect, made the first time it is switched on. It runs on the same
  // render (full resolution, multisampled, half float, linear) as the atmosphere grade, with its depth.
  let dofChain: { pass: EffectPass; effect: DepthOfFieldEffect; w: number; h: number } | null = null;
  const dofChainOf = () => {
    if (dofChain) return dofChain;
    const effect = new DepthOfFieldEffect(camera, { worldFocusDistance: 7, worldFocusRange: 1.5, bokehScale: 3, resolutionScale: 1 });
    const pass = new EffectPass(camera, effect);
    pass.renderToScreen = true;
    pass.initialize(renderer, false, HalfFloatType);
    pass.setDepthTexture(rt.depthTexture!);
    dofChain = { pass, effect, w: 0, h: 0 };
    return dofChain;
  };
  const anchor = new Vector3(), v = new Vector3(), v2 = new Vector2(), ray = new Raycaster();
  let rot = 0; // the turntable's angle: product i is at the front when rot = i (in thirds of a turn; only 0 and 1 are used)

  function update({ target, t, dt, still, w, h }: { target: number; t: number; dt: number; still: boolean; w: number; h: number }) {
    // the ring turns toward the target (eased); still: it jumps
    rot = still ? target : stepRing(rot, target, dt, T.turnSpeed);
    const R = T.ringRadius, sp = still ? 0 : T.spin;
    turntable.rotation.y = turnOf(rot);
    ring.scale.set(R, 1, R); ring2.scale.set(R + 0.06, 1, R + 0.06);
    (ring.material as LineBasicMaterial).opacity = 0.55 * T.firmaRing;
    (ring2.material as LineBasicMaterial).opacity = 0.25 * T.firmaRing;
    (seal.material as MeshBasicMaterial).opacity = Math.min(1, 1.4 * T.firmaRing);
    (sealGlow.material as MeshBasicMaterial).opacity = 0.3 * T.firmaRing;
    records.forEach((r, i) => {
      const a = ((i / 3 + (still ? 0.1 : t * 0.06)) % 1) * TAU;
      r.position.set(Math.sin(a) * R, FLOOR_Y + 0.02, Math.cos(a) * R);
      (r.material as SpriteMaterial).opacity = 0.8 * T.firmaRing;
    });

    // the camera: in front of the ring, a little above, looking at the front object
    camera.aspect = w / h;
    const cp = cameraPosition({ R, distance: T.cameraDistance, elevation: T.elevation, aspect: w / h });
    camera.position.set(cp.x, cp.y, cp.z);
    camera.lookAt(0, -0.05, R * 0.55);
    camera.updateProjectionMatrix();

    const yaws = objectYaws({ turn: turntable.rotation.y, R, cam: camera.position, t, spin: sp, envMaxYaw: T.envMaxYaw });
    slots.forEach((s, i) => {
      const a = (i * TAU) / 3;
      s.outer.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      // its yaw (see ringMotion.ts): a quarter of its way round the ring, easing through 0° across the very back,
      // a gentle sway, and for the envelope a clamp to within envMaxYaw of facing the camera
      s.outer.rotation.y = yaws[i].outer;
      s.inner.rotation.y = yaws[i].inner;
      const front = Math.max(0, Math.cos(a + turntable.rotation.y)); // 1 when this one is at the front
      s.inner.position.y = sp * Math.sin(t * 0.6 + i * 2) * 0.06;
      // the ones at the back are drawn a little smaller than perspective alone makes them (atmosphere mode)
      s.outer.scale.setScalar(T.objectScale * (T.depthMode >= 1 ? 1 : lerp(T.backScale, 1, front)));
      const glow = glows[i];
      if (glow) (glow.material as SpriteMaterial).opacity = (0.12 + 0.28 * front) * T.frontGlow;
    });
    // iSale: lit and glowing like the hero's envelopes (in the beam), its edge glow as strong as theirs
    const fFront = Math.max(0, Math.cos(turntable.rotation.y));
    env.setLight(1, HERO_DEFAULTS.envelopeGlow);
    env.g.rotation.x = 0.12 + sp * Math.sin(t * 0.4) * 0.05;
    (envGlow.material as ShaderMaterial).uniforms.uOpacity.value = Math.min(1.5, 0.9 * HERO_DEFAULTS.envelopeGlow) * lerp(0.35, 1, fFront) * T.frontGlow;
    // AGRO: water breathing under the crops, sensors pulsing
    SU.uTime.value = t; SU.uF.value = 0.85 + (still ? 0 : Math.sin(t * 0.5) * 0.06); SU.uFlow.value = 1; SU.uDry.value = 0; SU.uMap.value = 0;
    kit.plantsMat.uniforms.uTime.value = t; kit.plantsMat.uniforms.uSway.value = still ? 0 : 1;
    kit.tubeMat.uniforms.uTime.value = t; kit.tubeMat.uniforms.uFlow.value = 1;
    sensors.forEach((s, j) => { (s.material as SpriteMaterial).opacity = still ? 0.9 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + j * 1.6)); });
    (led.material as SpriteMaterial).opacity = still ? 0.9 : 0.5 + 0.5 * Math.max(0, Math.sin(t * 3));
    // FIRMA, chain variant: one cycle every 10 s (still: the finished, anchored chain)
    if (isChain) {
      const P = 10, u = still ? 0.8 : (t % P) / P;
      const ease = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
      const fade = still ? 1 : 1 - ease((u - 0.9) / 0.1);
      // 6–34%: the scan runs down the document while the hash types out
      const sc = still ? 1 : (u - 0.06) / 0.28;
      const scanning = sc > 0 && sc < 1;
      scanner.position.y = DOC.y + DOC.h / 2 - 0.04 - (DOC.h - 0.08) * Math.min(1, Math.max(0, sc));
      (scan.material as LineBasicMaterial).opacity = scanning ? 0.9 : 0;
      (scanGlow.material as MeshBasicMaterial).opacity = scanning ? 0.35 : 0;
      const n = Math.round(HASH.length * ease(sc));
      if (n !== hashShown) { hashShown = n; drawHash(hashCv, n); (hashText.material as MeshBasicMaterial).map!.needsUpdate = true; }
      (hashText.material as MeshBasicMaterial).opacity = fade;
      // 36–50%: the hash drops to the end of the chain and becomes the new block
      const dr = still ? 0 : ease((u - 0.36) / 0.08) * (1 - ease((u - 0.5) / 0.06));
      (drop.material as LineDashedMaterial).opacity = 0.8 * dr;
      const nb = still ? 1 : ease((u - 0.42) / 0.08) * fade;
      const nbk = blocks[3];
      nbk.m.position.y = BY + 0.12 * (1 - nb);
      (nbk.m.material as MeshBasicMaterial[]).forEach((m) => { m.opacity = nb; });
      (nbk.e.material as LineBasicMaterial).opacity = 0.8 * nb;
      // 50–58%: its link to the previous block draws
      const lk = still ? 1 : ease((u - 0.5) / 0.08) * fade;
      links[2].geometry.setDrawRange(0, lk > 0.02 ? 2 : 0);
      (links[2].material as LineBasicMaterial).opacity = 0.7 * lk;
      // 60–74%: a verification pulse runs from the first block to the new one
      const pv = still ? -1 : (u - 0.6) / 0.14;
      const on = pv > 0 && pv < 1;
      (pulseDot.material as SpriteMaterial).opacity = on ? 0.9 * Math.sin(Math.PI * pv) : 0;
      if (on) pulseDot.position.set(lerp(BX[0], BX[3], pv), BY, 0.05);
      // 74%+: anchored; the blocks' edges warm a touch
      const an = still ? 1 : ease((u - 0.74) / 0.08) * fade;
      (anchored.material as MeshBasicMaterial).opacity = an;
      blocks.forEach((b) => (b.e.material as LineBasicMaterial).color.copy(GOLD).lerp(GOLD_HI, 0.5 * an));
      chain.rotation.x = 0.1 + sp * Math.sin(t * 0.35) * 0.04;
    }

    // FIRMA: one slow certification every 9 s (still: the finished mark, no sweep)
    if (!isChain) {
      const P = 9, u = still ? 0.7 : (t % P) / P;
      const ease = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
      const fade = still ? 1 : 1 - ease((u - 0.9) / 0.1);               // everything fades out at the end
      const ring = still ? 1 : ease(u / 0.26);                           // 0–26%: the outer ring draws itself
      const rest = still ? 1 : ease((u - 0.18) / 0.14);                  // the inner ring and ticks come in
      const sig = still ? 1 : ease((u - 0.3) / 0.22);                    // 30–52%: the check is written
      const und = still ? 1 : ease((u - 0.52) / 0.06);
      const press = still ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.56) / 0.1))); // 56–66%: pressed in
      const sw = still ? -1 : (u - 0.6) / 0.22;                          // 60–82%: the light sweep
      outer.forEach((l) => { l.geometry.setDrawRange(0, Math.max(2, Math.round(161 * ring))); (l.material as LineBasicMaterial).opacity = (l === outer[0] ? 1 : 0.6) * fade; });
      inner.forEach((l, i) => { (l.material as LineBasicMaterial).opacity = (i ? 0.45 : 0.85) * rest * fade; });
      (ticks.material as LineBasicMaterial).opacity = 0.55 * rest * fade;
      signature.forEach((l, i) => { l.geometry.setDrawRange(0, Math.max(2, Math.round(sigPts.length * sig))); (l.material as LineBasicMaterial).opacity = (i ? 0.55 : 1) * (sig > 0 ? 1 : 0) * fade; });
      under.geometry.setDrawRange(0, und > 0 ? 2 : 0); (under.material as LineBasicMaterial).opacity = 0.5 * und * fade;
      // the press: the mark sinks a hair and its disc darkens into an emboss, which then stays
      cseal.position.z = -0.008 * press;
      cseal.scale.setScalar(1 - 0.015 * press);
      (emboss.material as MeshBasicMaterial).opacity = (still ? 0.9 : 0.9 * ease((u - 0.56) / 0.06)) * fade;
      (okLabel.material as MeshBasicMaterial).opacity = (still ? 1 : ease((u - 0.64) / 0.08)) * fade;
      // the sweep, and the lines warming as it passes
      const su = (sweep.material as ShaderMaterial).uniforms;
      su.uPos.value = lerp(-0.4, 2.4, Math.min(1, Math.max(0, sw)));
      su.uAlpha.value = sw > 0 && sw < 1 ? 0.22 * Math.sin(Math.PI * sw) : 0;
      const warm = sw > 0 && sw < 1 ? Math.sin(Math.PI * sw) : 0;
      [...outer, ...inner, ...signature, under].forEach((l) => (l.material as LineBasicMaterial).color.copy(GOLD).lerp(GOLD_HI, 0.6 * warm));
      cert.rotation.x = 0.1 + sp * Math.sin(t * 0.35) * 0.04;
    }
    // the light: a column falling on the front spot, and its pool on the floor
    const bu = (beam.material as ShaderMaterial).uniforms;
    bu.uTime.value = t; bu.uAlpha.value = T.spotlight; bu.uColor.value.set(T.beamColor);
    beam.position.set(0, 1.9, R - 0.7); beam.scale.set(4.2, 6, 1);
    pool.position.set(0, FLOOR_Y + 0.004, R); (pool.material as MeshBasicMaterial).opacity = 0.35 * T.spotlight;
    (floor.material as ShaderMaterial).uniforms.uAlpha.value = 0.5;

    // render
    renderer.getDrawingBufferSize(size);
    renderer.setClearColor("#0a0d13", 1);
    anchor.set(0, 0, R);
    const focus = camera.position.distanceTo(anchor);
    // the scene, with its depth
    if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    if (T.depthMode >= 1) {
      // depth of field, focused on the front object
      const c = dofChainOf();
      if (c.w !== size.x || c.h !== size.y) { c.pass.setSize(size.x, size.y); c.w = size.x; c.h = size.y; }
      c.effect.cocMaterial.worldFocusDistance = focus;
      c.effect.cocMaterial.worldFocusRange = T.focusRange * 2;
      c.effect.bokehScale = T.bokeh;
      c.pass.render(renderer, rt, null, dt, false);
      return;
    }
    // atmosphere: graded by depth onto the screen
    const u = grade.uniforms;
    u.tColor.value = rt.texture; u.tDepth.value = rt.depthTexture;
    u.uRes.value.copy(size); u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uFocus.value = focus; u.uRange.value = T.focusRange; u.uSpan.value = R * 1.2;
    u.uHaze.value = T.haze; u.uHazeColor.value.set(T.hazeColor); u.uDesat.value = T.desaturate; u.uContrast.value = T.lowerContrast; u.uDim.value = T.dim;
    renderer.render(post, postCam);
  }

  // where each object's label goes (screen px), and how far forward it is (1 = front)
  function labels(w: number, h: number) {
    return slots.map((s) => {
      s.outer.getWorldPosition(anchor);
      const front = Math.max(0, (anchor.z / T.ringRadius + 0.5) / 1.5);
      v.copy(anchor).setY(FLOOR_Y - 0.15).project(camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, front };
    });
  }

  // which object is under a point (normalised device coordinates), or -1
  function pick(p: { x: number; y: number }) {
    ray.setFromCamera(v2.set(p.x, p.y), camera);
    let best = -1, bestD = Infinity;
    slots.forEach((s, i) => {
      const hit = ray.intersectObject(s.inner, true).find((x) => (x.object as Mesh).isMesh);
      if (hit && hit.distance < bestD) { bestD = hit.distance; best = i; }
    });
    return best;
  }

  return {
    update, labels, pick, redraw,
    dispose() {
      [scene, post].forEach((sc) => sc.traverse((o: Object3D) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
      }));
      textures.forEach((t) => t.dispose());
      rt.dispose();
      dofChain?.pass.dispose();
    },
  };
}
