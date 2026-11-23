import { expect, test } from "vitest";
import type { CalendarBlock } from "@/lib/classroom/store";
import { dayPace, sessionBand } from "./pace.ts";

const block: CalendarBlock = {
  id: "blk_1",
  classId: "c1",
  startDate: "2026-09-10",
  endDate: "2026-09-10",
  subjects: ["math"],
  theme: null,
  kind: "lesson",
  title: "Fractions",
  unitId: null,
  colorId: null,
  inferredStandardIds: [],
  selectedPackIds: ["pack_basketball"],
  suggestedPackIds: [],
  assignment: { stu_a: "pack_basketball", stu_b: "pack_basketball" },
  outlierIds: [],
  variationSetId: "v1",
  status: "generated",
};

const pins = [
  { id: "p1", title: "Start", type: "read", durationSec: 180 },
  { id: "p2", title: "Check", type: "questions", durationSec: 180 },
];

test("no session is behind", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Jordan",
      calendarBlockId: "blk_1",
      blockMs: {},
      pins,
    }).band,
  ).toBe("behind");
});

test("all pins with time and no double-time is ahead", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Jordan",
      calendarBlockId: "blk_1",
      blockMs: { p1: 60_000, p2: 80_000 },
      pins,
    }).band,
  ).toBe("ahead");
});

test("empty week hides bands when nobody opened a path", () => {
  const day = dayPace({
    date: "2026-09-10",
    blocks: [block],
    students: [
      { id: "stu_a", firstName: "Jordan" },
      { id: "stu_b", firstName: "Avery" },
    ],
    sessions: [],
  });
  expect(day.empty).toBe(true);
  expect(day.ahead).toEqual([]);
  expect(day.behind).toEqual([]);
});

test("a session fills the stack", () => {
  const day = dayPace({
    date: "2026-09-10",
    blocks: [block],
    students: [
      { id: "stu_a", firstName: "Jordan" },
      { id: "stu_b", firstName: "Avery" },
    ],
    sessions: [
      {
        studentId: "stu_a",
        firstName: "Jordan",
        calendarBlockId: "blk_1",
        blockMs: { p1: 60_000, p2: 80_000 },
        pins,
      },
    ],
  });
  expect(day.empty).toBe(false);
  expect(day.ahead.map((s) => s.studentId)).toEqual(["stu_a"]);
  expect(day.behind.map((s) => s.studentId)).toEqual(["stu_b"]);
});
