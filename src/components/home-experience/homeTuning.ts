/**
 * The home page's product ring: timing, layout, depth of field and light, in one place. HOME_DEFAULTS is what
 * every visitor sees; paste tuned numbers here to bake them in. With ?tune=1 a panel edits a live copy
 * (homeTune), which the scene reads every frame.
 */
export const HOME_DEFAULTS = {
  // rotation
  interval: 7,          // seconds each product stays in front before the ring turns to the next (0 = no autoplay)
  turnSpeed: 1.0,       // how fast the ring turns (1 = about 1.4 s per turn)
  spin: 1.0,            // the objects' own gentle floating and turning (0 = still)
  // layout
  ringRadius: 2.6,      // radius of the turntable
  objectScale: 1.0,
  cameraDistance: 7.2,  // from the front of the ring
  elevation: 0.24,      // how far above the ring the camera looks down from (radians)
  // depth of field
  blur: 9,              // the most blur (px at 1x) on the objects at the back
  focusRange: 0.9,      // depth around the front object that stays sharp (units)
  dim: 0.42,            // brightness of the objects at the back (1 = as bright as the front)
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
    { key: "spin", label: "Object float / turn", min: 0, max: 3, step: 0.05 },
  ] },
  { group: "Layout", items: [
    { key: "ringRadius", label: "Ring radius", min: 1.2, max: 4.5, step: 0.05 },
    { key: "objectScale", label: "Object size", min: 0.5, max: 1.6, step: 0.01 },
    { key: "cameraDistance", label: "Camera distance", min: 4, max: 14, step: 0.1 },
    { key: "elevation", label: "Camera elevation", min: 0, max: 0.9, step: 0.01 },
  ] },
  { group: "Depth of field", items: [
    { key: "blur", label: "Back blur (px)", min: 0, max: 24, step: 0.5 },
    { key: "focusRange", label: "Sharp depth range", min: 0.2, max: 3, step: 0.05 },
    { key: "dim", label: "Back brightness", min: 0.05, max: 1, step: 0.01 },
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
