import { expect, test } from "vitest";
import {
  BLOCK_MS_TOTAL_CAP,
  BLOCK_MS_WRITE_CAP,
  addBlockMsDelta,
  isDoubleTime,
  maxMergeBlockMs,
  medianPositive,
  recommendedBlockMs,
  sanitizeBlockMs,
  sanitizeCompletedBlockIds,
} from "@/domain/pace/block-dwell";

test("sanitizeBlockMs drops unknown shapes and caps totals", () => {
  expect(sanitizeBlockMs(null)).toEqual({});
  expect(sanitizeBlockMs(["a"])).toEqual({});
  expect(
    sanitizeBlockMs({
      hook: 1200,
      skip: -3,
      badNum: NaN,
      also: "40",
      nested: { a: 1 },
      "": 9,
    }),
  ).toEqual({ hook: 1200, also: 40 });
  expect(sanitizeBlockMs({ long: BLOCK_MS_TOTAL_CAP + 50 }).long).toBe(
    BLOCK_MS_TOTAL_CAP,
  );
});

test("sanitizeCompletedBlockIds trims and caps length at 200", () => {
  expect(sanitizeCompletedBlockIds("not-array")).toEqual([]);
  expect(sanitizeCompletedBlockIds([" h ", 2, "", false])).toEqual(["h", "2"]);
  const many = Array.from({ length: 220 }, (_, i) => `b_${i}`);
  expect(sanitizeCompletedBlockIds(many)).toHaveLength(200);
});

test("maxMergeBlockMs keeps the higher total per block", () => {
  expect(maxMergeBlockMs({ hook: 10, other: 3 }, { hook: 8, extra: 1 })).toEqual({
    hook: 10,
    other: 3,
    extra: 1,
  });
});

test("addBlockMsDelta is cumulative with a per-write cap", () => {
  expect(addBlockMsDelta({ hook: 1000 }, { hook: 500 })).toEqual({ hook: 1500 });
  expect(addBlockMsDelta({}, { hook: BLOCK_MS_WRITE_CAP + 99 }).hook).toBe(
    BLOCK_MS_WRITE_CAP,
  );
  expect(
    addBlockMsDelta({ hook: BLOCK_MS_TOTAL_CAP - 10 }, { hook: 400 }).hook,
  ).toBe(BLOCK_MS_TOTAL_CAP);
});

test("type defaults, 2x alert, and medianPositive edge cases", () => {
  expect(recommendedBlockMs({ type: "read" })).toBe(4 * 60_000);
  expect(recommendedBlockMs({ type: "questions" })).toBe(8 * 60_000);
  expect(recommendedBlockMs({ type: "listen", durationSec: 40 })).toBe(40_000);
  expect(recommendedBlockMs({ type: "watch" })).toBe(180_000);
  expect(recommendedBlockMs({ type: "break", breakSec: 90 })).toBe(90_000);
  expect(recommendedBlockMs({ type: "break" })).toBe(120_000);
  expect(recommendedBlockMs({ type: "custom_unknown" })).toBe(4 * 60_000);

  expect(isDoubleTime(8 * 60_000, 4 * 60_000)).toBe(true);
  expect(isDoubleTime(7 * 60_000, 4 * 60_000)).toBe(false);
  expect(isDoubleTime(0, 4 * 60_000)).toBe(false);

  expect(medianPositive([0, -2])).toBeNull();
  expect(medianPositive([4, 10, 2])).toBe(4);
  expect(medianPositive([2, 4, 10, 12])).toBe(7);
});
