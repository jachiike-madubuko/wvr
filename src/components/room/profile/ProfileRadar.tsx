"use client";

import { useMemo } from "react";
import { RadarArea } from "@/components/charts/radar-area";
import { RadarAxis } from "@/components/charts/radar-axis";
import { RadarChart } from "@/components/charts/radar-chart";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarLabels } from "@/components/charts/radar-labels";
import type { RadarZone } from "@/lib/students/model";

export function ProfileRadar({ zones }: { zones: RadarZone[] }) {
  const metrics = useMemo(
    () => zones.map((z) => ({ key: z.label, label: z.label })),
    [zones],
  );
  const data = useMemo(
    () => [
      {
        label: "Weaver Wheel",
        color: "#58b6fa",
        values: Object.fromEntries(zones.map((z) => [z.label, z.score])),
      },
    ],
    [zones],
  );

  return (
    <div data-testid="profile-radar">
      <h2 className="mb-2 text-base font-bold text-[#f6f1ea]">Weaver Wheel</h2>
      <RadarChart data={data} metrics={metrics} size={280} margin={52} className="mx-auto">
        <RadarGrid />
        <RadarAxis />
        <RadarLabels />
        <RadarArea index={0} />
      </RadarChart>
    </div>
  );
}
