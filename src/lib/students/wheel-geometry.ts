import type { WheelScore } from "./wheel";

export const AXES = 5;
export const WEDGE_DEG = 360 / AXES; // 72
export const DEAD_ZONE = 0.1; // × radius
export const OUTER_SLOP_PX = 16;

/** Same as RadarChart.getAngle: axis 0 at top, clockwise. */
export const axisAngle = (i: number): number =>
  (i * 2 * Math.PI) / AXES - Math.PI / 2;

/** Centre-relative screen coords (+y down) → degrees clockwise from top, [0, 360). */
export function clockwiseFromTop(x: number, y: number): number {
  const deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
  return ((deg % 360) + 360) % 360;
}

export const wedgeIndex = (x: number, y: number): number =>
  Math.round(clockwiseFromTop(x, y) / WEDGE_DEG) % AXES;

export function snapScore(dist: number, radius: number): WheelScore | null {
  if (radius <= 0) return null;
  const frac = dist / radius;
  if (frac < DEAD_ZONE) return null;
  return Math.min(5, Math.max(1, Math.round(frac * 5))) as WheelScore;
}

export function hitTest(
  x: number,
  y: number,
  radius: number,
): { index: number; score: WheelScore | null } | null {
  const dist = Math.hypot(x, y);
  if (dist > radius + OUTER_SLOP_PX) return null;
  return { index: wedgeIndex(x, y), score: snapScore(dist, radius) };
}

export function pointFor(
  i: number,
  score: WheelScore | null,
  radius: number,
): { x: number; y: number } {
  const r = score === null ? 0 : (score / 5) * radius;
  const a = axisAngle(i);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}
