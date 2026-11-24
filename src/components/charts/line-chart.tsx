"use client";

// ponytail: trimmed Bklit LineChart primitives (d3-scale + d3-shape + motion); expand from https://bklit.com/r/line-chart.json if needed
import { scaleLinear, scaleTime } from "d3-scale";
import {
  Children,
  isValidElement,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { ChartContext, type ChartMargin } from "./chart-context";
import { ParentSize } from "./chart-parent-size";

const DEFAULT_MARGIN: ChartMargin = { top: 16, right: 20, bottom: 28, left: 20 };

function toDate(value: unknown, fallbackIdx: number): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(2026, 9, 26 + fallbackIdx);
}

function splitChildren(children: ReactNode): {
  regular: ReactNode[];
  postOverlay: ReactNode[];
  tooltip: ReactNode[];
} {
  const regular: ReactNode[] = [];
  const postOverlay: ReactNode[] = [];
  const tooltip: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      regular.push(child);
      return;
    }
    const type = child.type as { __isPostOverlay?: boolean; __isTooltip?: boolean };
    if (type.__isTooltip) {
      tooltip.push(child);
    } else if (type.__isPostOverlay) {
      postOverlay.push(child);
    } else {
      regular.push(child);
    }
  });
  return { regular, postOverlay, tooltip };
}

export function LineChart({
  data,
  xDataKey = "date",
  yScaleDomainMax,
  aspectRatio,
  style,
  className,
  children,
}: {
  data: Record<string, unknown>[];
  xDataKey?: string;
  yScaleDomainMax?: number;
  aspectRatio?: string;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { regular, postOverlay, tooltip } = useMemo(
    () => splitChildren(children),
    [children],
  );

  return (
    <div
      className={cn("relative w-full select-none", className)}
      style={{ aspectRatio: aspectRatio || undefined, ...style }}
    >
      <ParentSize debounceTime={50}>
        {({ width, height }) => {
          const w = Math.max(width || 480, 120);
          const h = Math.max(height || 200, 100);
          const innerWidth = Math.max(w - DEFAULT_MARGIN.left - DEFAULT_MARGIN.right, 20);
          const innerHeight = Math.max(h - DEFAULT_MARGIN.top - DEFAULT_MARGIN.bottom, 20);

          const dates = data.map((row, idx) => toDate(row[xDataKey], idx));
          const minDate = dates[0] ?? new Date(2026, 9, 26);
          const maxDate =
            dates.length > 1
              ? dates[dates.length - 1]!
              : new Date(minDate.getTime() + 86_400_000);

          const xScale = scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);
          const maxY = yScaleDomainMax ?? 1;
          const yScale = scaleLinear().domain([0, maxY]).range([innerHeight, 0]);

          const handleMove = (clientX: number, rectLeft: number) => {
            if (dates.length === 0) return;
            const localX = clientX - rectLeft - DEFAULT_MARGIN.left;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < dates.length; i++) {
              const dist = Math.abs(xScale(dates[i]!) - localX);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
            setHoveredIndex(bestIdx);
          };

          return (
            <ChartContext.Provider
              value={{
                data,
                xDataKey,
                xScale,
                yScale,
                width: w,
                height: h,
                innerWidth,
                innerHeight,
                margin: DEFAULT_MARGIN,
                hoveredIndex,
                setHoveredIndex,
              }}
            >
              <div className="relative h-full w-full">
                <svg
                  width={w}
                  height={h}
                  viewBox={`0 0 ${w} ${h}`}
                  className="block h-full w-full overflow-visible"
                  onMouseMove={(e) =>
                    handleMove(e.clientX, e.currentTarget.getBoundingClientRect().left)
                  }
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <g transform={`translate(${DEFAULT_MARGIN.left},${DEFAULT_MARGIN.top})`}>
                    {regular}
                    {postOverlay}
                  </g>
                </svg>
                {tooltip}
              </div>
            </ChartContext.Provider>
          );
        }}
      </ParentSize>
    </div>
  );
}
