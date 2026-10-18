// Gesture math for dragging on the stream canvas. Kept free of DOM types so it
// can be unit-tested with node:test; the viewport wires it to pointer events.

/** Finger travel (screen px) before a touch counts as a scroll instead of a tap. */
export const TOUCH_SLOP_PX = 8;

/** Release speed (screen px per ms) below which the content stops dead. */
export const FLING_MIN_SPEED = 0.1;

/** Only samples this recent (ms) estimate the release velocity. */
const VELOCITY_WINDOW_MS = 100;

/** Speed kept after each 16 ms of coasting. */
const FRICTION_PER_FRAME = 0.92;

export type TouchSample = { x: number; y: number; t: number };

export type Velocity = { x: number; y: number };

/**
 * Remote wheel delta for a finger movement of `screenDelta` px. Content follows
 * the finger, so a finger moving up (negative) scrolls the page down (positive).
 * `remotePerScreenPx` converts screen pixels into remote CSS pixels.
 */
export function wheelDelta(screenDelta: number, remotePerScreenPx: number): number {
  return -screenDelta * remotePerScreenPx;
}

export function isScrollGesture(travelX: number, travelY: number): boolean {
  return Math.hypot(travelX, travelY) > TOUCH_SLOP_PX;
}

/**
 * Release velocity from the samples inside the recent window. The last sample
 * must be the release itself: a finger that paused before lifting then reads
 * as zero speed instead of its earlier motion.
 */
export function releaseVelocity(samples: readonly TouchSample[]): Velocity {
  const last = samples[samples.length - 1];
  if (!last) return { x: 0, y: 0 };
  const first = samples.find((s) => last.t - s.t <= VELOCITY_WINDOW_MS);
  if (!first || first === last) return { x: 0, y: 0 };
  const dt = last.t - first.t;
  if (dt <= 0) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}

export function speed(v: Velocity): number {
  return Math.hypot(v.x, v.y);
}

/** Velocity after `dtMs` of coasting. Frame-rate independent. */
export function decayVelocity(v: Velocity, dtMs: number): Velocity {
  const factor = Math.pow(FRICTION_PER_FRAME, dtMs / 16);
  return { x: v.x * factor, y: v.y * factor };
}
