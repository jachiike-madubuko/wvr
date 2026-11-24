"use client";

import { useChart } from "./chart-context";

export function Grid({
  horizontal = true,
  stroke = "rgba(255, 255, 255, 0.08)",
}: {
  horizontal?: boolean;
  stroke?: string;
}) {
  const { innerWidth, innerHeight } = useChart();
  if (!horizontal) return null;

  const ratios = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g aria-hidden="true">
      {ratios.map((r) => (
        <line
          key={r}
          x1={0}
          x2={innerWidth}
          y1={r * innerHeight}
          y2={r * innerHeight}
          stroke={stroke}
          strokeDasharray={r === 1 ? undefined : "3 3"}
        />
      ))}
    </g>
  );
}
