import { expect, test } from "vitest";
import { dayPace, pacePercents } from "@/domain/pace/pace";
import {
  buildPaceSessions,
  classifyMoveError,
  validateMovePayload,
} from "@/lib/room/data";

test("buildPaceSessions synthesizes sessions from block_events and flags struggling as behind", () => {
  const sessions = buildPaceSessions({
    students: [
      { id: "stu-1", firstName: "Maya", packId: "pack_space", version: 1 },
      { id: "stu-2", firstName: "Leo", packId: "pack_cooking", version: 1 },
    ],
    blocks: [
      {
        id: "blk-1",
        startDate: "2026-11-23",
        endDate: "2026-11-23",
        kind: "lesson",
        status: "approved",
        title: "Equal Parts",
        subjects: ["math"],
        assignment: {},
      },
    ],
    tokens: [
      {
        calendarBlockId: "blk-1",
        blocks: [
          { id: "hook", title: "Launch", type: "read", durationSec: 180 },
          { id: "check_1", title: "Half Check", type: "questions", durationSec: 180 },
        ],
      },
    ],
    pathSessions: [],
    blockEvents: [
      { studentId: "stu-1", blockId: "hook", durationSec: 95, status: "completed" },
      { studentId: "stu-1", blockId: "check_1", durationSec: 240, status: "struggling" },
    ],
  });

  expect(sessions).toHaveLength(1);
  const pace = dayPace({
    date: "2026-11-23",
    blocks: [
      {
        id: "blk-1",
        startDate: "2026-11-23",
        endDate: "2026-11-23",
        kind: "lesson",
        status: "approved",
        assignment: {},
      },
    ],
    students: [
      { id: "stu-1", firstName: "Maya" },
      { id: "stu-2", firstName: "Leo" },
    ],
    sessions,
  });

  expect(pace.empty).toBe(false);
  expect(pace.behind.map((s) => s.studentId)).toContain("stu-1");
  expect(pacePercents(pace).behind).toBe(100);
});

test("validateMovePayload accepts valid move and rejects bad inputs", () => {
  expect(
    validateMovePayload({
      studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
      toPackId: "pack_space",
      expectedVersion: 1,
    }),
  ).toEqual({
    ok: true,
    data: {
      studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
      toPackId: "pack_space",
      expectedVersion: 1,
    },
  });

  expect(
    validateMovePayload({
      studentId: "not-a-uuid",
      toPackId: "pack_space",
      expectedVersion: 1,
    }).ok,
  ).toBe(false);

  expect(
    validateMovePayload({
      studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
      toPackId: "invalid_pack",
      expectedVersion: 1,
    }).ok,
  ).toBe(false);

  expect(
    validateMovePayload({
      studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
      toPackId: "pack_space",
      expectedVersion: -1,
    }).ok,
  ).toBe(false);
});

test("classifyMoveError maps SQLSTATE codes to HTTP status", () => {
  expect(classifyMoveError({ code: "40001" })).toEqual({
    status: 409,
    body: { error: "VERSION_CONFLICT" },
  });
  expect(classifyMoveError({ code: "42501" })).toEqual({
    status: 404,
    body: { error: "STUDENT_NOT_FOUND" },
  });
  expect(classifyMoveError({ code: "23503" })).toEqual({
    status: 400,
    body: { error: "UNKNOWN_PACK" },
  });
});
