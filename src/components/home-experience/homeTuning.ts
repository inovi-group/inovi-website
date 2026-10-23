/**
 * The home carousel's look and timing, in one place. HOME_DEFAULTS is what every visitor sees; paste tuned
 * numbers here to bake them in. With ?tune=1 a panel edits a live copy (homeTune), read every frame.
 */
export const HOME_DEFAULTS = {
  interval: 7,          // seconds each product stays in front before the next one comes forward (0 = no autoplay)
  transition: 1.4,      // seconds a rotation takes
  frontWidth: 0.66,     // the front product's width, as a share of the stage
  spread: 0.5,          // how far left and right the two at the back sit, as a share of the stage width
  depth: 560,           // how far back they sit (px)
  backScale: 0.62,      // their size, relative to the front one
  turn: 22,             // how far they turn toward the centre (degrees)
  blur: 4,              // their blur (px)
  dim: 0.72,            // their brightness (1 = as bright as the front one)
  backOpacity: 1, 
  backFps: 15,          // frame rate of the products at the back (they are blurred: this saves the GPU)
};
export type HomeTune = typeof HOME_DEFAULTS;
export type HomeKey = keyof HomeTune;

export const HOME_PARAMS: { group: string; items: { key: HomeKey; label: string; min?: number; max?: number; step?: number }[] }[] = [
  { group: "Rotation", items: [
    { key: "interval", label: "Interval (s, 0 = off)", min: 0, max: 20, step: 0.5 },
    { key: "transition", label: "Transition (s)", min: 0.3, max: 4, step: 0.05 },
  ] },
  { group: "Layout", items: [
    { key: "frontWidth", label: "Front width", min: 0.4, max: 0.95, step: 0.01 },
    { key: "spread", label: "Back spread", min: 0, max: 0.6, step: 0.01 },
    { key: "depth", label: "Depth (px)", min: 0, max: 1500, step: 10 },
    { key: "backScale", label: "Back size", min: 0.3, max: 1, step: 0.01 },
    { key: "turn", label: "Back turn (°)", min: 0, max: 60, step: 1 },
  ] },
  { group: "Focus", items: [
    { key: "blur", label: "Back blur (px)", min: 0, max: 20, step: 0.5 },
    { key: "dim", label: "Back brightness", min: 0.05, max: 1, step: 0.01 },
    { key: "backOpacity", label: "Back opacity", min: 0.1, max: 1, step: 0.01 },
    { key: "backFps", label: "Back frame rate", min: 2, max: 60, step: 1 },
  ] },
];

export const homeTune: HomeTune = { ...HOME_DEFAULTS };
export const HOME_STORE = "home-carousel-tune";
