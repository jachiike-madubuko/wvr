"use client";

import { useChart } from "@/components/charts/chart-context";

export interface ChartHitPoint<T> {
  date: Date;
  /** Plotted y value in the same space the `Line` uses. */
  y: number;
  /** Decorative dot fill, e.g. `var(--signal-coral)` for a struggling node. */
  color: string;
  radius?: number;
  opacity?: number;
  ariaLabel: string;
  payload: T;
}

/**
 * Clickable dots for bklit line charts. bklit ships no data-point click, so
 * this layer renders the dots themselves plus transparent hit areas as a
 * post-overlay child: the framework keeps post-overlay children above the
 * interaction overlay, and pointer events still bubble to the overlay for the
 * crosshair tooltip. Keyboard selection stays on each chart's sr-only button
 * list, so this layer is mouse-only by design.
 */
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
          <g key={item.ariaLabel}>
            <circle
              cx={cx}
              cy={cy}
              r={item.radius ?? 4}
              fill={item.color}
              opacity={item.opacity ?? 1}
            />
            <circle
              cx={cx}
              cy={cy}
              r={12}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
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

const ChartHitPoints = Object.assign(ChartHitPointsInner, {
  __isPostOverlay: true as const,
});

export { ChartHitPoints };