"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Inside a <Canvas frameloop="demand">: redraws at a reduced rate. The home carousel uses it for the products
 * sitting at the back (blurred and dimmed, so a lower frame rate doesn't show, and it saves the GPU).
 */
export function CardPacer({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (fps <= 0) return;
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

// canvas settings for a scene shown as a card (the home carousel) rather than behind a whole page
export type CardMode = { active: boolean; backFps?: number };
export const cardDpr = (card: CardMode) => (card.active ? Math.min(window.devicePixelRatio || 1, 1.5) : 0.75);
