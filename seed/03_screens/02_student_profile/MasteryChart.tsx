"use client";

import { useId, useMemo, useState } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Line } from "@/components/charts/line";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip as BklitTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { ChartHitPoints } from "./ChartHitPoints";
import { ChartTooltip } from "./ChartTooltip";
import {
  masteryView,
  type MasteryFilter,
  type MasteryNode,
  type MasteryZoom,
} from "./profile-fixture";

const BLUE = "var(--signal-blue)";
const MINT = "var(--signal-mint)";
const CORAL = "var(--signal-coral)";

const ZOOMS: { id: MasteryZoom; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const RANGE_NOTE: Record<MasteryZoom, string> = {
  day: "This lesson, block by block.",
  week: "One point per day. Open a day to see that lesson.",
  month: "One point per week. Open a week to see that lesson.",
};

const FILTERS: { id: MasteryFilter; label: string }[] = [
  { id: "strengths", label: "Strengths" },
  { id: "struggles", label: "Struggles" },
  { id: "both", label: "Both" },
];

export function MasteryChart({
  nodes,
  zoom,
  filter,
  selectedId,
  drilledLabel,
  onZoom,
  onZoomOut,
  onFilter,
  onSelectNode,
}: {
  nodes: MasteryNode[] | null;
  zoom: MasteryZoom;
  filter: MasteryFilter;
  selectedId: string | null;
  /** Set while a day or week is open as its lesson blocks. */
  drilledLabel?: string | null;
  onZoom: (zoom: MasteryZoom) => void;
  onZoomOut?: () => void;
  onFilter: (filter: MasteryFilter) => void;
  onSelectNode: (node: MasteryNode) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const tipId = useId();
  const visible = nodes ? masteryView(nodes, filter) : [];
  const width = 640;
  const height = 220;
  const pad = 28;
  const coords = visible.map((node, index) => {
    const x =
      visible.length === 1
        ? width / 2
        : pad + (index * (width - pad * 2)) / (visible.length - 1);
    const y = pad + (1 - node.value) * (height - pad * 2);
    return { node, x, y };
  });
  const activeId = hovered ?? focused;
  const active = coords.find((c) => c.node.id === activeId);
  const yMax = Math.max(1, ...visible.map((node) => node.value));
  const rows = useMemo(
    () =>
      visible.map((node, index) => ({
        date: new Date(2026, 9, 26 + index),
        label: node.label,
        value: node.value,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, filter],
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wv-kicker">Performance</p>
          <h2 className="wv-panel-title">Mastery estimate over time</h2>
          <p className="wv-note">
            {drilledLabel ? `${drilledLabel}. Block by block.` : RANGE_NOTE[zoom]} An estimate, not a grade.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1" role="group" aria-label="Time zoom">
            {drilledLabel && onZoomOut ? (
              <button type="button" className="wv-btn wv-btn--outline wv-btn--sm" onClick={onZoomOut}>
                Zoom out
              </button>
            ) : null}
            {ZOOMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={zoom === item.id ? "wv-btn wv-btn--primary wv-btn--sm" : "wv-btn wv-btn--outline wv-btn--sm"}
                aria-pressed={zoom === item.id}
                onClick={() => onZoom(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Mastery filter">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? "wv-btn wv-btn--primary wv-btn--sm" : "wv-btn wv-btn--outline wv-btn--sm"}
                aria-pressed={filter === item.id}
                onClick={() => onFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!nodes ? (
        <p className="wv-note mt-4">No estimate yet.</p>
      ) : (
        <div className="wv-mastery-plot relative mt-4">
          <ul className="wv-sr">
            {coords.map(({ node }) => {
              const active = focused === node.id || selectedId === node.id;
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    aria-label={node.label}
                    aria-pressed={selectedId === node.id}
                    aria-describedby={activeId === node.id ? tipId : undefined}
                    data-active={active ? "true" : "false"}
                    className="outline-none focus-visible:outline focus-visible:outline-2"
                    style={{ opacity: node.dimmed ? 0.25 : 1 }}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectNode(node);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onSelectNode(node);
                    }}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setFocused(node.id)}
                    onBlur={() => setFocused(null)}
                  >
                    {node.label}
                  </button>
                </li>
              );
            })}
          </ul>
          <LineChart
            data={rows}
            xDataKey="date"
            aspectRatio=""
            style={{ height: height }}
            yScaleDomainMax={yMax}
          >
            <Grid horizontal stroke="var(--line)" />
            <Line dataKey="value" stroke={BLUE} strokeWidth={2} fadeEdges={false} />
            <XAxis tickMode="data" labels={rows.map((row) => row.label)} numTicks={rows.length} />
            <BklitTooltip
              showDatePill={false}
              content={({ point }) => {
                const picked = visible.find((node) => node.label === (point as { label: string }).label);
                if (!picked) return null;
                return (
                  <TooltipContent
                    title={picked.label}
                    rows={[{ color: picked.kind === "struggle" ? CORAL : MINT, label: "Time", value: `${Math.round(picked.value)} s` }]}
                  >
                    <p className="text-chart-tooltip-muted text-sm">
                      {picked.detail?.misconception ?? "Strength."}
                    </p>
                  </TooltipContent>
                );
              }}
            />
            <ChartHitPoints
              items={coords.map(({ node }, index) => ({
                date: rows[index].date,
                y: node.value,
                color: node.kind === "struggle" ? CORAL : MINT,
                radius: node.dimmed ? 3 : 6,
                opacity: node.dimmed ? 0.25 : 1,
                ariaLabel: node.label,
                payload: node,
              }))}
              onSelect={onSelectNode}
            />
          </LineChart>
          {active ? (
            <ChartTooltip
              id={tipId}
              x={active.x}
              y={active.y}
              width={width}
              height={height}
              title={active.node.label}
              body={active.node.detail?.misconception ?? "Strength."}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
