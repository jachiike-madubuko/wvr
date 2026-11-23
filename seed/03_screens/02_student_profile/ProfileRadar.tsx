"use client";

import { useId, useMemo, useState } from "react";
import { RadarChart } from "@/components/charts/radar-chart";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarAxis } from "@/components/charts/radar-axis";
import { RadarLabels } from "@/components/charts/radar-labels";
import { RadarArea } from "@/components/charts/radar-area";
import { ChartTooltip } from "./ChartTooltip";
import type { RadarZone } from "./profile-fixture";

export function ProfileRadar({
  zones,
  focusCaption,
}: {
  zones: RadarZone[] | null;
  focusCaption: string | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const tipId = useId();
  const activeLabel = hovered ?? focused;
  const active = zones?.find((zone) => zone.label === activeLabel) ?? null;
  const metrics = useMemo(
    () => (zones ?? []).map((zone) => ({ key: zone.label, label: zone.label })),
    [zones],
  );
  const data = useMemo(
    () => [
      {
        label: "Estimate",
        color: "var(--signal-blue)",
        values: Object.fromEntries((zones ?? []).map((zone) => [zone.label, zone.score])),
      },
    ],
    [zones],
  );

  return (
    <div>
      <h2 className="wv-panel-title">Weaver Wheel</h2>
      {zones && zones.length > 0 ? (
        <div className="relative">
          <ul className="wv-sr">
            {zones.map((zone) => (
              <li key={zone.label}>
                <button
                  type="button"
                  aria-label={`${zone.label} (${zone.score})`}
                  aria-describedby={activeLabel === zone.label ? tipId : undefined}
                  className="outline-none focus-visible:outline focus-visible:outline-2"
                  onMouseEnter={() => setHovered(zone.label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setFocused(zone.label)}
                  onBlur={() => setFocused(null)}
                >
                  {zone.label}
                </button>
              </li>
            ))}
          </ul>
          <RadarChart
            data={data}
            metrics={metrics}
            size={300}
            margin={56}
            className="mx-auto"
          >
            <RadarGrid />
            <RadarAxis />
            <RadarLabels />
            <RadarArea index={0} />
          </RadarChart>
          {active ? (
            <ChartTooltip
              id={tipId}
              x={150}
              y={40}
              width={300}
              height={300}
              title={active.label}
              body={`Estimate ${active.score} of 100.`}
            />
          ) : null}
        </div>
      ) : (
        <p className="wv-note">No estimate yet.</p>
      )}
      {focusCaption ? <p className="wv-note">{focusCaption}</p> : null}
    </div>
  );
}
