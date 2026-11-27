import { describe, expect, test } from "vitest";
import {
  EMPTY_SCORES,
  WHEEL_DIMENSIONS,
  ariaValueText,
  formatRelativeTime,
  lowestCaption,
  parseWheelScores,
  plotRadius,
  validateWheelSaveRequest,
  valuesLine,
} from "@/lib/students/wheel";

describe("WHEEL_DIMENSIONS", () => {
  test("matches fixed canonical order and spelling", () => {
    expect(WHEEL_DIMENSIONS).toEqual([
      "Emotional Reg",
      "Focus",
      "Engagement",
      "Task Completion",
      "Social",
    ]);
  });
});

describe("parseWheelScores", () => {
  test("accepts all-null and partial valid integers 1..5", () => {
    expect(parseWheelScores(EMPTY_SCORES)).toEqual(EMPTY_SCORES);
    expect(parseWheelScores({ Focus: 4, Social: null })).toEqual({
      ...EMPTY_SCORES,
      Focus: 4,
    });
  });

  test("rejects 0, 6, floats, strings, unknown keys, arrays, and primitives", () => {
    expect(parseWheelScores({ Focus: 0 })).toBeNull();
    expect(parseWheelScores({ Focus: 6 })).toBeNull();
    expect(parseWheelScores({ Focus: 2.5 })).toBeNull();
    expect(parseWheelScores({ Focus: "3" })).toBeNull();
    expect(parseWheelScores({ Unknown: 3 })).toBeNull();
    expect(parseWheelScores([1, 2, 3, 4, 5])).toBeNull();
    expect(parseWheelScores(null)).toBeNull();
  });
});

describe("validateWheelSaveRequest", () => {
  test("blocks empty wheel save with EMPTY_WHEEL", () => {
    expect(
      validateWheelSaveRequest({ scores: EMPTY_SCORES, expectedVersion: null }),
    ).toEqual({ ok: false, status: 400, error: "EMPTY_WHEEL" });
  });

  test("rejects out-of-range scores with INVALID_SCORES", () => {
    expect(
      validateWheelSaveRequest({ scores: { Focus: 7 }, expectedVersion: 1 }),
    ).toEqual({ ok: false, status: 400, error: "INVALID_SCORES" });
  });

  test("rejects unknown top-level keys and bad expectedVersion", () => {
    expect(
      validateWheelSaveRequest({
        scores: { Focus: 3 },
        expectedVersion: 1,
        extra: true,
      }),
    ).toEqual({ ok: false, status: 400, error: "INVALID_BODY" });
    expect(
      validateWheelSaveRequest({ scores: { Focus: 3 }, expectedVersion: 0 }),
    ).toEqual({ ok: false, status: 400, error: "INVALID_BODY" });
  });

  test("accepts partial save", () => {
    expect(
      validateWheelSaveRequest({
        scores: { Focus: 4, Social: 2 },
        expectedVersion: null,
      }),
    ).toEqual({
      ok: true,
      data: {
        scores: { ...EMPTY_SCORES, Focus: 4, Social: 2 },
        expectedVersion: null,
      },
    });
  });
});

describe("formatting & plot math", () => {
  test("ariaValueText formats Not set and score + anchor", () => {
    expect(ariaValueText(null)).toBe("Not set");
    expect(ariaValueText(4)).toBe("4, Usually");
  });

  test("valuesLine lists all 5 full names in order", () => {
    expect(valuesLine({ ...EMPTY_SCORES, "Emotional Reg": 4 })).toBe(
      "Emotional Reg 4 · Focus Not set · Engagement Not set · Task Completion Not set · Social Not set",
    );
  });

  test("lowestCaption handles ties in fixed order, partial count, and empty", () => {
    expect(lowestCaption(EMPTY_SCORES)).toBeNull();
    expect(
      lowestCaption({
        "Emotional Reg": 4,
        Focus: 2,
        Engagement: null,
        "Task Completion": 2,
        Social: null,
      }),
    ).toBe("Lowest right now: Focus. (3 of 5 set)");
    expect(
      lowestCaption({
        "Emotional Reg": 3,
        Focus: 2,
        Engagement: 5,
        "Task Completion": 2,
        Social: 4,
      }),
    ).toBe("Lowest right now: Focus.");
  });

  test("plotRadius maps null -> 0 and 1 -> 20", () => {
    expect(plotRadius(null)).toBe(0);
    expect(plotRadius(1)).toBe(20);
    expect(plotRadius(5)).toBe(100);
  });

  test("formatRelativeTime formats just now, minutes, hours, days", () => {
    const now = Date.parse("2026-11-26T18:00:00.000Z");
    expect(formatRelativeTime("2026-11-26T17:59:30.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-11-26T17:55:00.000Z", now)).toBe("5m ago");
    expect(formatRelativeTime("2026-11-26T15:00:00.000Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-11-24T18:00:00.000Z", now)).toBe("2d ago");
  });
});
