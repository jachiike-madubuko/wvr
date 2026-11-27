"use client";

import { useMemo } from "react";
import { RadarChart } from "@/components/charts/radar-chart";
import { useRadarStable } from "@/components/charts/radar-context";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarLabels } from "@/components/charts/radar-labels";
import {
  WHEEL_DIMENSIONS,
  WHEEL_SHORT_LABELS,
  countSet,
  plotRadius,
  type WheelScores,
} from "@/lib/students/wheel";

function WheelAxesAndSaved({
  savedScores,
  axisScores,
  faintSaved,
}: {
  savedScores: WheelScores | null;
  axisScores: WheelScores | null;
  faintSaved: boolean;
}) {
  const { radius, getAngle, getPointPosition } = useRadarStable();
  const hasSaved = savedScores !== null && countSet(savedScores) > 0;

  const polygonPoints = useMemo(() => {
    if (!hasSaved || !savedScores) return "";
    return WHEEL_DIMENSIONS.map((d, i) => {
      const p = getPointPosition(i, plotRadius(savedScores[d]));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");
  }, [hasSaved, savedScores, getPointPosition]);

  return (
    <g>
      {WHEEL_DIMENSIONS.map((d, i) => {
        const angle = getAngle(i);
        const tipX = radius * Math.cos(angle);
        const tipY = radius * Math.sin(angle);
        const isNotSet = axisScores === null || axisScores[d] === null;
        return (
          <line
            key={`axis-${d}`}
            x1={0}
            y1={0}
            x2={tipX}
            y2={tipY}
            stroke="var(--chart-grid, rgba(255,255,255,0.22))"
            strokeOpacity={isNotSet ? 0.55 : 0.7}
            strokeWidth={1}
            strokeDasharray={isNotSet ? "4 4" : undefined}
          />
        );
      })}

      {hasSaved && savedScores && (
        <g data-testid="wheel-saved-polygon">
          <polygon
            points={polygonPoints}
            fill="#58b6fa"
            fillOpacity={faintSaved ? 0.08 : 0.22}
            stroke="#58b6fa"
            strokeOpacity={faintSaved ? 0.35 : 1}
            strokeWidth={faintSaved ? 1.5 : 2}
            strokeLinejoin="round"
          />
          {!faintSaved &&
            WHEEL_DIMENSIONS.map((d, i) => {
              const v = savedScores[d];
              if (v === null) {
                const angle = getAngle(i);
                return (
                  <circle
                    key={`unset-tip-${d}`}
                    cx={radius * Math.cos(angle)}
                    cy={radius * Math.sin(angle)}
                    r={5}
                    fill="#111728"
                    stroke="#58b6fa"
                    strokeWidth={2}
                  />
                );
              }
              const p = getPointPosition(i, plotRadius(v));
              return (
                <circle
                  key={`pt-${d}`}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#58b6fa"
                  stroke="#111728"
                  strokeWidth={2}
                />
              );
            })}
        </g>
      )}
    </g>
  );
}

export function ProfileRadar({
  scores,
  axisScores,
  size = 280,
  margin = 44,
  faintSaved = false,
  compactLabels = false,
}: {
  scores: WheelScores | null;
  axisScores?: WheelScores | null;
  size?: number;
  margin?: number;
  faintSaved?: boolean;
  compactLabels?: boolean;
}) {
  const metrics = useMemo(
    () =>
      WHEEL_DIMENSIONS.map((d) => ({
        key: d,
        label: compactLabels ? WHEEL_SHORT_LABELS[d] : d,
      })),
    [compactLabels],
  );

  const effectiveAxisScores = axisScores === undefined ? scores : axisScores;

  return (
    <RadarChart
      data={[]}
      metrics={metrics}
      size={size}
      margin={margin}
      animate={false}
    >
      <RadarGrid />
      <WheelAxesAndSaved
        savedScores={scores}
        axisScores={effectiveAxisScores}
        faintSaved={faintSaved}
      />
      <RadarLabels offset={20} fontSize={11} />
    </RadarChart>
  );
}
