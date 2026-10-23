"use client";

import { useMemo } from "react";
import { createSoil } from "../agro-experience/soilScene";
import { ScrollScene } from "../scene/ScrollScene";
import type { CardMode } from "../scene/CardPacer";

// The Agro page's own soil scene, held at its hero, as a carousel card.
export default function AgroCard({ card }: { card: CardMode }) {
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  return <ScrollScene getStep={hero} reduceMotion={reduceMotion} create={createSoil} card={card} />;
}
const hero = () => 0;
