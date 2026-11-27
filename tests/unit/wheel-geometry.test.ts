import { describe, expect, test } from "vitest";
import {
  hitTest,
  pointFor,
  snapScore,
  wedgeIndex,
} from "@/lib/students/wheel-geometry";

const R = 119; // ≈ radius at 360px (S=326, M=44)
const at = (deg: number, dist: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: dist * Math.cos(a), y: dist * Math.sin(a) };
};

describe("wedgeIndex", () => {
  test.each([
    [0, 0],
    [35.9, 0],
    [36.1, 1],
    [72, 1],
    [144, 2],
    [216, 3],
    [288, 4],
    [323.9, 4],
    [324.1, 0],
    [359, 0],
  ])("%s° → axis %s", (deg, idx) => {
    const p = at(deg, R / 2);
    expect(wedgeIndex(p.x, p.y)).toBe(idx);
  });
});

describe("snapScore", () => {
  test("dead zone ignored", () => {
    expect(snapScore(0, R)).toBeNull();
    expect(snapScore(0.099 * R, R)).toBeNull();
  });

  test.each([
    [0.1, 1],
    [0.29, 1],
    [0.31, 2],
    [0.4, 2],
    [0.6, 3],
    [0.8, 4],
    [1, 5],
    [1.3, 5],
  ])("frac %s → %s", (f, v) => {
    expect(snapScore(f * R, R)).toBe(v);
  });

  test("always 1..5 outside dead zone", () => {
    for (let d = 0.1 * R; d <= 2 * R; d += 0.5) {
      const v = snapScore(d, R)!;
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe("hitTest", () => {
  test("beyond radius + 16px → null", () => {
    const p = at(0, R + 16.5);
    expect(hitTest(p.x, p.y, R)).toBeNull();
  });

  test("crowded centre: each 1-point stays on its own axis (T-46)", () => {
    for (let i = 0; i < 5; i++) {
      const p = pointFor(i, 1, R);
      expect(hitTest(p.x, p.y, R)).toEqual({ index: i, score: 1 });
    }
  });

  test("round trip for every axis and score", () => {
    for (let i = 0; i < 5; i++) {
      for (const v of [1, 2, 3, 4, 5] as const) {
        const p = pointFor(i, v, R);
        expect(hitTest(p.x, p.y, R)).toEqual({ index: i, score: v });
      }
    }
  });
});
