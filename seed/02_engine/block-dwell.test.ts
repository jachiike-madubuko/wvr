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
} from "./block-dwell.ts";

test("sanitizeBlockMs drops unknown shapes and caps totals", () => {
  expect(
    sanitizeBlockMs({
      hook: 1200,
      skip: -3,
      also: "40",
      nested: { a: 1 },
      "": 9,
    }),
  ).toEqual({ hook: 1200, also: 40 });
  expect(sanitizeBlockMs({ long: BLOCK_MS_TOTAL_CAP + 50 }).long).toBe(
    BLOCK_MS_TOTAL_CAP,
  );
});

test("sanitizeCompletedBlockIds trims and caps length", () => {
  expect(sanitizeCompletedBlockIds([" h ", 2, "", false])).toEqual(["h", "2"]);
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

test("type defaults and 2x alert", () => {
  expect(recommendedBlockMs({ type: "read" })).toBe(4 * 60_000);
  expect(recommendedBlockMs({ type: "questions" })).toBe(8 * 60_000);
  expect(recommendedBlockMs({ type: "listen", durationSec: 40 })).toBe(40_000);
  expect(isDoubleTime(8 * 60_000, 4 * 60_000)).toBe(true);
  expect(isDoubleTime(7 * 60_000, 4 * 60_000)).toBe(false);
  expect(isDoubleTime(0, 4 * 60_000)).toBe(false);
  expect(medianPositive([4, 10, 2])).toBe(4);
});
