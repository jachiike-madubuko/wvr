"use client";

import { useMemo } from "react";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { XAxis } from "@/components/charts/x-axis";
import {
  buildCheckInSeries,
  type CheckInPoint,
  type CheckInRow,
  type SelCheckIn,
} from "@/lib/students/model";
import { ChartHitPoints } from "./ChartHitPoints";

const MINT = "#48e29a";
const CORAL = "#f87171";

export function CheckInTrend({
  checkins,
  selectedId,
  onSelect,
}: {
  checkins: SelCheckIn[];
  selectedId: string | null;
  onSelect: (point: CheckInPoint) => void;
}) {
  const series = useMemo(() => buildCheckInSeries(checkins), [checkins]);

  if (series.points.length === 0) {
    return (
      <div data-testid="checkin-trend">
        <h2 className="text-base font-bold text-[#f6f1ea]">Daily Check-ins</h2>
        <p className="mt-2 text-xs text-[#8892b0]">No check-ins recorded yet.</p>
      </div>
    );
  }

  return (
    <div data-testid="checkin-trend">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#f6f1ea]">Daily Check-ins</h2>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#8892b0]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#48e29a]" />
            AM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#f87171]" />
            PM
          </span>
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="flex flex-col justify-between text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">
          <span>Calm</span>
          <span>Distressed</span>
        </div>
        <div
          className="w-1.5 self-stretch rounded-full"
          style={{
            background: "linear-gradient(to bottom, #48e29a, #f5d442, #f87171)",
          }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <LineChart
            data={series.rows as unknown as Record<string, unknown>[]}
            xDataKey="date"
            style={{ height: 200 }}
            yScaleDomainMax={1}
          >
            <Grid horizontal />
            <Line dataKey="am" stroke={MINT} strokeWidth={2} />
            <Line dataKey="pm" stroke={CORAL} strokeWidth={2} />
            <XAxis labels={series.rows.map((r) => r.label)} />
            <ChartTooltip
              content={({ point }) => {
                const row = point as unknown as CheckInRow;
                return (
                  <TooltipContent
                    title={row.dateText}
                    rows={[
                      { color: MINT, label: "AM", value: row.amMood ?? "—" },
                      { color: CORAL, label: "PM", value: row.pmMood ?? "—" },
                    ]}
                  >
                    Click a point to open SEL Action Chat.
                  </TooltipContent>
                );
              }}
            />
            <ChartHitPoints
              items={series.points.map((pt) => {
                const rowIndex = series.rows.findIndex((r) => r.dateText === pt.date);
                const row = rowIndex >= 0 ? series.rows[rowIndex] : undefined;
                const isSelected = selectedId === pt.id;
                return {
                  id: `checkin-${pt.id}`,
                  testId: `checkin-point-${pt.id}`,
                  dataIndex: rowIndex >= 0 ? rowIndex : undefined,
                  flagged: isSelected,
                  date: row?.date ?? new Date(),
                  y: pt.y,
                  color: pt.period === "am" ? MINT : CORAL,
                  radius: isSelected ? 8 : pt.isDip ? 7 : 5,
                  ariaLabel: `${pt.date} ${pt.period.toUpperCase()} ${pt.mood}`,
                  kind: pt.isDip ? "dip" : "ok",
                  payload: pt,
                };
              })}
              onSelect={onSelect}
            />
          </LineChart>
        </div>
      </div>
    </div>
  );
}
