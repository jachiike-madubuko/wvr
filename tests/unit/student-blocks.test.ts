import { expect, test } from "vitest";
import { B, byId, FACE } from "@/lib/blocks/library";
import { hashStudentToken } from "@/lib/security/path-tokens";
import {
  buildMosaicDeck,
  buildSessionPayload,
  isBlockUnlocked,
} from "@/lib/student-path/deck";

test("block library defines 4 roles and 21 sub-types across 6 types", () => {
  expect(Object.keys(FACE)).toEqual(["start", "try", "check", "next"]);
  expect(B).toHaveLength(21);
  expect(new Set(B.map((b) => b.type))).toEqual(
    new Set(["text", "image", "video", "audio", "pbl", "game"]),
  );
  expect(byId("video.story").role).toBe("start");
  expect(() => byId("does.not.exist")).toThrow();
});

test("buildMosaicDeck shapes payload blocks with hero span-2 hook first and sequential lock gating", () => {
  const deck = buildMosaicDeck({
    title: "Equal Parts & Halves",
    packId: "pack_space",
    blocks: [
      { id: "hook", title: "Launch Fuel Cells", role: "Start" },
      { id: "try_1", title: "Split the Moon", role: "Try" },
      { id: "check_1", title: "Half Orbit Check", role: "Check" },
    ],
  });

  expect(deck).toHaveLength(3);
  expect(deck[0]?.span).toBe(2);
  expect(deck[0]?.role).toBe("start");
  expect(deck[1]?.role).toBe("try");
  expect(deck[2]?.role).toBe("check");

  // Strict sequential padlock gating
  expect(isBlockUnlocked(0, [], deck)).toBe(true);
  expect(isBlockUnlocked(1, [], deck)).toBe(false);
  expect(isBlockUnlocked(2, ["hook"], deck)).toBe(false);
  expect(isBlockUnlocked(1, ["hook"], deck)).toBe(true);
  expect(isBlockUnlocked(2, ["hook", "try_1"], deck)).toBe(true);
});

test("buildSessionPayload sanitizes completedBlockIds and blockMs and matches seeded demo token hash", () => {
  expect(hashStudentToken("demo-space-lesson")).toBe(
    "a8c358ef1c79e171137cd5f0ca358426bfc270b6e860a13957c2824cce4f33e2",
  );

  const payload = buildSessionPayload({
    completedBlockIds: ["hook", "  try_1  ", ""],
    blockMs: { hook: 12000, bad: -50 },
    blockEvents: [
      {
        blockId: "check_1",
        subject: "math",
        attempts: 2,
        durationSec: 45,
        errorLog: [],
      },
    ],
  });

  expect(payload.completedBlockIds).toEqual(["hook", "try_1"]);
  expect(payload.blockMs).toEqual({ hook: 12000 });
  expect(payload.blockEvents).toHaveLength(1);
});
