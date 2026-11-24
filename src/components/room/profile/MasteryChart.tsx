"use client";

import { useMemo } from "react";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { XAxis } from "@/components/charts/x-axis";
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

export function MasteryChart({
  events,
  zoom,
  filter,
  onZoom,
  onFilter,
  onSelectNode,
}: {
  events: BlockEventRecord[];
  zoom: MasteryZoom;
  filter: MasteryFilter;
  onZoom: (zoom: MasteryZoom) => void;
  onFilter: (filter: MasteryFilter) => void;
  onSelectNode: (node: MasteryNode) => void;
}) {
  const nodes = useMemo(
    () => buildMasteryNodes(events, zoom, filter),
    [events, zoom, filter],
  );

  const rows = useMemo(
    () =>
      nodes.map((n, idx) => ({
        date: new Date(2026, 10, 20 + idx),
        label: n.label,
        value: n.durationSec,
        node: n,
      })),
    [nodes],
  );

  const yMax = Math.max(240, ...nodes.map((n) => n.durationSec));

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
            Red nodes flag slow duration or ≥3 attempts. Click a red node for an offline 3-step coaching plan.
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
        <>
          <LineChart
            data={rows as unknown as Record<string, unknown>[]}
            xDataKey="date"
            style={{ height: 220 }}
            yScaleDomainMax={yMax}
          >
            <Grid horizontal />
            <Line dataKey="value" stroke={BLUE} strokeWidth={2} />
            <XAxis labels={rows.map((r) => r.label)} />
            <ChartTooltip
              content={({ point }) => {
                const n = (point as { node: MasteryNode }).node;
                return (
                  <TooltipContent
                    title={n.label}
                    rows={[
                      {
                        color: n.kind === "struggle" ? CORAL : MINT,
                        label: "Duration",
                        value: `${n.durationSec}s · ${n.attempts} tries`,
                      },
                    ]}
                  >
                    {n.misconception ?? "On pace"}
                  </TooltipContent>
                );
              }}
            />
            <ChartHitPoints
              items={rows.map((r) => ({
                id: r.node.id,
                date: r.date,
                y: r.node.durationSec,
                color: r.node.kind === "struggle" ? CORAL : MINT,
                radius: r.node.dimmed ? 3 : r.node.kind === "struggle" ? 7 : 5,
                opacity: r.node.dimmed ? 0.25 : 1,
                ariaLabel: r.node.label,
                kind: r.node.kind,
                payload: r.node,
              }))}
              onSelect={onSelectNode}
            />
          </LineChart>

          <div className="mt-3 flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                data-testid={`mastery-node-${n.id}`}
                data-kind={n.kind}
                onClick={() => onSelectNode(n)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  n.kind === "struggle"
                    ? "border-[#f87171]/40 bg-[#f87171]/15 text-[#f87171]"
                    : "border-[#48e29a]/30 bg-[#48e29a]/10 text-[#48e29a]"
                }`}
              >
                {n.label} · {n.durationSec}s
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
