"use client";

import { ScrollScene } from "../scene/ScrollScene";
import { createPipeline } from "./pipelineScene";

// the pipeline behind /isale (loaded on the client only)
export default function IsaleScene(props: { getStep: () => number; reduceMotion: MediaQueryList }) {
  return <ScrollScene {...props} create={createPipeline} />;
}
