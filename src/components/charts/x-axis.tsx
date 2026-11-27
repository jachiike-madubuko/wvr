"use client";

import { useChart } from "./chart-context";

const MAX_LABEL_CHARS = 16;
const CHAR_WIDTH_PX = 6.8;
const MIN_TICK_GAP_PX = 14;

export type AxisTick = {
  key: string;
  x: number;
  label: string;
  anchor: "start" | "middle" | "end";
  left: number;
  right: number;
};

function truncateLabel(raw: string): string {
  return raw.length > MAX_LABEL_CHARS
    ? `${raw.slice(0, MAX_LABEL_CHARS - 1)}…`
    : raw;
}

function placeTick(
  x: number,
  label: string,
  idx: number,
  total: number,
  innerWidth: number,
): AxisTick {
  const width = label.length * CHAR_WIDTH_PX;
  if (idx === 0 || x - width / 2 < 0) {
    const clampedX = Math.max(0, x);
    return {
      key: `${label}-${idx}`,
      x: clampedX,
      label,
      anchor: "start",
      left: clampedX,
      right: clampedX + width,
    };
  }
  if (idx === total - 1 || x + width / 2 > innerWidth) {
    const clampedX = Math.min(innerWidth, x);
    return {
      key: `${label}-${idx}`,
      x: clampedX,
      label,
      anchor: "end",
      left: clampedX - width,
      right: clampedX,
    };
  }
  return {
    key: `${label}-${idx}`,
    x,
    label,
    anchor: "middle",
    left: x - width / 2,
    right: x + width / 2,
  };
}

export function selectVisibleTicks(
  candidates: { x: number; label: string }[],
  innerWidth: number,
  maxTicks?: number,
): AxisTick[] {
  if (candidates.length === 0) return [];

  const sorted = candidates
    .map((c, idx) => ({ ...c, idx }))
    .sort((a, b) => a.x - b.x || a.idx - b.idx);

  const placed = sorted.map((c, idx) =>
    placeTick(c.x, truncateLabel(c.label), idx, sorted.length, innerWidth),
  );

  const first = placed[0]!;
  if (placed.length === 1) return [first];

  const last = placed[placed.length - 1]!;
  const reserveLast = last.left >= first.right + MIN_TICK_GAP_PX;
  const kept: AxisTick[] = [first];

  for (let i = 1; i < placed.length - 1; i++) {
    if (
      maxTicks !== undefined &&
      kept.length + (reserveLast ? 1 : 0) >= maxTicks
    ) {
      break;
    }
    const prev = kept[kept.length - 1]!;
    const tick = placed[i]!;
    if (tick.left < prev.right + MIN_TICK_GAP_PX) continue;
    if (reserveLast && tick.right + MIN_TICK_GAP_PX > last.left) continue;
    kept.push(tick);
  }

  if (reserveLast) kept.push(last);
  return kept;
}

function toAxisDate(value: unknown, fallbackIdx: number): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(2026, 9, 26 + fallbackIdx);
}

export function XAxis({
  labels,
  numTicks,
}: {
  tickMode?: "data" | "time";
  labels?: string[];
  numTicks?: number;
}) {
  const { data, xDataKey, xScale, innerWidth, innerHeight } = useChart();
  if (data.length === 0) return null;

  const candidates = data.map((row, idx) => ({
    x: xScale(toAxisDate(row[xDataKey], idx)),
    label: labels?.[idx] ?? String(row.label ?? idx + 1),
  }));
  const ticks = selectVisibleTicks(candidates, innerWidth, numTicks);

  return (
    <g
      data-testid="chart-x-axis"
      transform={`translate(0,${innerHeight + 18})`}
      aria-hidden="true"
    >
      {ticks.map((tick) => (
        <text
          key={tick.key}
          x={tick.x}
          y={0}
          textAnchor={tick.anchor}
          fill="var(--chart-label, #8892b0)"
          fontSize={11}
        >
          {tick.label}
        </text>
      ))}
    </g>
  );
}
