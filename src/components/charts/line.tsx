"use client";

import { curveMonotoneX, line } from "d3-shape";
import { useChart } from "./chart-context";

export function Line({
  dataKey,
  stroke = "var(--signal-blue)",
  strokeWidth = 2,
}: {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  fadeEdges?: boolean;
}) {
  const { data, xDataKey, xScale, yScale } = useChart();

  const points: [number, number][] = [];
  data.forEach((row, idx) => {
    const rawY = row[dataKey];
    if (typeof rawY !== "number" || !Number.isFinite(rawY)) return;
    const rawX = row[xDataKey];
    const date = rawX instanceof Date ? rawX : new Date(2026, 9, 26 + idx);
    points.push([xScale(date), yScale(rawY)]);
  });

  if (points.length === 0) return null;

  const d =
    line<[number, number]>()
      .x((p) => p[0])
      .y((p) => p[1])
      .curve(curveMonotoneX)(points) ?? "";

  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
