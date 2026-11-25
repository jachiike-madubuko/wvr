import { expect, test } from "vitest";
import { B, byId, FACE } from "@/lib/blocks/library";
import {
  spaceContinuationBlocks,
  spaceFlipBlocks,
  spacePins,
  wideHook,
} from "@/lib/lesson/space-pins";
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

test("spacePins and spaceFlipBlocks define the 5 demo blocks in sketch order", () => {
  const pins = spacePins();
  expect(pins.map((p) => p.title)).toEqual([
    "Space video",
    "ELA",
    "Art",
    "Math",
    "The Floating Riddle",
  ]);
  expect(pins[0]?.videoId).toBe("W_B2UZ_ZoxU");

  const flipBlocks = spaceFlipBlocks();
  expect(flipBlocks).toHaveLength(5);
  expect(flipBlocks[0]?.role).toBe("start");
  expect(wideHook(flipBlocks[0]!)).toBe(true);
  expect(flipBlocks.slice(1).some((b) => wideHook(b))).toBe(false);
  expect(flipBlocks[1]?.choices?.map((c) => c.text)).toEqual([
    "blue",
    "planet",
    "window",
  ]);
  expect(flipBlocks[3]?.kind).toBe("placeholder");
  expect(flipBlocks[3]?.cta).toBe("Later");
  expect(flipBlocks[4]?.kind).toBe("riddle");
  expect(flipBlocks[4]?.role).toBe("try");
});

test("buildMosaicDeck connects 5 demo blocks with continuous lesson list and sequential locks", () => {
  const cont = spaceContinuationBlocks();
  expect(cont).toHaveLength(6);

  const deck = buildMosaicDeck({
    title: "Equal Parts & Halves",
    packId: "pack_space",
  });

  expect(deck).toHaveLength(11);
  expect(deck[0]?.span).toBe(2);
  expect(deck.slice(1).every((b) => b.span === 1)).toBe(true);
  expect(deck[5]?.id).toBe("cont_make_ten");

  // Demo tiles (#1..#5) + first continuation tile (#6) start unlocked; #7+ unlock sequentially
  for (let i = 0; i <= 5; i++) {
    expect(isBlockUnlocked(i, [], deck)).toBe(true);
  }
  expect(isBlockUnlocked(6, [], deck)).toBe(false);
  expect(isBlockUnlocked(6, ["cont_make_ten"], deck)).toBe(true);
  expect(isBlockUnlocked(7, ["cont_make_ten"], deck)).toBe(false);
});

test("buildSessionPayload sanitizes completedBlockIds and blockMs and matches seeded demo token hash", () => {
  expect(hashStudentToken("demo-space-lesson")).toBe(
    "a8c358ef1c79e171137cd5f0ca358426bfc270b6e860a13957c2824cce4f33e2",
  );

  const payload = buildSessionPayload({
    completedBlockIds: ["hook", "  art  ", ""],
    blockMs: { hook: 12000, bad: -50 },
    blockEvents: [
      {
        blockId: "ela",
        subject: "ela",
        attempts: 2,
        durationSec: 45,
        errorLog: [],
      },
    ],
  });

  expect(payload.completedBlockIds).toEqual(["hook", "art"]);
  expect(payload.blockMs).toEqual({ hook: 12000 });
  expect(payload.blockEvents).toHaveLength(1);
});
