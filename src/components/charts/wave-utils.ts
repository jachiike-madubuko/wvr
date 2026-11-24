export interface WavePoint {
  x: number;
  y: number;
}

export interface Segment {
  id: string;
  value: number;
  color: string;
  label?: string;
}

export interface NormalizedSegment extends Segment {
  percent: number;
}

export function normalizeSegments(segments: Segment[]): NormalizedSegment[] {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    const even = 100 / (segments.length || 1);
    return segments.map((s) => ({ ...s, percent: even }));
  }
  return segments.map((s) => ({ ...s, percent: (s.value / total) * 100 }));
}

export function generateWavePoints(
  width: number,
  baselineY: number,
  amplitude: number,
  periods: number,
  phase: number,
  resolution = 32,
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

export function generateStraightEdge(width: number, y: number): WavePoint[] {
  return [
    { x: 0, y },
    { x: width, y },
  ];
}
