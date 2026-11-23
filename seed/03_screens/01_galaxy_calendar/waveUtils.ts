/**
 * waveUtils.ts
 * Pure geometry helpers for WavyStackBar. No React, no side effects,
 * so they're trivially unit-testable on their own.
 */

export interface WavePoint {
  x: number;
  y: number;
}

export interface Segment {
  /** Stable key, also used as the React list key. */
  id: string;
  /** Raw value. Segments are normalized against the sum of all values,
   *  so 10/50/40 and 1/5/4 render identically. */
  value: number;
  /** Any valid CSS color. Fully caller-controlled, not hardcoded. */
  color: string;
  label?: string;
}

export interface NormalizedSegment extends Segment {
  /** 0-100, guaranteed to sum to 100 across the full segment list. */
  percent: number;
}

/** Scales raw values so they sum to 100. Falls back to an even split if the sum is 0. */
export function normalizeSegments(segments: Segment[]): NormalizedSegment[] {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    const even = 100 / (segments.length || 1);
    return segments.map((s) => ({ ...s, percent: even }));
  }
  return segments.map((s) => ({ ...s, percent: (s.value / total) * 100 }));
}

/**
 * Samples a sine wave across the given width at a fixed baseline height.
 * `periods` controls how many full humps fit across `width`.
 */
export function generateWavePoints(
  width: number,
  baselineY: number,
  amplitude: number,
  periods: number,
  phase: number,
  resolution = 40
): WavePoint[] {
  const points: WavePoint[] = [];
  for (let i = 0; i <= resolution; i++) {
    const x = (i / resolution) * width;
    const angle = (x / width) * periods * Math.PI * 2 + phase;
    const y = baselineY + Math.sin(angle) * amplitude;
    points.push({ x, y });
  }
  return points;
}

/** Straight-line edge, used for the outer top/bottom of the container. */
export function generateStraightEdge(width: number, y: number): WavePoint[] {
  return [
    { x: 0, y },
    { x: width, y },
  ];
}

/**
 * Converts an ordered point list into a smooth SVG path fragment (no leading "M").
 * Standard "quadratic through midpoints" trick: each raw point is a control
 * point, each midpoint becomes an on-curve point, so the line has no kinks.
 */
export function pointsToSmoothPathFragment(points: WavePoint[]): string {
  if (points.length < 2) return '';
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x.toFixed(2)},${curr.y.toFixed(2)} ${midX.toFixed(2)},${midY.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(2)},${last.y.toFixed(2)}`;
  return d;
}

/**
 * Builds one closed band shape between a top edge and a bottom edge, both
 * running left-to-right. Adjacent bands reuse the exact same edge point
 * array for their shared boundary, so seams never gap or overlap.
 */
export function buildBandPath(topPoints: WavePoint[], bottomPoints: WavePoint[]): string {
  const bottomReversed = [...bottomPoints].reverse();
  let d = `M ${topPoints[0].x.toFixed(2)},${topPoints[0].y.toFixed(2)}`;
  d += pointsToSmoothPathFragment(topPoints);
  d += ` L ${bottomReversed[0].x.toFixed(2)},${bottomReversed[0].y.toFixed(2)}`;
  d += pointsToSmoothPathFragment(bottomReversed);
  d += ' Z';
  return d;
}
