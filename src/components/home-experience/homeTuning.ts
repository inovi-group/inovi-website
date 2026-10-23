/**
 * The home page's product ring: timing, layout, depth (atmosphere or depth of field) and light, in one place. HOME_DEFAULTS is what
 * every visitor sees; paste tuned numbers here to bake them in. With ?tune=1 a panel edits a live copy
 * (homeTune), which the scene reads every frame.
 */
export const HOME_DEFAULTS = {
  // rotation
  interval: 7,          // seconds each product stays in front before the ring turns to the next (0 = no autoplay)
  turnSpeed: 1.0,       // how fast the ring turns (1 = about 1.4 s per turn)
  spin: 1.0,            // the objects' own gentle motion overall (0 = still)
  // each object faces the camera; on top of that it sways and drifts a little, never turning away
  swayYaw: 15,          // how far it sways left and right (degrees, at most 25)
  swayTilt: 8,          // how far it tilts forward and back (degrees, at most 25)
  swaySpeed: 1.0,       // how fast it sways and drifts (1 = one slow sway every ~30 s)
  drift: 0.08,          // how far it drifts from its place (units)
  // layout
  ringRadius: 2.6,      // radius of the turntable
  objectScale: 1.0,
  cameraDistance: 7.2,  // from the front of the ring
  elevation: 0.24,      // how far above the ring the camera looks down from (radians)
  // depth: how the two objects at the back recede
  depthMode: 0,         // 0 = atmosphere (haze, no blur), 1 = depth of field (blur)
  focusRange: 0.9,      // depth around the front object that stays fully clear (units)
  // 0 · atmosphere
  haze: 0.22,           // how much of the haze colour the back objects take on
  hazeColor: "#1b2638",
  desaturate: 0.55,     // how much colour they lose
  lowerContrast: 0.35,  // how much contrast they lose
  dim: 0.55,            // their light (1 = as bright as the front one)
  backScale: 0.88,      // their size, on top of perspective
  // 1 · depth of field
  bokeh: 3.0,           // size of the blur (pmndrs DepthOfFieldEffect bokeh scale)
  // light
  spotlight: 0.4,       // the soft column of light on the front object
  frontGlow: 1.0,       // the front object's own glow
  firmaRing: 0.6,       // the FIRMA ring and seal at the centre
  beamColor: "#5b86c9",
};
export type HomeTune = typeof HOME_DEFAULTS;
export type HomeKey = keyof HomeTune;

export const HOME_PARAMS: { group: string; items: { key: HomeKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Rotation", items: [
    { key: "interval", label: "Interval (s, 0 = off)", min: 0, max: 20, step: 0.5 },
    { key: "turnSpeed", label: "Turn speed", min: 0.2, max: 3, step: 0.05 },
    { key: "spin", label: "Object motion (overall)", min: 0, max: 2, step: 0.05 },
    { key: "swayYaw", label: "Sway left/right (°)", min: 0, max: 25, step: 0.5 },
    { key: "swayTilt", label: "Tilt (°)", min: 0, max: 25, step: 0.5 },
    { key: "swaySpeed", label: "Sway speed", min: 0.1, max: 3, step: 0.05 },
    { key: "drift", label: "Drift", min: 0, max: 0.4, step: 0.005 },
  ] },
  { group: "Layout", items: [
    { key: "ringRadius", label: "Ring radius", min: 1.2, max: 4.5, step: 0.05 },
    { key: "objectScale", label: "Object size", min: 0.5, max: 1.6, step: 0.01 },
    { key: "cameraDistance", label: "Camera distance", min: 4, max: 14, step: 0.1 },
    { key: "elevation", label: "Camera elevation", min: 0, max: 0.9, step: 0.01 },
  ] },
  { group: "Depth (0 = atmosphere, 1 = depth of field)", items: [
    { key: "depthMode", label: "Mode", min: 0, max: 1, step: 1 },
    { key: "focusRange", label: "Clear depth range", min: 0.2, max: 3, step: 0.05 },
  ] },
  { group: "Atmosphere (mode 0)", items: [
    { key: "haze", label: "Haze", min: 0, max: 1, step: 0.01 },
    { key: "hazeColor", label: "Haze colour" },
    { key: "desaturate", label: "Desaturate", min: 0, max: 1, step: 0.01 },
    { key: "lowerContrast", label: "Lower contrast", min: 0, max: 1, step: 0.01 },
    { key: "dim", label: "Back brightness", min: 0.05, max: 1, step: 0.01 },
    { key: "backScale", label: "Back size", min: 0.5, max: 1, step: 0.01 },
  ] },
  { group: "Depth of field (mode 1)", items: [
    { key: "bokeh", label: "Bokeh size", min: 0, max: 8, step: 0.1 },
  ] },
  { group: "Light", items: [
    { key: "spotlight", label: "Spotlight", min: 0, max: 1.5, step: 0.01 },
    { key: "frontGlow", label: "Front glow", min: 0, max: 2.5, step: 0.01 },
    { key: "firmaRing", label: "FIRMA ring", min: 0, max: 1.5, step: 0.01 },
    { key: "beamColor", label: "Light colour" },
  ] },
];

export const homeTune: HomeTune = { ...HOME_DEFAULTS };
export const HOME_STORE = "home-ring-tune";
