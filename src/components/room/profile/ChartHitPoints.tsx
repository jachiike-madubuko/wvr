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
  testId?: string;
  dataIndex?: number;
  flagged?: boolean;
  payload: T;
}

function ChartHitPointsInner<T>({
  items,
  onSelect,
}: {
  items: ChartHitPoint<T>[];
  onSelect: (payload: T) => void;
}) {
  const { data, xScale, yScale, setHoveredIndex } = useChart();
  if (items.length === 0) return null;

  return (
    <g>
      {items.map((item, idx) => {
        const cx = xScale(item.date);
        const cy = yScale(item.y);
        const hoverIdx =
          item.dataIndex !== undefined
            ? item.dataIndex
            : idx < data.length
              ? idx
              : null;
        return (
          <g key={item.id}>
            {item.flagged && (
              <circle
                cx={cx}
                cy={cy}
                r={(item.radius ?? 5) + 6}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray="3 2"
                opacity={0.95}
              />
            )}
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
              role="button"
              tabIndex={0}
              aria-label={item.ariaLabel}
              data-testid={item.testId}
              data-hit-id={item.id}
              data-kind={item.kind}
              data-flagged={item.flagged ? "true" : undefined}
              style={{ cursor: "pointer" }}
              className="outline-none focus-visible:stroke-[#58b6fa] focus-visible:stroke-2"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.payload);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(item.payload);
                }
              }}
              onFocus={() => {
                if (hoverIdx !== null) setHoveredIndex(hoverIdx);
              }}
              onBlur={() => setHoveredIndex(null)}
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
