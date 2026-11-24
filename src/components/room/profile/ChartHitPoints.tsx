"use client";

import { useChart } from "@/components/charts/chart-context";

export interface ChartHitPoint<T> {
  id: string;
  date: Date;
  y: number;
  color: string;
  radius?: number;
  opacity?: number;
  ariaLabel: string;
  kind?: string;
  payload: T;
}

function ChartHitPointsInner<T>({
  items,
  onSelect,
}: {
  items: ChartHitPoint<T>[];
  onSelect: (payload: T) => void;
}) {
  const { xScale, yScale } = useChart();
  if (items.length === 0) return null;

  return (
    <g>
      {items.map((item) => {
        const cx = xScale(item.date);
        const cy = yScale(item.y);
        return (
          <g key={item.id}>
            <circle
              cx={cx}
              cy={cy}
              r={item.radius ?? 5}
              fill={item.color}
              opacity={item.opacity ?? 1}
            />
            <circle
              cx={cx}
              cy={cy}
              r={14}
              fill="transparent"
              data-hit-id={item.id}
              data-kind={item.kind}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.payload);
              }}
            >
              <title>{item.ariaLabel}</title>
            </circle>
          </g>
        );
      })}
    </g>
  );
}

export const ChartHitPoints = Object.assign(ChartHitPointsInner, {
  __isPostOverlay: true as const,
});
