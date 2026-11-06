"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import type { PerspectiveCamera } from "three";
import { siteFonts } from "../scene/ScrollScene";
import { createRing } from "./ringScene";
import type { Lang } from "@/i18n";

export type RingApi = Pick<ReturnType<typeof createRing>, "pick">;
type Props = {
  target: MutableRefObject<number>;                 // the item to bring (and keep) in front; unbounded, wraps (0 iSale, 1 AGRO, 2 FIRMA)
  labels: MutableRefObject<(HTMLElement | null)[]>; // positioned under their objects every frame
  api: MutableRefObject<RingApi | null>;
  reduceMotion: MediaQueryList;
  lang: Lang;                                       // the language of the words drawn on FIRMA's item
};

// Renders the product ring itself (its own two passes: the scene with depth, then depth of field).
function Ring({ target, labels, api, reduceMotion, lang }: Props) {
  const { camera, gl, size } = useThree();
  const ring = useRef<ReturnType<typeof createRing> | null>(null);
  const clock = useRef({ t: 0 });

  useEffect(() => {
    const fonts = siteFonts();
    const r = createRing({ camera: camera as PerspectiveCamera, renderer: gl, fonts, lang });
    ring.current = r; api.current = r;
    let alive = true;
    Promise.all([document.fonts?.load(`600 30px ${fonts.mono}`), document.fonts?.load(`700 30px ${fonts.sans}`)]).catch(() => {}).then(() => alive && r.redraw());
    return () => { alive = false; r.dispose(); ring.current = null; api.current = null; };
  }, [camera, gl, api, lang]);

  // priority 1: this takes over rendering from react-three-fiber
  useFrame((_, delta) => {
    const r = ring.current;
    if (!r) return;
    const still = reduceMotion.matches;
    const dt = Math.min(0.05, delta);
    if (!still) clock.current.t += dt;
    r.update({ target: target.current, t: clock.current.t, dt, still, w: size.width, h: size.height });
    r.labels(size.width, size.height).forEach((p, i) => {
      const el = labels.current[i];
      if (!el) return;
      // kept inside the ring's area, so a label at the side never runs off a phone screen
      const scale = 0.82 + 0.18 * p.front, half = (el.offsetWidth * scale) / 2 + 8;
      const x = Math.min(size.width - half, Math.max(half, p.x));
      el.style.transform = `translate(${x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = (0.45 + 0.55 * p.front).toFixed(3);
      el.style.zIndex = String(Math.round(p.front * 10));
    });
  }, 1);
  return null;
}

export default function RingCanvas(props: Props) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return (
    <Canvas dpr={dpr} flat gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ fov: 32, near: 0.1, far: 60, position: [0, 2, 10] }} aria-hidden="true">
      <Ring {...props} />
    </Canvas>
  );
}
