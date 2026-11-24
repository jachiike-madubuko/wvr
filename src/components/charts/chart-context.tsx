"use client";

import type { ScaleLinear, ScaleTime } from "d3-scale";
import { createContext, useContext } from "react";

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartContextValue {
  data: Record<string, unknown>[];
  xDataKey: string;
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: ChartMargin;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}

export const ChartContext = createContext<ChartContextValue | null>(null);

export function useChart(): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("useChart must be used inside <LineChart>");
  }
  return ctx;
}
