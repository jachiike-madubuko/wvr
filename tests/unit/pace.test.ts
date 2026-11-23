import { expect, test } from "vitest";
import {
  type PaceCalendarBlock,
  dayPace,
  pacePercents,
  sessionBand,
} from "@/domain/pace/pace";

const block: PaceCalendarBlock = {
  id: "blk_1",
  startDate: "2026-09-10",
  endDate: "2026-09-10",
  kind: "lesson",
  status: "generated",
  assignment: { stu_a: "pack_space", stu_b: "pack_space" },
};

const pins = [
  { id: "p1", title: "Start", type: "read", durationSec: 180 },
  { id: "p2", title: "Check", type: "questions", durationSec: 180 },
  { id: "reward", title: "Sticker", type: "reward" },
  { id: "break", title: "Stretch", type: "break", breakSec: 60 },
];

test("no session is behind", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Maya",
      calendarBlockId: "blk_1",
      blockMs: {},
      pins,
    }).band,
  ).toBe("behind");
});

test("all instructional pins with time and no double-time is ahead (ignores reward/break)", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Maya",
      calendarBlockId: "blk_1",
      blockMs: { p1: 60_000, p2: 80_000 },
      pins,
    }).band,
  ).toBe("ahead");
});

test("partial instructional pins started is on pace", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Maya",
      calendarBlockId: "blk_1",
      blockMs: { p1: 60_000 },
      pins,
    }),
  ).toEqual({ band: "on", pinTitle: null });
});

test("double-time on a pin flags behind with pinTitle", () => {
  expect(
    sessionBand({
      studentId: "stu_a",
      firstName: "Maya",
      calendarBlockId: "blk_1",
      blockMs: { p1: 8 * 60_000, p2: 60_000 },
      pins,
    }),
  ).toEqual({ band: "behind", pinTitle: "Start" });
});

test("empty week hides bands when nobody opened a path", () => {
  const day = dayPace({
    date: "2026-09-10",
    blocks: [block],
    students: [
      { id: "stu_a", firstName: "Maya" },
      { id: "stu_b", firstName: "Leo" },
    ],
    sessions: [],
  });
  expect(day.empty).toBe(true);
  expect(day.ahead).toEqual([]);
  expect(day.behind).toEqual([]);
  expect(pacePercents(day)).toEqual({ ahead: 0, on: 0, behind: 0 });
});

test("approved Neon block with empty assignment defaults to all students and computes percentages", () => {
  const approvedBlock: PaceCalendarBlock = {
    ...block,
    status: "approved",
    assignment: {},
  };
  const day = dayPace({
    date: "2026-09-10",
    blocks: [approvedBlock],
    students: [
      { id: "stu_a", firstName: "Maya" },
      { id: "stu_b", firstName: "Leo" },
    ],
    sessions: [
      {
        studentId: "stu_a",
        firstName: "Maya",
        calendarBlockId: "blk_1",
        blockMs: { p1: 60_000, p2: 80_000 },
        pins,
      },
    ],
  });
  expect(day.empty).toBe(false);
  expect(day.ahead.map((s) => s.studentId)).toEqual(["stu_a"]);
  expect(day.behind.map((s) => s.studentId)).toEqual(["stu_b"]);
  expect(pacePercents(day)).toEqual({ ahead: 50, on: 0, behind: 50 });
});
