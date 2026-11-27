"use client";

import { useMemo } from "react";
import { useChart } from "@/components/charts/chart-context";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { XAxis } from "@/components/charts/x-axis";
import { weaverConfig } from "@/domain/config/weaver-config";
import {
  buildMasteryNodes,
  type BlockEventRecord,
  type MasteryFilter,
  type MasteryNode,
  type MasteryZoom,
} from "@/lib/students/model";
import { ChartHitPoints } from "./ChartHitPoints";

const BLUE = "#58b6fa";
const MINT = "#48e29a";
const CORAL = "#f87171";

export function formatElapsed(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const mins = Math.floor(s / 60);
  return `${mins}:${String(s % 60).padStart(2, "0")}`;
}

function formatNodeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function AttemptsThresholdLine({ threshold }: { threshold: number }) {
  const { innerWidth, yScale } = useChart();
  const y = yScale(threshold);
  return (
    <g data-testid="attempts-threshold-line" aria-hidden="true">
      <line
        x1={0}
        x2={innerWidth}
        y1={y}
        y2={y}
        stroke="rgba(248, 113, 113, 0.5)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <text
        x={innerWidth}
        y={Math.max(10, y - 5)}
        textAnchor="end"
        fill="#fca5a5"
        fontSize={10}
        fontWeight={600}
      >
        {`${threshold} tries`}
      </text>
    </g>
  );
}

export function MasteryChart({
  events,
  zoom,
  filter,
  flaggedNodeId = null,
  onZoom,
  onFilter,
  onSelectNode,
}: {
  events: BlockEventRecord[];
  zoom: MasteryZoom;
  filter: MasteryFilter;
  flaggedNodeId?: string | null;
  onZoom: (zoom: MasteryZoom) => void;
  onFilter: (filter: MasteryFilter) => void;
  onSelectNode: (node: MasteryNode) => void;
}) {
  const nodes = useMemo(
    () => buildMasteryNodes(events, zoom, filter),
    [events, zoom, filter],
  );

  const rows = useMemo(() => {
    let elapsedSec = 0;
    return nodes.map((n, idx) => {
      if (zoom === "day") {
        if (idx > 0) {
          elapsedSec += Math.max(1, nodes[idx - 1]!.durationSec);
        }
        return {
          date: new Date(elapsedSec * 1000),
          axisLabel: formatElapsed(elapsedSec),
          value: n.attempts,
          node: n,
        };
      }
      const parsed = new Date(n.at);
      const date = Number.isNaN(parsed.getTime())
        ? new Date(2026, 10, 20 + idx)
        : parsed;
      return {
        date,
        axisLabel: n.label,
        value: n.attempts,
        node: n,
      };
    });
  }, [nodes, zoom]);

  const threshold = weaverConfig.alerts.highAttempts;
  const yMax = Math.max(threshold + 2, ...nodes.map((n) => n.attempts));

  return (
    <div data-testid="mastery-chart">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
            Performance
          </p>
          <h2 className="text-xl font-bold text-[#f6f1ea]">
            Mastery estimate over time
          </h2>
          <p className="text-xs text-[#8892b0]">
            {`Attempts per block over work time. Red nodes flag ≥${threshold} tries or >${weaverConfig.alerts.overTimeSec}s. Click a red node for an offline 3-step coaching plan.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full bg-white/5 p-1" role="group" aria-label="Time zoom">
            {(["day", "week", "month"] as const).map((z) => (
              <button
                key={z}
                type="button"
                data-testid={`zoom-${z}`}
                aria-pressed={zoom === z}
                onClick={() => onZoom(z)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  zoom === z ? "bg-white text-black" : "text-[#8892b0]"
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <div className="flex rounded-full bg-white/5 p-1" role="group" aria-label="Mastery filter">
            {(["strengths", "struggles", "both"] as const).map((f) => (
              <button
                key={f}
                type="button"
                data-testid={`filter-${f}`}
                aria-pressed={filter === f}
                onClick={() => onFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  filter === f ? "bg-white text-black" : "text-[#8892b0]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {nodes.length === 0 ? (
        <p className="text-xs text-[#8892b0]">No block telemetry recorded yet.</p>
      ) : (
        <div className="flex gap-2.5">
          <div
            aria-hidden="true"
            className="flex shrink-0 flex-col justify-between pb-7 pt-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#8892b0]"
          >
            <span>{yMax} tries</span>
            <span>1 try</span>
          </div>
          <div className="min-w-0 flex-1">
            <LineChart
              data={rows as unknown as Record<string, unknown>[]}
              xDataKey="date"
              style={{ height: 220 }}
              yScaleDomainMax={yMax}
            >
              <Grid horizontal />
              <AttemptsThresholdLine threshold={threshold} />
              <Line dataKey="value" stroke={BLUE} strokeWidth={2} />
              <XAxis labels={rows.map((r) => r.axisLabel)} />
              <ChartTooltip
                content={({ point }) => {
                  const n = (point as { node: MasteryNode }).node;
                  return (
                    <TooltipContent
                      title={n.label}
                      rows={[
                        {
                          color: n.kind === "struggle" ? CORAL : MINT,
                          label: "Attempts",
                          value: `${n.attempts} ${n.attempts === 1 ? "try" : "tries"}`,
                        },
                        {
                          color: BLUE,
                          label: "Duration",
                          value: formatElapsed(n.durationSec),
                        },
                        ...(zoom === "day"
                          ? [
                              {
                                color: "#8892b0",
                                label: "At",
                                value: formatNodeTime(n.at),
                              },
                            ]
                          : []),
                      ]}
                    >
                      {n.misconception ?? "On pace"}
                    </TooltipContent>
                  );
                }}
              />
              <ChartHitPoints
                items={rows.map((r, idx) => ({
                  id: r.node.id,
                  testId: `mastery-node-${r.node.id}`,
                  dataIndex: idx,
                  flagged: flaggedNodeId === r.node.id,
                  date: r.date,
                  y: r.node.attempts,
                  color: r.node.kind === "struggle" ? CORAL : MINT,
                  radius:
                    flaggedNodeId === r.node.id
                      ? 8
                      : r.node.dimmed
                        ? 3
                        : r.node.kind === "struggle"
                          ? 7
                          : 5,
                  opacity: r.node.dimmed && flaggedNodeId !== r.node.id ? 0.25 : 1,
                  ariaLabel: `${r.node.label}, ${r.node.attempts} tries, ${r.node.durationSec}s`,
                  kind: r.node.kind,
                  payload: r.node,
                }))}
                onSelect={onSelectNode}
              />
            </LineChart>
          </div>
        </div>
      )}
    </div>
  );
}
