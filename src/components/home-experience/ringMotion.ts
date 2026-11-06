/**
 * The product ring's motion, as pure functions (no three.js), so it can be checked frame by frame outside the
 * browser: `npm run check:ring` turns the ring through two full rotations and fails on any orientation jump.
 */
const TAU = Math.PI * 2;
const SLOT = TAU / 3; // the back slots sit at ±120° round the ring from the front

// the ring turns toward its target (in thirds of a turn: product i is in front at i), eased; returns the new value
export function stepRing(rot: number, target: number, dt: number, turnSpeed: number) {
  const next = rot + (target - rot) * (1 - Math.exp(-dt * 3.2 * turnSpeed));
  return Math.abs(target - next) < 1e-4 ? target : next;
}
// the turntable's yaw for a ring position
export const turnOf = (rot: number) => (-rot * TAU) / 3;

// an angle in (−π, π]
export const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

/**
 * An object's resting yaw in the world, from its angle round the ring (0 = the front). Between the front and
 * the back slots it turns a quarter as far as the ring (±30° at the back slots). Past them, across the very
 * back of the ring, it eases back through 0° to meet the other side, so going from one back slot to the other
 * it turns smoothly instead of flipping from +30° to −30° where the angle wraps.
 */
export function restYaw(ringAngle: number) {
  const o = wrap(ringAngle), ao = Math.abs(o);
  if (ao <= SLOT) return 0.25 * o;
  const k = (Math.PI - ao) / (Math.PI - SLOT); // 1 at a back slot, 0 at the very back
  return Math.sign(o) * 0.25 * SLOT * k * k * (3 - 2 * k);
}

// where the camera sits: in front of the ring, a little above (phones: further back, to keep the back slots in view)
export function cameraPosition(o: { R: number; distance: number; elevation: number; aspect: number }) {
  const fit = o.aspect < 1 ? 1 + (1 - o.aspect) * 0.9 : 1;
  return { x: 0, y: Math.sin(o.elevation) * o.distance * fit + 0.1, z: o.R + Math.cos(o.elevation) * o.distance * fit };
}

/**
 * Every object's yaw for one frame: `outer` (its turn relative to the turntable) and `inner` (the gentle sway,
 * and for the envelope, slot 0, the clamp that keeps it within envMaxYaw of facing the camera), and `world`, the
 * sum the viewer sees. turn is the turntable's own yaw.
 */
export function objectYaws(o: { turn: number; R: number; cam: { x: number; z: number }; t: number; spin: number; envMaxYaw: number }) {
  return [0, 1, 2].map((i) => {
    const a = i * SLOT, ring = a + o.turn;
    const rest = restYaw(ring);
    let inner = o.spin * Math.sin(o.t * 0.25 + i) * 0.18;
    if (i === 0) {
      // the envelope never turns further than envMaxYaw from facing the camera: no back, no thin edge-on profile
      const wx = Math.sin(ring) * o.R, wz = Math.cos(ring) * o.R;
      const toCam = Math.atan2(o.cam.x - wx, o.cam.z - wz);
      const off = wrap(rest + inner - toCam);
      const max = (Math.max(0, Math.min(80, o.envMaxYaw)) * Math.PI) / 180;
      inner += Math.max(-max, Math.min(max, off)) - off;
    }
    return { outer: rest - o.turn, inner, world: rest + inner };
  });
}
