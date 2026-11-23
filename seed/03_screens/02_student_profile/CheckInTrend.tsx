"use client";

import { useMemo } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Line } from "@/components/charts/line";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import type { TooltipRow } from "@/components/charts/tooltip/tooltip-content";
import { ChartHitPoints } from "./ChartHitPoints";
import { checkInChartModel, type CheckInRow } from "./check-in-series";
import type { CheckInPoint } from "./profile-fixture";

const MINT = "var(--signal-mint)";
const CORAL = "var(--signal-coral)";

export function CheckInTrend({
  points,
  selectedId,
  onSelect,
}: {
  points: CheckInPoint[] | null;
  selectedId: string | null;
  onSelect: (point: CheckInPoint) => void;
}) {
  const empty = !points || points.length === 0;
  const model = useMemo(() => checkInChartModel(points ?? []), [points]);

  if (empty) {
    return (
      <div>
        <h2 className="wv-panel-title">Check-ins</h2>
        <p className="wv-note mt-2">No estimate yet.</p>
      </div>
    );
  }

  function rowTooltip(point: Record<string, unknown>): React.ReactNode {
    const row = point as unknown as CheckInRow;
    const rows: TooltipRow[] = [
      { color: MINT, label: "am", value: row.amLabel ?? "—" },
      { color: CORAL, label: "pm", value: row.pmLabel ?? "—" },
    ];
    return (
      <TooltipContent title={`${row.day} · ${row.dateText}`} rows={rows}>
        <p className="text-chart-tooltip-muted text-sm">Click to talk it through.</p>
      </TooltipContent>
    );
  }

  return (
    <div>
      <h2 className="wv-panel-title">Check-ins</h2>
      <ul className="wv-sr">
        {model.points.map((point) => {
          const name = `${point.day} · ${point.date} · ${point.slot} · ${point.label}`;
          return (
            <li key={point.id}>
              <button
                type="button"
                aria-pressed={selectedId === point.id}
                onClick={() => onSelect(point)}
              >
                {name}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center gap-4" aria-hidden>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-faint">
          <span className="size-2 rounded-full" style={{ background: MINT }} />
          am
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-faint">
          <span className="size-2 rounded-full" style={{ background: CORAL }} />
          pm
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="flex flex-col justify-between text-[10px] uppercase tracking-wide text-ink-faint">
          <span>Calm</span>
          <span>Distressed</span>
        </div>
        <div
          className="w-2 self-stretch rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, var(--signal-mint), var(--highlight), var(--signal-coral))",
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <LineChart
            data={model.rows as unknown as Record<string, unknown>[]}
            xDataKey="date"
            aspectRatio=""
            style={{ height: 210 }}
            yScaleDomainMax={1}
          >
            <Grid horizontal stroke="var(--line)" />
            <Line dataKey="am" stroke={MINT} strokeWidth={2} fadeEdges={false} />
            <Line dataKey="pm" stroke={CORAL} strokeWidth={2} fadeEdges={false} />
            <XAxis tickMode="data" labels={model.categories} numTicks={model.categories.length} />
            <ChartTooltip showDatePill={false} content={({ point }) => rowTooltip(point)} />
            <ChartHitPoints
              items={model.hits.map((hit) => ({
                date: hit.date,
                y: hit.y,
                color: hit.slot === "am" ? MINT : CORAL,
                ariaLabel: `${hit.point.day} · ${hit.point.date} · ${hit.slot} · ${hit.point.label}`,
                payload: hit,
              }))}
              onSelect={(hit) => onSelect(hit.point)}
            />
          </LineChart>
        </div>
      </div>
    </div>
  );
}