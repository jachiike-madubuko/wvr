import { expect, test } from "vitest";
import {
  generateStraightEdge,
  generateWavePoints,
  normalizeSegments,
} from "@/components/charts/wave-utils";

test("normalizeSegments scales values to sum to 100 and splits evenly on zero", () => {
  const scaled = normalizeSegments([
    { id: "ahead", value: 1, color: "#48e29a" },
    { id: "on", value: 3, color: "#58b6fa" },
  ]);
  expect(scaled.map((s) => s.percent)).toEqual([25, 75]);

  const zero = normalizeSegments([
    { id: "a", value: 0, color: "#111" },
    { id: "b", value: 0, color: "#222" },
  ]);
  expect(zero.map((s) => s.percent)).toEqual([50, 50]);
});

test("generateWavePoints stays bounded within baseline +/- amplitude and shifts with phase", () => {
  const p0 = generateWavePoints(100, 40, 6, 2, 0, 20);
  const p1 = generateWavePoints(100, 40, 6, 2, Math.PI / 2, 20);

  expect(p0).toHaveLength(21);
  for (const pt of p0) {
    expect(pt.y).toBeGreaterThanOrEqual(34 - 1e-9);
    expect(pt.y).toBeLessThanOrEqual(46 + 1e-9);
  }
  expect(p0[0]?.y).not.toBeCloseTo(p1[0]?.y ?? 0, 3);
});

test("generateStraightEdge returns left and right endpoints at baseline", () => {
  expect(generateStraightEdge(120, 50)).toEqual([
    { x: 0, y: 50 },
    { x: 120, y: 50 },
  ]);
});
