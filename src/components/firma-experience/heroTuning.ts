/**
 * The envelope hero's look, in one place. HERO_DEFAULTS is what every visitor sees; paste tuned numbers here
 * to bake them in. With ?tune=1 a panel edits a live copy (heroTune), which the scene reads every frame.
 * Positions and widths are in units of the scene's half-width / half-height (phones scale them a little).
 */
export const HERO_DEFAULTS = {
  // light source and beam
  sourceX: 0.98,         // horizontal position of the light's source (0 = scene centre, 1 = its right edge)
  sourceHeight: 1.69,    // height of the source above the scene's centre (about 1.25 is the top edge: above it, the
                         // source is off the page and the beam enters from above)
  sourceDepth: -1.25,    // distance of the beam behind (−) or in front of (+) the deal's plane
  destX: 0.26,           // where the beam lands: horizontal (0 = scene centre, −1 = its left edge, 1 = its right edge)
  destY: -1.6,           // how low it reaches (−1.25 is about the bottom edge of the hero)
  beamWidth: 0.49,       // half-width of the beam at its source
  beamSpread: 0.16,      // how much it widens going down (0 = a column with parallel sides)
  beamLength: 0.8,       // length of the beam (1 = from the source down to the middle bottom)
  beamOpacity: 1.0,      // density of the beam's body
  beamBrightness: 0.21,  // the brighter inner core
  beamColor: "#2b9c80",
  coreGlow: 0.0,         // the hot spot at the source
  beamFluctuation: 1.44, // 0 = perfectly smooth; 1 = soft drifting streaks; up to 3 = flickering, rippling edges
  fluctuationSpeed: 0.4,
  // aurora, inside the beam
  auroraIntensity: 0.52,
  auroraSpeed: 0.72,     // how fast the ribbons flow (0 = still)
  auroraLength: 1.88,    // how far down the beam the ribbons reach, in beam lengths (independent of the beam)
  auroraRibbons: 6,      // how many ribbons flow down the beam
  auroraWidth: 0.205,    // width of each ribbon, as a share of the beam's width (they stay inside it)
  auroraSpread: 1.54,    // 0 = all ribbons in the centre, 1 = across the beam's full width, 2 = twice its width
  auroraTeal: 1.06,      // colour mix: weight of each ribbon
  auroraViolet: 0.69,
  auroraGold: 0.69,
  // envelopes
  emitterSpread: 0.92,   // how far envelopes fan out across the cone (1 = to its edges)
  envelopeCount: 25,     // emission rate: how many are in the stream at once (phones show about half)
  fallSpeed: 0.023,
  fadeStart: 2.13,       // where along their path envelopes start to fade, in beam lengths (past 1 they leave the beam)
  fadeLength: 0.81,      // how long the fade takes, in beam lengths
  sizeMin: 0.28,
  sizeMax: 0.55,
  depthNear: 0.3,        // depth range the stream spreads over as it falls
  depthFar: -8.0,
  rotation: 0.6,         // amount of gentle turning (0 = none)
  minSpawnDistance: 1.0, // no envelope starts closer than this to another, in widths of the largest envelope
  // the featured envelope, while it is picked out and scanned (then it glides into the story's place)
  pickX: 0,              // horizontal shift, in viewport widths (0 = where the story's deal sits)
  pickY: 0.49,           // vertical position, from the top of the viewport (0.5 = the middle)
  pickSize: 0.75,
  scanZoom: 1.45,        // the envelope alone is shown this much larger while it is scanned (its cards readable)
  envelopeGlow: 1.19,    // the gold as a light source: emission, and the glow radiating from its edges
  glowRadius: 0.35,      // how far the glow reaches out from the envelope's edges
  lightCast: 0.0,        // how much each envelope lights up the stardust around it
  stampColor: "#8f1d2c", // Firma's wax seal, wherever it appears
  // stardust
  dustCount: 780,        // phones show about 40% of these
  dustSize: 0.01,
  dustBrightness: 2.9,
};
export type HeroTune = typeof HERO_DEFAULTS;
export type TuneKey = keyof HeroTune;

// the panel: groups of sliders (and one colour picker), built from this list
export const HERO_PARAMS: { group: string; items: { key: TuneKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Light source & beam", items: [
    { key: "sourceX", label: "Source horizontal", min: -1.5, max: 3, step: 0.01 },
    { key: "sourceHeight", label: "Source height", min: 0.4, max: 5, step: 0.01 },
    { key: "sourceDepth", label: "Source distance (depth)", min: -6, max: 2, step: 0.05 },
    { key: "destX", label: "Destination X", min: -2.5, max: 2.5, step: 0.01 },
    { key: "destY", label: "Destination Y", min: -3.5, max: 0.5, step: 0.01 },
    { key: "beamWidth", label: "Beam width (at source)", min: 0.01, max: 2, step: 0.01 },
    { key: "beamSpread", label: "Beam spread (widening)", min: 0, max: 2.5, step: 0.01 },
    { key: "beamLength", label: "Beam length", min: 0.5, max: 1.8, step: 0.01 },
    { key: "beamOpacity", label: "Beam opacity / density", min: 0, max: 1, step: 0.01 },
    { key: "beamBrightness", label: "Beam brightness (core)", min: 0, max: 1, step: 0.01 },
    { key: "beamColor", label: "Beam colour" },
    { key: "coreGlow", label: "Source glow", min: 0, max: 2, step: 0.01 },
    { key: "beamFluctuation", label: "Fluctuation (smooth → textured)", min: 0, max: 3, step: 0.01 },
    { key: "fluctuationSpeed", label: "Fluctuation speed", min: 0, max: 8, step: 0.05 },
  ] },
  { group: "Aurora", items: [
    { key: "auroraIntensity", label: "Intensity", min: 0, max: 1.5, step: 0.01 },
    { key: "auroraSpeed", label: "Speed", min: 0, max: 3, step: 0.01 },
    { key: "auroraLength", label: "Length (down the beam)", min: 0.1, max: 2.5, step: 0.01 },
    { key: "auroraRibbons", label: "Ribbons (count)", min: 1, max: 8, step: 1 },
    { key: "auroraWidth", label: "Ribbon width", min: 0.03, max: 0.45, step: 0.005 },
    { key: "auroraSpread", label: "Aurora spread", min: 0, max: 2, step: 0.01 },
    { key: "auroraTeal", label: "Teal", min: 0, max: 2, step: 0.01 },
    { key: "auroraViolet", label: "Violet", min: 0, max: 2, step: 0.01 },
    { key: "auroraGold", label: "Gold", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Envelopes", items: [
    { key: "emitterSpread", label: "Emitter spread", min: 0, max: 1, step: 0.01 },
    { key: "envelopeCount", label: "Emission rate (count)", min: 1, max: 32, step: 1 },
    { key: "fallSpeed", label: "Fall speed", min: 0, max: 0.06, step: 0.001 },
    { key: "fadeStart", label: "Fade start (along path)", min: 0.1, max: 2.5, step: 0.01 },
    { key: "fadeLength", label: "Fade length", min: 0.02, max: 1.5, step: 0.01 },
    { key: "sizeMin", label: "Size min", min: 0.1, max: 1.2, step: 0.01 },
    { key: "sizeMax", label: "Size max", min: 0.1, max: 1.5, step: 0.01 },
    { key: "depthNear", label: "Depth near", min: -3, max: 3, step: 0.05 },
    { key: "depthFar", label: "Depth far", min: -8, max: 1, step: 0.05 },
    { key: "rotation", label: "Rotation amount", min: 0, max: 3, step: 0.05 },
    { key: "minSpawnDistance", label: "Min spawn distance", min: 0, max: 3, step: 0.05 },
  ] },
  { group: "Featured envelope (pick & scan)", items: [
    { key: "pickX", label: "Horizontal shift", min: -0.4, max: 0.4, step: 0.005 },
    { key: "pickY", label: "Vertical (from top)", min: 0.2, max: 0.85, step: 0.005 },
    { key: "pickSize", label: "Size", min: 0.4, max: 2.5, step: 0.01 },
    { key: "scanZoom", label: "Envelope zoom while scanned", min: 1, max: 2.2, step: 0.01 },
  ] },
  { group: "Gold glow", items: [
    { key: "envelopeGlow", label: "Envelope glow / emission", min: 0, max: 2, step: 0.01 },
    { key: "glowRadius", label: "Glow radius", min: 0, max: 3, step: 0.02 },
    { key: "lightCast", label: "Light cast (on dust)", min: 0, max: 4, step: 0.05 },
  ] },
  { group: "Firma stamp", items: [
    { key: "stampColor", label: "Stamp colour" },
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
