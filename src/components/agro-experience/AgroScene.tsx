"use client";

import { ScrollScene } from "../scene/ScrollScene";
import { createSoil } from "./soilScene";

// the soil cutaway behind /agro (loaded on the client only)
export default function AgroScene(props: { getStep: () => number; reduceMotion: MediaQueryList }) {
  return <ScrollScene {...props} create={createSoil} />;
}
