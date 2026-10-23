"use client";

import { useMemo, useRef } from "react";
import ExperienceScene, { type SceneApi } from "../firma-experience/ExperienceScene";
import { createStoryData } from "../firma-experience/content";
import type { CardMode } from "../scene/CardPacer";

// The Fides page's own scene, held at its hero (the envelope stream), as a carousel card.
export default function FidesCard({ card }: { card: CardMode }) {
  const data = useMemo(() => createStoryData("lost"), []);
  const api = useRef<SceneApi | null>(null);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  return <ExperienceScene getStep={hero} data={data} layout={1} treatment="b" reduceMotion={reduceMotion} apiRef={api} setBackdrop={noop} card={card} />;
}
const hero = () => 0;
const noop = () => {};
