"use client";

import { useMemo } from "react";
import { createPipeline } from "../isale-experience/pipelineScene";
import { ScrollScene } from "../scene/ScrollScene";
import type { CardMode } from "../scene/CardPacer";

// The iSale page's own pipeline scene, held at its hero, as a carousel card.
export default function IsaleCard({ card }: { card: CardMode }) {
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  return <ScrollScene getStep={hero} reduceMotion={reduceMotion} create={createPipeline} card={card} />;
}
const hero = () => 0;
