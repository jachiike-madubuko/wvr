"use client";

import { useChart } from "./chart-context";

export function XAxis({
  labels,
}: {
  tickMode?: "data" | "time";
  labels?: string[];
  numTicks?: number;
}) {
  const { data, xDataKey, xScale, innerHeight } = useChart();
  if (data.length === 0) return null;

  return (
    <g transform={`translate(0,${innerHeight + 18})`} aria-hidden="true">
      {data.map((row, idx) => {
        const rawX = row[xDataKey];
        const date = rawX instanceof Date ? rawX : new Date(2026, 9, 26 + idx);
        const label = labels?.[idx] ?? String(row.label ?? idx + 1);
        return (
          <text
            key={`${label}-${idx}`}
            x={xScale(date)}
            y={0}
            textAnchor="middle"
            fill="var(--chart-label, #8892b0)"
            fontSize={11}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}
