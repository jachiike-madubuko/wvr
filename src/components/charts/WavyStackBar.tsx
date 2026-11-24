"use client";

import { Area } from "@visx/shape";
import { curveCatmullRom } from "d3-shape";
import { useEffect, useRef, useState } from "react";
import {
  generateStraightEdge,
  generateWavePoints,
  normalizeSegments,
  type NormalizedSegment,
  type Segment,
  type WavePoint,
} from "./wave-utils";

export interface WavyStackBarProps {
  segments: Segment[];
  width?: number;
  height?: number;
  cornerRadius?: number;
  waveAmplitude?: number;
  wavePeriods?: number;
  animated?: boolean;
  animationSpeed?: number;
  showLabels?: boolean;
  instanceId: string;
  ariaLabel?: string;
}

interface BandDatum {
  x: number;
  y0: number;
  y1: number;
}

function interpolateY(points: WavePoint[], x: number): number {
  if (points.length === 0) return 0;
  if (points.length === 2) return points[0]!.y;
  const maxIdx = points.length - 1;
  const lastX = points[maxIdx]!.x || 1;
  const idx = Math.min(maxIdx, Math.max(0, Math.round((x / lastX) * maxIdx)));
  return points[idx]!.y;
}

export function WavyStackBar({
  segments,
  width = 160,
  height = 110,
  cornerRadius = 16,
  waveAmplitude = 5,
  wavePeriods = 2,
  animated = true,
  animationSpeed = 0.6,
  showLabels = false,
  instanceId,
  ariaLabel,
}: WavyStackBarProps) {
  const clipId = `wavy-stack-clip-${instanceId}`;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const shouldAnimate = animated && !reducedMotion;

  useEffect(() => {
    if (!shouldAnimate) return;
    const tick = (now: number) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setPhase((p) => p + dt * animationSpeed);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = undefined;
    };
  }, [shouldAnimate, animationSpeed]);

  const normalized = normalizeSegments(segments).filter((s) => s.percent > 0);
  const n = normalized.length;
  const cumulative: number[] = [0];
  for (const s of normalized) {
    cumulative.push((cumulative[cumulative.length - 1] ?? 0) + s.percent);
  }
  const boundaryY = cumulative.map((c) => (c / 100) * height);

  const edges = boundaryY.map((y, i) =>
    i === 0 || i === n
      ? generateStraightEdge(width, y)
      : generateWavePoints(width, y, waveAmplitude, wavePeriods, phase + i * 1.1, 24),
  );

  const bands: { segment: NormalizedSegment; data: BandDatum[] }[] = normalized.map(
    (segment, i) => {
      const top = edges[i]!;
      const bottom = edges[i + 1]!;
      const sampleCount = Math.max(top.length, bottom.length);
      const data: BandDatum[] = [];
      for (let k = 0; k < sampleCount; k++) {
        const x = (k / Math.max(1, sampleCount - 1)) * width;
        data.push({
          x,
          y0: interpolateY(top, x),
          y1: interpolateY(bottom, x),
        });
      }
      return { segment, data };
    },
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-[14px] border border-white/10 bg-[#0d111a]"
      style={{ height }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          ariaLabel ??
          `Pace breakdown: ${normalized
            .map((s) => `${s.label ?? s.id} ${Math.round(s.percent)}%`)
            .join(", ")}`
        }
        className="block w-full h-full"
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              rx={cornerRadius}
              ry={cornerRadius}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {bands.map(({ segment, data }) => (
            <Area<BandDatum>
              key={segment.id}
              data={data}
              x={(d) => d.x}
              y0={(d) => d.y0}
              y1={(d) => d.y1}
              curve={curveCatmullRom}
              fill={segment.color}
            />
          ))}
        </g>
      </svg>

      {showLabels && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {normalized.map((segment, i) => {
            const top = ((cumulative[i] ?? 0) + (cumulative[i + 1] ?? 0)) / 2;
            return (
              <span
                key={segment.id}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/95 drop-shadow"
                style={{ top: `${top}%` }}
              >
                {Math.round(segment.percent)}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
