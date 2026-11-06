// Checks the home page's product ring for orientation jumps: turns the ring through two full rotations each way
// (and the old formula, for comparison), frame by frame at 60 fps, with the scene's own motion code
// (src/components/home-experience/ringMotion.ts and the defaults in homeTuning.ts), and fails if any object's
// yaw changes by more than MAX_STEP degrees between two frames. Usage: npm run check:ring [-- --log out.csv]
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// degrees per frame. The ring itself turns up to ~6° in a frame at the start of a turn (its easing), so a smooth
// object turn can reach a few degrees per frame there; a flip at an angle wrap-around is tens of degrees.
const MAX_STEP = 4;
const root = new URL("../src/components/home-experience/", import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "ring-check-"));
const load = async (name) => {
  const out = ts.transpileModule(readFileSync(new URL(`${name}.ts`, root), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, out.outputText);
  return import(pathToFileURL(file).href);
};
const { HOME_DEFAULTS: T } = await load("homeTuning");
const M = await load("ringMotion");
rmSync(dir, { recursive: true, force: true });

const deg = (r) => (r * 180) / Math.PI;
const TAU = Math.PI * 2;
const logArg = process.argv.indexOf("--log");
const rows = ["run,frame,t,rot,yaw0,yaw1,yaw2"];

// the yaw the viewer sees, per object; `legacy` is the formula before this check (a quarter of the wrapped angle)
function yaws(turn, t, legacy) {
  const cam = M.cameraPosition({ R: T.ringRadius, distance: T.cameraDistance, elevation: T.elevation, aspect: 16 / 9 });
  const now = M.objectYaws({ turn, R: T.ringRadius, cam, t, spin: T.spin, envMaxYaw: T.envMaxYaw });
  if (!legacy) return now.map((y) => y.world);
  return now.map((y, i) => 0.25 * M.wrap((i * TAU) / 3 + turn) + T.spin * Math.sin(t * 0.25 + i) * 0.18);
}

function run(name, dir, legacy) {
  const dt = 1 / 60, perStep = 7; // the default autoplay interval
  let rot = 0, target = 0, t = 0, prev = null, worst = { step: 0 }, ring = 0;
  for (let n = 1; n <= 6; n++) { // two full rotations: six steps of a third of a turn
    target += dir;
    for (let f = 0; f < perStep / dt; f++) {
      t += dt;
      const was = rot;
      rot = M.stepRing(rot, target, dt, T.turnSpeed);
      ring = Math.max(ring, Math.abs(rot - was) * 120);
      const y = yaws(M.turnOf(rot), t, legacy);
      if (!legacy && logArg > 0) rows.push([name, rows.length, t.toFixed(4), rot.toFixed(5), ...y.map((v) => deg(v).toFixed(3))].join(","));
      if (prev) y.forEach((v, i) => {
        const step = Math.abs(deg(M.wrap(v - prev[i])));
        if (step > worst.step) worst = { step, object: ["iSale", "AGRO", "FIRMA"][i], t: +t.toFixed(3), rot: +rot.toFixed(3) };
      });
      prev = y;
    }
  }
  return { ...worst, ring };
}

let failed = false;
for (const [name, dir] of [["forward", 1], ["backward", -1]]) {
  const before = run(name, dir, true), after = run(name, dir, false);
  const ok = after.step <= MAX_STEP;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: largest yaw change in one frame ${after.step.toFixed(2)}° (${after.object}, t=${after.t}s)` +
    `   [ring's own largest turn in one frame ${after.ring.toFixed(2)}°; old formula: ${before.step.toFixed(1)}° (${before.object}, t=${before.t}s)]`);
}
if (logArg > 0) { writeFileSync(process.argv[logArg + 1], rows.join("\n") + "\n"); console.log(`per-frame log: ${process.argv[logArg + 1]} (${rows.length - 1} frames)`); }
if (failed) { console.error(`orientation jumps larger than ${MAX_STEP}° per frame`); process.exit(1); }
