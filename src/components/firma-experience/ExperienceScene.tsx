"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import { Group, type PerspectiveCamera } from "three";
import { createCheck } from "./checkScene";
import type { StoryData } from "./content";
import type { Palette } from "./heroScene";

export type SceneApi = ReturnType<typeof createCheck>;

type Props = {
  getStep: () => number;
  data: StoryData;
  layout: number;
  treatment: string;
  palette: Palette;
  reduceMotion: MediaQueryList;
  apiRef: MutableRefObject<SceneApi | null>;
  setBackdrop: (bg: number) => void;
};

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
 * The X-ray box and the FIRMA chain. The scene is built once (three.js objects, canvas-drawn faces)
 * and driven every frame by the scroll step. The canvas takes no input: it only tilts a few degrees
 * toward the mouse (eased, back to rest when the mouse leaves) or sways slightly with scroll on touch.
 */
function Check({ getStep, data, layout, treatment, palette, reduceMotion, apiRef, setBackdrop }: Props) {
  const { camera, gl } = useThree();
  const tilt = useRef<Group>(null);
  const api = useRef<SceneApi | null>(null);
  const clock = useRef({ step: 0, last: 0, t: 0 });
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const holder = tilt.current!;
    const root = new Group();
    holder.add(root);
    const check = createCheck({ root, camera: camera as PerspectiveCamera, gl, data, fonts: siteFonts(), setBackdrop });
    api.current = check;
    apiRef.current = check;
    return () => {
      check.dispose();
      holder.remove(root);
      api.current = null;
      if (apiRef.current === check) apiRef.current = null;
    };
  }, [camera, gl, data, apiRef, setBackdrop]);

  useEffect(() => { api.current?.setLayout(layout); }, [layout]);
  useEffect(() => { api.current?.setTreatment(treatment); }, [treatment]);
  useEffect(() => { api.current?.setPalette(palette); }, [palette]);

  // mouse-follow tilt
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

  const fine = useRef<MediaQueryList | null>(null);
  useFrame(() => {
    const check = api.current;
    if (!check || !tilt.current) return;
    fine.current ??= window.matchMedia("(hover: hover) and (pointer: fine)");
    const c = clock.current, p = ptr.current;
    // frame time drives the easing; the outcome impact runs on its own wall clock (performance.now)
    const now = Number(document.timeline?.currentTime ?? performance.now());
    const first = c.last === 0;
    const dt = first ? 0 : Math.min(0.05, Math.max(0, (now - c.last) / 1000));
    c.last = now;
    const still = reduceMotion.matches;
    if (!still) c.t += dt;
    const target = getStep();
    // first frame starts where the page is (a reload mid-story does not replay from the top)
    c.step = still || first ? target : c.step + (target - c.step) * Math.min(1, dt * 4.5);

    if (still) { p.x = p.y = 0; }
    else if (fine.current.matches) {
      const k = Math.min(1, dt * 2.5);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    } else {
      p.x = Math.sin(c.step * 1.3) * 0.5; p.y = 0;
    }
    tilt.current.rotation.y = p.x * 0.07;
    tilt.current.rotation.x = p.y * 0.045;

    const w = window.innerWidth, h = window.innerHeight;
    check.setView({ w, h, aspect: w / h, wide: w > 760 && w / h > 0.9 });
    check.update({ step: c.step, t: c.t, dt, still });
  });

  return <group ref={tilt} />;
}

export default function ExperienceScene(props: Props) {
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.75 : 2);
  return (
    <Canvas
      dpr={dpr}
      flat
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 10] }}
      onCreated={({ gl }) => gl.setClearColor("#0a0d13", 1)}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Check {...props} />
    </Canvas>
  );
}
