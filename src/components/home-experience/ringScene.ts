import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DepthTexture,
  DoubleSide,
  EdgesGeometry,
  Group,
  HalfFloatType,
  LineBasicMaterial,
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
import { ENV, drawEnvelopeFace, makeEnvelope } from "../firma-experience/envelope";
import { drawDeal } from "../isale-experience/pipelineScene";
import { DepthOfFieldEffect, EffectPass } from "postprocessing";
import { homeTune as T } from "./homeTuning";

/**
 * The home page's product ring: one 3D scene, three objects on a turntable that physically turns.
 * FIDES is the golden envelope with its crimson wax seal; AGRO a block of field in cutaway, a probe glowing in
 * its root zone and water under the crops; iSale a floating stack of deal cards, the risky one flagged red.
 * At the centre, on the floor, FIRMA: a gold ring through all three and its seal in the middle.
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
export const PRODUCTS = ["fides", "agro", "isale"] as const;

type Fonts = { sans: string; mono: string };
const canvasOf = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });

// FIRMA's wax seal (the same crimson as on the Fides envelopes), drawn light so the material colour tints it
function drawSeal(cv: HTMLCanvasElement, F: Fonts) {
  const c = cv.getContext("2d")!, W = cv.width, cx = W / 2;
  c.clearRect(0, 0, W, W);
  c.beginPath();
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * TAU, r = W * 0.46 + Math.sin(t * 9) * W * 0.018 + Math.sin(t * 5 + 1) * W * 0.012;
    c.lineTo(cx + Math.cos(t) * r, cx + Math.sin(t) * r);
  }
  c.closePath(); c.fillStyle = "#f3e2b8"; c.fill();
  c.strokeStyle = "#c9b081"; c.lineWidth = W * 0.03;
  c.beginPath(); c.arc(cx, cx, W * 0.33, 0, TAU); c.stroke();
  c.fillStyle = "#b39a6c"; c.font = `700 ${W * 0.36}px ${F.sans}`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("F", cx, cx + W * 0.02);
}

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

export function createRing({ camera, renderer, fonts }: { camera: PerspectiveCamera; renderer: WebGLRenderer; fonts: Fonts }) {
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
  const seal = new Mesh(new CircleGeometry(0.42, 48), new MeshBasicMaterial({ map: texOf(sealCv), color: "#8f1d2c", transparent: true, depthWrite: false }));
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

  // FIDES: the golden envelope with its crimson wax seal, glowing a little
  const faceCv = canvasOf(1024, Math.round((1024 * ENV.h) / ENV.w));
  const face = texOf(faceCv);
  const waxCv = canvasOf(256, 256);
  const waxMat = new MeshBasicMaterial({ map: texOf(waxCv), color: "#8f1d2c", transparent: true });
  const wax = new Mesh(new CircleGeometry(0.15, 40), waxMat);
  const env = makeEnvelope(face, { g: (() => { const g = new Group(); g.add(wax); return g; })(), set(_l, _v, _b, a) { waxMat.opacity = a; } });
  env.setOpacity(1);
  // its edges write depth here, so depth of field keeps them with the envelope instead of blurring them as background
  (env.edges.material as LineBasicMaterial).depthWrite = true;
  env.g.scale.setScalar(0.58);
  env.g.rotation.set(0.12, 0, -0.06);
  const envGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#ffc561", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  envGlow.scale.set(3.4, 2.4, 1); envGlow.position.z = -0.2;
  slots[0].inner.add(envGlow, env.g);

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

  // iSale: a floating stack of deal cards, the risky one flagged red, a scan line passing through
  const deals = [
    { name: "DEAL 01", stage: "Proposal · 12 days", risk: 0.18, note: "ON TRACK" },
    { name: "DEAL 02", stage: "Discovery · 9 days", risk: 0.34, note: "ON TRACK" },
    { name: "DEAL 03", stage: "Negotiation · 45 days", risk: 0.82, note: "STALLING · NO CHAMPION" },
    { name: "DEAL 04", stage: "Proposal · 20 days", risk: 0.47, note: "DISCOUNT PRESSURE" },
  ];
  const cardGeo = new PlaneGeometry(1.5, 0.75);
  const cards = deals.map((d, k) => {
    const cv = canvasOf(512, 256);
    const m = new Mesh(cardGeo, new MeshBasicMaterial({ map: texOf(cv), alphaTest: 0.5, side: DoubleSide }) /* opaque: no card shows through another */);
    m.position.set((k - 1.5) * 0.12, (1.5 - k) * 0.3 - 0.05, (k - 1.5) * -0.28);
    m.rotation.set(-0.12, 0.18, 0);
    slots[2].inner.add(m);
    return { m, cv, d, y0: m.position.y };
  });
  const flag = new Sprite(new SpriteMaterial({ map: dot, color: "#ef5a4c", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  flag.scale.set(2.4, 1.4, 1);
  slots[2].inner.add(flag);
  const scan = new Mesh(new PlaneGeometry(0.035, 1.6), new MeshBasicMaterial({ color: "#4593ff", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  slots[2].inner.add(scan);
  const stackGlow = new Sprite(new SpriteMaterial({ map: dot, color: "#4593ff", transparent: true, blending: AdditiveBlending, depthWrite: false }));
  stackGlow.scale.set(3.2, 2.4, 1); stackGlow.position.z = -0.6;
  slots[2].inner.add(stackGlow);

  const redraw = () => {
    drawSeal(sealCv, fonts); drawSeal(waxCv, fonts);
    drawEnvelopeFace(faceCv);
    cards.forEach((c) => drawDeal(c.cv, c.d, true, fonts));
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

  const glows = [envGlow, plotGlow, stackGlow];
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
  const anchor = new Vector3(), v = new Vector3(), ray = new Raycaster();
  let rot = 0; // the turntable's angle: product i is at the front when rot = i (in thirds of a turn)

  function update({ target, t, dt, still, w, h }: { target: number; t: number; dt: number; still: boolean; w: number; h: number }) {
    // the ring turns toward the target (eased); still: it jumps
    const k = 1 - Math.exp(-dt * 3.2 * T.turnSpeed);
    rot = still ? target : rot + (target - rot) * k;
    if (Math.abs(target - rot) < 1e-4) rot = target;
    const R = T.ringRadius, sp = still ? 0 : T.spin;
    turntable.rotation.y = (-rot * TAU) / 3;
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

    slots.forEach((s, i) => {
      const a = (i * TAU) / 3;
      s.outer.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      // each object turns only a quarter as far as the turntable, so it keeps mostly facing you as it comes round
      const orbit = Math.atan2(Math.sin(a + turntable.rotation.y), Math.cos(a + turntable.rotation.y)); // 0 at the front, wrapped to ±π
      s.outer.rotation.y = 0.25 * orbit - turntable.rotation.y;
      const front = Math.max(0, Math.cos(a + turntable.rotation.y)); // 1 when this one is at the front
      s.inner.position.y = sp * Math.sin(t * 0.6 + i * 2) * 0.06;
      s.inner.rotation.y = sp * Math.sin(t * 0.25 + i) * 0.18;
      // the ones at the back are drawn a little smaller than perspective alone makes them (atmosphere mode)
      s.outer.scale.setScalar(T.objectScale * (T.depthMode >= 1 ? 1 : lerp(T.backScale, 1, front)));
      (glows[i].material as SpriteMaterial).opacity = (0.12 + 0.28 * front) * T.frontGlow;
    });
    // FIDES glows like the stream's envelopes when in front
    const fFront = Math.max(0, Math.cos(turntable.rotation.y));
    env.setLight(0.5 + 0.3 * fFront, 0.25 + 0.6 * fFront * T.frontGlow);
    env.g.rotation.x = 0.12 + sp * Math.sin(t * 0.4) * 0.05;
    // AGRO: water breathing under the crops, sensors pulsing
    SU.uTime.value = t; SU.uF.value = 0.85 + (still ? 0 : Math.sin(t * 0.5) * 0.06); SU.uFlow.value = 1; SU.uDry.value = 0; SU.uMap.value = 0;
    kit.plantsMat.uniforms.uTime.value = t; kit.plantsMat.uniforms.uSway.value = still ? 0 : 1;
    kit.tubeMat.uniforms.uTime.value = t; kit.tubeMat.uniforms.uFlow.value = 1;
    sensors.forEach((s, j) => { (s.material as SpriteMaterial).opacity = still ? 0.9 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + j * 1.6)); });
    (led.material as SpriteMaterial).opacity = still ? 0.9 : 0.5 + 0.5 * Math.max(0, Math.sin(t * 3));
    // iSale: the cards float, the scan passes, the risky one glows
    cards.forEach((c, j) => { c.m.position.y = c.y0 + sp * Math.sin(t * 0.8 + j) * 0.03; });
    const risky = cards[2].m;
    flag.position.copy(risky.position).add(v.set(0, 0, -0.05));
    const sweep = still ? 0.5 : (t * 0.3) % 1;
    scan.position.set(lerp(-1.0, 1.0, sweep), 0, 0.3);
    (scan.material as MeshBasicMaterial).opacity = 0.8 * Math.sin(Math.PI * sweep);
    (flag.material as SpriteMaterial).opacity = 0.35 + 0.35 * Math.exp(-(((sweep - 0.5) / 0.12) ** 2)) + (still ? 0 : 0.08 * Math.sin(t * 3));

    // the light: a column falling on the front spot, and its pool on the floor
    const bu = (beam.material as ShaderMaterial).uniforms;
    bu.uTime.value = t; bu.uAlpha.value = T.spotlight; bu.uColor.value.set(T.beamColor);
    beam.position.set(0, 1.9, R - 0.7); beam.scale.set(4.2, 6, 1);
    pool.position.set(0, FLOOR_Y + 0.004, R); (pool.material as MeshBasicMaterial).opacity = 0.35 * T.spotlight;
    (floor.material as ShaderMaterial).uniforms.uAlpha.value = 0.5;

    // the camera: in front of the ring, a little above, looking at the front object
    const D = T.cameraDistance;
    camera.aspect = w / h;
    // phones (tall stage): step back so the two at the back stay in view
    const fit = w / h < 1 ? 1 + (1 - w / h) * 0.9 : 1;
    camera.position.set(0, Math.sin(T.elevation) * D * fit + 0.1, R + Math.cos(T.elevation) * D * fit);
    camera.lookAt(0, -0.05, R * 0.55);
    camera.updateProjectionMatrix();

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
  function pick(ndc: Vector2) {
    ray.setFromCamera(ndc, camera);
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
