/**
 * The home scene's look, in one place. HOME_DEFAULTS is what every visitor sees; paste tuned numbers here to
 * bake them in. With ?tune=1 a panel edits a live copy (homeTune), which the scene reads every frame.
 */
export const HOME_DEFAULTS = {
  // framing
  heroYaw: 0.55,          // the ring's turn in the hero
  heroElevation: 0.38,    // how far above the ring the camera looks down from
  heroZoom: 1.0,
  heroShiftX: 0.2,        // how far right the hero scene sits, in viewport widths
  focusZoom: 1.0,         // how close the story comes to each product
  drift: 1.0,             // gentle idle turning (0 = still)
  stationScale: 1.0,      // size of the three products
  // the governance layer: a ring of chain links under the products
  ringRadius: 3.4,
  linkGlow: 0.9,          // brightness of the links
  pulseSpeed: 0.12,       // records travelling around the ring (turns per second)
  pulseWidth: 0.35,
  flowParticles: 1.0,     // records falling from each product into the ring
  // products
  envelopeGlow: 0.35,     // FIRMA: the gold envelopes' own light
  cardGlow: 1.0,          // iSale: the deal cards' edges and the scan
  plotWater: 0.8,         // AGRO: how deep the water reaches in the small plot
  labelOpacity: 0.85,
  // light and air
  beamOpacity: 0.3,
  beamWidth: 1.0,
  beamColor: "#4a7fd6",
  motesCount: 240,
  motesBrightness: 1.1,
  plinthGrid: 0.6,
};
export type HomeTune = typeof HOME_DEFAULTS;
export type HomeKey = keyof HomeTune;

export const HOME_PARAMS: { group: string; items: { key: HomeKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Framing", items: [
    { key: "heroYaw", label: "Hero turn", min: -1.5, max: 1.5, step: 0.01 },
    { key: "heroElevation", label: "Hero elevation", min: 0, max: 1.2, step: 0.01 },
    { key: "heroZoom", label: "Hero zoom", min: 0.6, max: 1.6, step: 0.01 },
    { key: "heroShiftX", label: "Hero shift right", min: 0, max: 0.35, step: 0.005 },
    { key: "focusZoom", label: "Product zoom", min: 0.6, max: 1.6, step: 0.01 },
    { key: "drift", label: "Idle turning", min: 0, max: 3, step: 0.05 },
    { key: "stationScale", label: "Product size", min: 0.6, max: 1.5, step: 0.01 },
  ] },
  { group: "Governance ring", items: [
    { key: "ringRadius", label: "Radius", min: 2.4, max: 4.5, step: 0.01 },
    { key: "linkGlow", label: "Link glow", min: 0, max: 2, step: 0.01 },
    { key: "pulseSpeed", label: "Record speed", min: 0, max: 0.5, step: 0.005 },
    { key: "pulseWidth", label: "Record width", min: 0.05, max: 1, step: 0.01 },
    { key: "flowParticles", label: "Records falling in", min: 0, max: 2, step: 0.01 },
  ] },
  { group: "Products", items: [
    { key: "envelopeGlow", label: "FIRMA envelope glow", min: 0, max: 1.5, step: 0.01 },
    { key: "cardGlow", label: "iSale card glow", min: 0, max: 2, step: 0.01 },
    { key: "plotWater", label: "AGRO water depth", min: 0, max: 1.3, step: 0.01 },
    { key: "labelOpacity", label: "Labels", min: 0, max: 1, step: 0.01 },
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
export const HOME_LIMITS = { motes: 600 };

export const homeTune: HomeTune = { ...HOME_DEFAULTS };
export const HOME_STORE = "home-scene-tune";
