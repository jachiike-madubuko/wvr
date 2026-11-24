"use client";

import type { ReactNode } from "react";
import { useChart } from "../chart-context";

function ChartTooltipInner({
  content,
}: {
  showDatePill?: boolean;
  content: (args: { point: Record<string, unknown> }) => ReactNode;
}) {
  const { data, xDataKey, xScale, margin, hoveredIndex, width } = useChart();
  if (hoveredIndex === null || !data[hoveredIndex]) return null;

  const point = data[hoveredIndex]!;
  const rawX = point[xDataKey];
  const date = rawX instanceof Date ? rawX : new Date(2026, 9, 26 + hoveredIndex);
  const x = Math.min(Math.max(margin.left + xScale(date), 80), width - 160);

  return (
    <div
      className="pointer-events-none absolute top-2 z-20 -translate-x-1/2"
      style={{ left: x }}
    >
      {content({ point })}
    </div>
  );
}

export const ChartTooltip = Object.assign(ChartTooltipInner, {
  __isTooltip: true as const,
});
