"use client";

import { ScrollScene } from "../scene/ScrollScene";
import { createHome } from "./ringScene";

// the products on their governance ring, behind the home page (loaded on the client only)
export default function HomeScene(props: { getStep: () => number; reduceMotion: MediaQueryList }) {
  return <ScrollScene {...props} create={createHome} />;
}
