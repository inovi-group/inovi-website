/**
 * The iSale pipeline scene's look, in one place. ISALE_DEFAULTS is what every visitor sees; paste tuned numbers
 * here to bake them in. With ?tune=1 a panel edits a live copy (isaleTune), which the scene reads every frame.
 */
export const ISALE_DEFAULTS = {
  // framing
  heroYaw: -0.32,         // the pipeline's turn in the hero
  heroElevation: 0.42,
  heroZoom: 1.0,
  heroShiftX: 0.25,       // how far right the hero scene sits, in viewport widths
  drift: 1.0,             // gentle idle turning (0 = still)
  // deals
  cardCount: 14,
  cardSize: 1.0,
  flowSpeed: 0.022,       // how fast the deals move down the pipeline
  flagGlow: 1.0,          // the red glow on risky deals
  gateGlow: 1.0,          // iSale's scan gate
  // light and air
  beamOpacity: 0.28,
  beamWidth: 1.0,
  beamColor: "#4a7fd6",
  motesCount: 240,
  motesBrightness: 1.1,
  plinthGrid: 0.6,
};
export type IsaleTune = typeof ISALE_DEFAULTS;
export type IsaleKey = keyof IsaleTune;

export const ISALE_PARAMS: { group: string; items: { key: IsaleKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Framing", items: [
    { key: "heroYaw", label: "Hero turn", min: -1.2, max: 1.2, step: 0.01 },
    { key: "heroElevation", label: "Hero elevation", min: 0, max: 1.2, step: 0.01 },
    { key: "heroZoom", label: "Hero zoom", min: 0.6, max: 2, step: 0.01 },
    { key: "heroShiftX", label: "Hero shift right", min: 0, max: 0.35, step: 0.005 },
    { key: "drift", label: "Idle turning", min: 0, max: 3, step: 0.05 },
  ] },
  { group: "Deals", items: [
    { key: "cardCount", label: "Deal cards", min: 3, max: 24, step: 1 },
    { key: "cardSize", label: "Card size", min: 0.5, max: 1.6, step: 0.01 },
    { key: "flowSpeed", label: "Flow speed", min: 0, max: 0.08, step: 0.001 },
    { key: "flagGlow", label: "Risk glow", min: 0, max: 2, step: 0.01 },
    { key: "gateGlow", label: "Scan gate", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Light & air", items: [
    { key: "beamOpacity", label: "Light column", min: 0, max: 1, step: 0.01 },
    { key: "beamWidth", label: "Light width", min: 0.3, max: 2.5, step: 0.01 },
    { key: "beamColor", label: "Light colour" },
    { key: "motesCount", label: "Motes", min: 0, max: 600, step: 10 },
    { key: "motesBrightness", label: "Mote brightness", min: 0, max: 3, step: 0.05 },
    { key: "plinthGrid", label: "Floor grid", min: 0, max: 1.5, step: 0.01 },
  ] },
];
export const ISALE_LIMITS = { cards: 24, motes: 600 };

export const isaleTune: IsaleTune = { ...ISALE_DEFAULTS };
export const ISALE_STORE = "isale-scene-tune";
