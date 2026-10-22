"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Group, type PerspectiveCamera } from "three";
import { createSoil } from "./soilScene";

type Props = { getStep: () => number; reduceMotion: MediaQueryList };
type Soil = ReturnType<typeof createSoil>;

// next/font gives the families hashed names; the canvas textures need the real ones
function siteFonts() {
  const css = getComputedStyle(document.documentElement);
  const sans = css.getPropertyValue("--font-inter").trim();
  const mono = css.getPropertyValue("--font-jbmono").trim();
  return {
    sans: `${sans ? `${sans}, ` : ""}Inter, system-ui, sans-serif`,
    mono: `${mono ? `${mono}, ` : ""}'JetBrains Mono', monospace`,
  };
}

/**
 * The soil cutaway, driven every frame by the scroll step. Like the Firma scene, the canvas takes no input:
 * it only tilts a few degrees toward the mouse (eased, back to rest when the mouse leaves).
 */
function Soil({ getStep, reduceMotion }: Props) {
  const { camera } = useThree();
  const tilt = useRef<Group>(null);
  const api = useRef<Soil | null>(null);
  const clock = useRef({ step: 0, last: 0, t: 0 });
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const holder = tilt.current!;
    const stage = new Group();
    holder.add(stage);
    const fonts = siteFonts();
    const soil = createSoil({ stage, camera: camera as PerspectiveCamera, fonts });
    api.current = soil;
    let alive = true;
    // the labels and the phone need the web fonts
    Promise.all([document.fonts?.load(`600 30px ${fonts.mono}`), document.fonts?.load(`600 30px ${fonts.sans}`)]).catch(() => {}).then(() => alive && soil.redraw());
    return () => { alive = false; soil.dispose(); holder.remove(stage); api.current = null; };
  }, [camera]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ptr.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const rest = () => { ptr.current.tx = 0; ptr.current.ty = 0; };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", rest);
    window.addEventListener("blur", rest);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", rest);
      window.removeEventListener("blur", rest);
    };
  }, []);

  useFrame(() => {
    const soil = api.current;
    if (!soil || !tilt.current) return;
    const c = clock.current, p = ptr.current;
    const now = Number(document.timeline?.currentTime ?? performance.now());
    const first = c.last === 0;
    const dt = first ? 0 : Math.min(0.05, Math.max(0, (now - c.last) / 1000));
    c.last = now;
    const still = reduceMotion.matches;
    if (!still) c.t += dt;
    const target = getStep();
    c.step = still || first ? target : c.step + (target - c.step) * Math.min(1, dt * 4);
    if (!still) {
      const k = Math.min(1, dt * 2.5);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    }
    tilt.current.rotation.y = p.x * 0.06;
    tilt.current.rotation.x = p.y * 0.035;
    const w = window.innerWidth, h = window.innerHeight;
    soil.setView({ w, h, aspect: w / h, wide: w > 760 && w / h > 0.9 });
    soil.update({ s: c.step, t: c.t, still });
  });

  return <group ref={tilt} />;
}

export default function AgroScene(props: Props) {
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.75 : 2);
  return (
    <Canvas
      dpr={dpr}
      flat
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 12] }}
      onCreated={({ gl }) => gl.setClearColor("#0a0d13", 1)}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Soil {...props} />
    </Canvas>
  );
}
