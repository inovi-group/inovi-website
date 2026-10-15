/**
 * The envelope hero's look, in one place. HERO_DEFAULTS is what every visitor sees; paste tuned numbers here
 * to bake them in. With ?tune=1 a panel edits a live copy (heroTune), which the scene reads every frame.
 * Positions and widths are in units of the scene's half-width / half-height (phones scale them a little).
 */
export const HERO_DEFAULTS = {
  // light source and beam
  sourceX: 0.86,         // horizontal position of the light's source (0 = scene centre, 1 = its right edge)
  sourceHeight: 1.16,    // height of the source above the scene's centre
  sourceDepth: -1.2,     // distance of the beam behind (−) or in front of (+) the deal's plane
  beamSpread: 1.4,       // half-width of the cone at the bottom: how much it fans out
  beamLength: 1.0,       // length of the beam (1 = from the source down to the middle bottom)
  beamOpacity: 0.5,      // density of the beam's body
  beamBrightness: 0.22,  // the brighter inner core
  beamColor: "#2b9c80",
  coreGlow: 0.5,         // the hot spot at the source
  // aurora, inside the beam
  auroraIntensity: 0.45,
  auroraSpeed: 1.0,
  auroraTeal: 1.0,       // colour mix: weight of each ribbon
  auroraViolet: 1.0,
  auroraGold: 0.5,
  // envelopes
  emitterSpread: 0.45,   // how far envelopes fan out across the cone (1 = to its edges)
  envelopeCount: 16,     // emission rate: how many are in the stream at once (phones show about half)
  fallSpeed: 0.012,
  sizeMin: 0.3,
  sizeMax: 0.6,
  depthNear: 0.9,        // depth range the stream spreads over as it falls
  depthFar: -2.4,
  rotation: 1.0,         // amount of gentle turning (0 = none)
  // stardust
  dustCount: 260,        // phones show about 40% of these
  dustSize: 0.028,
  dustBrightness: 1.5,
};
export type HeroTune = typeof HERO_DEFAULTS;
export type TuneKey = keyof HeroTune;

// the panel: groups of sliders (and one colour picker), built from this list
export const HERO_PARAMS: { group: string; items: { key: TuneKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Light source & beam", items: [
    { key: "sourceX", label: "Source horizontal", min: -0.5, max: 1.6, step: 0.01 },
    { key: "sourceHeight", label: "Source height", min: 0.4, max: 2.2, step: 0.01 },
    { key: "sourceDepth", label: "Source distance (depth)", min: -6, max: 2, step: 0.05 },
    { key: "beamSpread", label: "Beam spread", min: 0.3, max: 2.5, step: 0.01 },
    { key: "beamLength", label: "Beam length", min: 0.5, max: 1.8, step: 0.01 },
    { key: "beamOpacity", label: "Beam opacity / density", min: 0, max: 1, step: 0.01 },
    { key: "beamBrightness", label: "Beam brightness (core)", min: 0, max: 1, step: 0.01 },
    { key: "beamColor", label: "Beam colour" },
    { key: "coreGlow", label: "Source glow", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Aurora", items: [
    { key: "auroraIntensity", label: "Intensity", min: 0, max: 1.5, step: 0.01 },
    { key: "auroraSpeed", label: "Speed", min: 0, max: 4, step: 0.05 },
    { key: "auroraTeal", label: "Teal", min: 0, max: 2, step: 0.01 },
    { key: "auroraViolet", label: "Violet", min: 0, max: 2, step: 0.01 },
    { key: "auroraGold", label: "Gold", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Envelopes", items: [
    { key: "emitterSpread", label: "Emitter spread", min: 0, max: 1, step: 0.01 },
    { key: "envelopeCount", label: "Emission rate (count)", min: 1, max: 32, step: 1 },
    { key: "fallSpeed", label: "Fall speed", min: 0, max: 0.06, step: 0.001 },
    { key: "sizeMin", label: "Size min", min: 0.1, max: 1.2, step: 0.01 },
    { key: "sizeMax", label: "Size max", min: 0.1, max: 1.5, step: 0.01 },
    { key: "depthNear", label: "Depth near", min: -3, max: 3, step: 0.05 },
    { key: "depthFar", label: "Depth far", min: -8, max: 1, step: 0.05 },
    { key: "rotation", label: "Rotation amount", min: 0, max: 3, step: 0.05 },
  ] },
  { group: "Stardust", items: [
    { key: "dustCount", label: "Count", min: 0, max: 800, step: 10 },
    { key: "dustSize", label: "Size", min: 0.005, max: 0.08, step: 0.001 },
    { key: "dustBrightness", label: "Brightness", min: 0, max: 4, step: 0.05 },
  ] },
];
export const LIMITS = { envelopes: 32, dust: 800 }; // the most the scene allocates

// the live values the scene reads; the panel writes into this object
export const heroTune: HeroTune = { ...HERO_DEFAULTS };
export const TUNE_STORE = "firma-hero-tune";
