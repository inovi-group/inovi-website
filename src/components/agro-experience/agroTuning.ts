/**
 * The Agro soil scene's look, in one place. AGRO_DEFAULTS is what every visitor sees; paste tuned numbers here
 * to bake them in. With ?tune=1 a panel edits a live copy (agroTune), which the scene reads every frame.
 * Lengths are in scene units: the soil block is 6 wide, 3 deep (front to back) and 3.2 tall.
 */
export const AGRO_DEFAULTS = {
  // framing
  heroYaw: -0.52,         // the block's turn in the hero (negative shows more of its right side)
  heroElevation: 0.42,    // how far above the block the camera looks down from (0 = level)
  heroZoom: 1.0,          // hero framing (higher = closer)
  heroShiftX: 0.2,        // how far right the hero scene sits, in viewport widths
  storyZoom: 1.18,        // how close the story steps come to the cut face
  drift: 1.0,             // gentle idle turning (0 = still)
  // soil
  topsoil: "#3a2a1c",
  subsoil: "#4e3621",
  clay: "#3b3430",
  layerLines: 0.35,       // the fine survey lines between the strata
  grain: 1.0,             // texture of the soil (0 = flat colour)
  depthShade: 0.55,       // how much darker the soil gets with depth
  // water
  waterColor: "#3fc1d8",
  wetDarken: 0.32,        // wet soil darkens
  wetTint: 0.3,           // and takes on the water's colour
  frontGlow: 0.75,        // the bright line at the wetting front
  sparkle: 0.8,           // moving glints in wet soil while water is dosed
  mapStrength: 0.6,       // the moisture map overlay (step 2): how strongly it colours the soil
  // sensors and data
  probeGlow: 1.0,         // sensor glow
  pulseSpeed: 0.45,       // reading pulses per second
  pulseSize: 0.55,        // how far each reading ripple spreads
  dataPulses: 1.0,        // brightness of readings travelling up the probes and out to the gateway
  // crops and roots
  cropHeight: 0.42,
  cropSway: 1.0,
  rootOpacity: 0.45,
  // drip line
  dropletCount: 90,
  dropletSize: 0.05,
  // light and air
  beamOpacity: 0.28,      // the soft column of light from above
  beamWidth: 1.0,
  beamColor: "#5fc79a",
  motesCount: 220,
  motesBrightness: 1.1,
  plinthGrid: 0.5,        // the faint grid the block floats over
};
export type AgroTune = typeof AGRO_DEFAULTS;
export type AgroKey = keyof AgroTune;

export const AGRO_PARAMS: { group: string; items: { key: AgroKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Framing", items: [
    { key: "heroYaw", label: "Hero turn", min: -1.2, max: 0.4, step: 0.01 },
    { key: "heroElevation", label: "Hero elevation", min: 0, max: 1.2, step: 0.01 },
    { key: "heroZoom", label: "Hero zoom", min: 0.6, max: 1.6, step: 0.01 },
    { key: "heroShiftX", label: "Hero shift right", min: 0, max: 0.35, step: 0.005 },
    { key: "storyZoom", label: "Story zoom", min: 0.8, max: 1.6, step: 0.01 },
    { key: "drift", label: "Idle turning", min: 0, max: 3, step: 0.05 },
  ] },
  { group: "Soil", items: [
    { key: "topsoil", label: "Topsoil" },
    { key: "subsoil", label: "Subsoil" },
    { key: "clay", label: "Deep clay" },
    { key: "layerLines", label: "Layer lines", min: 0, max: 1.5, step: 0.01 },
    { key: "grain", label: "Grain", min: 0, max: 2, step: 0.01 },
    { key: "depthShade", label: "Depth shading", min: 0, max: 1, step: 0.01 },
  ] },
  { group: "Water", items: [
    { key: "waterColor", label: "Water colour" },
    { key: "wetDarken", label: "Wet darkening", min: 0, max: 0.8, step: 0.01 },
    { key: "wetTint", label: "Wet tint", min: 0, max: 1, step: 0.01 },
    { key: "frontGlow", label: "Wetting front glow", min: 0, max: 2.5, step: 0.01 },
    { key: "sparkle", label: "Glints while dosing", min: 0, max: 2, step: 0.01 },
    { key: "mapStrength", label: "Moisture map", min: 0, max: 1, step: 0.01 },
  ] },
  { group: "Sensors & data", items: [
    { key: "probeGlow", label: "Sensor glow", min: 0, max: 2.5, step: 0.01 },
    { key: "pulseSpeed", label: "Pulse rate", min: 0, max: 1.5, step: 0.01 },
    { key: "pulseSize", label: "Pulse size", min: 0.1, max: 1.5, step: 0.01 },
    { key: "dataPulses", label: "Data pulses", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Crops & roots", items: [
    { key: "cropHeight", label: "Crop height", min: 0.15, max: 0.9, step: 0.01 },
    { key: "cropSway", label: "Crop sway", min: 0, max: 3, step: 0.05 },
    { key: "rootOpacity", label: "Roots", min: 0, max: 1, step: 0.01 },
  ] },
  { group: "Drip line", items: [
    { key: "dropletCount", label: "Droplets", min: 0, max: 300, step: 5 },
    { key: "dropletSize", label: "Droplet size", min: 0.01, max: 0.15, step: 0.001 },
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
export const AGRO_LIMITS = { droplets: 300, motes: 600 };

export const agroTune: AgroTune = { ...AGRO_DEFAULTS };
export const AGRO_STORE = "agro-scene-tune";
