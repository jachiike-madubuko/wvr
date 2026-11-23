import React, { useEffect, useRef, useState } from 'react';
import styles from './WavyStackBar.module.css';
import {
  Segment,
  NormalizedSegment,
  normalizeSegments,
  generateWavePoints,
  generateStraightEdge,
  buildBandPath,
} from './waveUtils';

export interface WavyStackBarProps {
  /** Ordered top-to-bottom. Values are normalized, so 10/50/40 and 1/5/4 render the same. */
  segments: Segment[];
  width?: number;
  height?: number;
  cornerRadius?: number;
  /** Height of the wave humps between colors, in px. */
  waveAmplitude?: number;
  /** How many full humps span the container width. */
  wavePeriods?: number;
  /** Continuous liquid motion on the internal boundaries. Off automatically for prefers-reduced-motion. */
  animated?: boolean;
  /** Radians/second. 0.4-0.8 reads as "liquid," above ~2 reads as "alarm." */
  animationSpeed?: number;
  showLabels?: boolean;
  labelFormatter?: (segment: NormalizedSegment) => string;
  /** Required: must be unique per instance on the page (powers the internal clipPath id). */
  instanceId: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = () => setReduced(query.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return reduced;
}

/**
 * Stacked percentage bar with wavy (not straight) boundaries between colors.
 * Outer container stays a clean rounded rect; only the internal divisions wave.
 *
 * Note on memoization: path recomputation is intentionally NOT wrapped in
 * useMemo. When `animated` is true the phase changes every animation frame
 * anyway, which would invalidate a memo every time regardless. When
 * `animated` is false, this only runs once per prop change, which is cheap
 * for the segment counts this component is meant for (2-6 bands).
 */
export function WavyStackBar({
  segments,
  width = 220,
  height = 320,
  cornerRadius = 26,
  waveAmplitude = 6,
  wavePeriods = 2,
  animated = true,
  animationSpeed = 0.6,
  showLabels = true,
  labelFormatter,
  instanceId,
  className,
  style,
  ariaLabel,
}: WavyStackBarProps) {
  const clipId = `wavy-stack-bar-clip-${instanceId}`;
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const [phase, setPhase] = useState(0);
  const frameRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  useEffect(() => {
    if (!shouldAnimate) return;
    const tick = (time: number) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      setPhase((p) => p + dt * animationSpeed);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = undefined;
    };
  }, [shouldAnimate, animationSpeed]);

  const normalized = normalizeSegments(segments);
  const n = normalized.length;

  const cumulative: number[] = [0];
  normalized.forEach((s) => cumulative.push(cumulative[cumulative.length - 1] + s.percent));
  const boundaryY = cumulative.map((c) => (c / 100) * height);

  const edges = boundaryY.map((y, i) => {
    const isOuterEdge = i === 0 || i === n;
    return isOuterEdge
      ? generateStraightEdge(width, y)
      : generateWavePoints(width, y, waveAmplitude, wavePeriods, phase + i * 1.1);
  });

  const bands = normalized.map((segment, i) => ({
    segment,
    d: buildBandPath(edges[i], edges[i + 1]),
  }));

  const defaultFormatter = (s: NormalizedSegment) =>
    s.label ? `${s.label} \u2013 ${Math.round(s.percent)}%` : `${Math.round(s.percent)}%`;

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{ width, height, ...style }}
    >
      <svg
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          ariaLabel ??
          `Breakdown: ${normalized
            .map((s) => `${s.label ?? 'segment'} ${Math.round(s.percent)}%`)
            .join(', ')}`
        }
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={width} height={height} rx={cornerRadius} ry={cornerRadius} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {bands.map(({ segment, d }) => (
            <path key={segment.id} d={d} fill={segment.color} />
          ))}
        </g>
        <rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          rx={cornerRadius}
          ry={cornerRadius}
          className={styles.outline}
          fill="none"
        />
      </svg>

      {showLabels && (
        <div className={styles.labelLayer} aria-hidden="true">
          {normalized.map((segment, i) => {
            const centerPercent = (cumulative[i] + cumulative[i + 1]) / 2;
            return (
              <div key={segment.id} className={styles.label} style={{ top: `${centerPercent}%` }}>
                {labelFormatter ? labelFormatter(segment) : defaultFormatter(segment)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WavyStackBar;
