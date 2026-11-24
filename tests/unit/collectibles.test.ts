import { describe, expect, it } from "vitest";
import {
  BROWS,
  EXTRAS,
  HAIR_STYLES,
  MOUTHS,
  nodeLook,
} from "@/lib/avatars/look";
import {
  COLLECTIBLE_BY_ID,
  COLLECTIBLE_CATALOG,
  RARITY_ORDER,
  type StudentCollectibleRecord,
  collectiblesForTheme,
  evaluateMilestonesForPack,
  loadoutFromCollectibles,
  nextLockedMilestoneItem,
  validateCollectibleAction,
} from "@/lib/collectibles/catalog";

const ROOM_PACKS = [
  "pack_space",
  "pack_animals",
  "pack_cooking",
  "pack_fashion",
  "pack_music",
  "pack_video_games",
] as const;

describe("nodeLook", () => {
  it("is deterministic for the same seed", () => {
    const a = nodeLook("student-maya-01");
    const b = nodeLook("student-maya-01");
    expect(a).toEqual(b);
  });

  it("produces valid trait values that vary independently across seeds", () => {
    const looks = [
      "maya",
      "leo",
      "ava",
      "noah",
      "zoe",
      "liam",
      "chloe",
      "mateo",
      "aria",
      "ethan",
      "nora",
      "sam",
    ].map((seed) => nodeLook(seed));

    for (const look of looks) {
      expect(HAIR_STYLES).toContain(look.hairStyle);
      expect(BROWS).toContain(look.brows);
      expect(MOUTHS).toContain(look.mouth);
      expect(EXTRAS).toContain(look.extra);
      expect(look.face).toMatch(/^#/);
      expect(look.shirt).toMatch(/^#/);
    }

    expect(new Set(looks.map((l) => l.hairStyle)).size).toBeGreaterThan(2);
    expect(new Set(looks.map((l) => l.face)).size).toBeGreaterThan(2);
    expect(new Set(looks.map((l) => l.shirt)).size).toBeGreaterThan(2);
  });
});

describe("COLLECTIBLE_CATALOG", () => {
  it("contains 36 unique items across 6 room themes and 6 rarities", () => {
    expect(COLLECTIBLE_CATALOG).toHaveLength(36);
    const ids = new Set(COLLECTIBLE_CATALOG.map((item) => item.id));
    expect(ids.size).toBe(36);
    expect(COLLECTIBLE_BY_ID.size).toBe(36);

    for (const packId of ROOM_PACKS) {
      const items = collectiblesForTheme(packId);
      expect(items).toHaveLength(6);
      expect(items.map((i) => i.rarity)).toEqual([...RARITY_ORDER]);

      const slotCounts = items.reduce<Record<string, number>>((acc, item) => {
        acc[item.slot] = (acc[item.slot] ?? 0) + 1;
        return acc;
      }, {});
      expect(slotCounts).toEqual({ hat: 2, eyewear: 2, pet: 2 });
    }
  });
});

describe("evaluateMilestonesForPack", () => {
  it("unlocks tiers progressively for block counts and adaptive credits", () => {
    expect(
      evaluateMilestonesForPack({
        packId: "pack_space",
        completedBlockCount: 0,
        totalBlocks: 3,
        adaptiveCredits: 0,
        unlockedItemIds: [],
      }),
    ).toEqual([]);

    const oneBlock = evaluateMilestonesForPack({
      packId: "pack_space",
      completedBlockCount: 1,
      totalBlocks: 3,
      adaptiveCredits: 40,
      unlockedItemIds: [],
    });
    expect(oneBlock.map((i) => i.id)).toEqual(["space_cadet_cap"]);

    const twoBlocks = evaluateMilestonesForPack({
      packId: "pack_space",
      completedBlockCount: 2,
      totalBlocks: 3,
      adaptiveCredits: 80,
      unlockedItemIds: ["space_cadet_cap"],
    });
    expect(twoBlocks.map((i) => i.id)).toEqual(["space_star_visor"]);

    const lessonClear = evaluateMilestonesForPack({
      packId: "pack_space",
      completedBlockCount: 3,
      totalBlocks: 3,
      adaptiveCredits: 120,
      unlockedItemIds: ["space_cadet_cap", "space_star_visor"],
    });
    expect(lessonClear.map((i) => i.id)).toEqual(["space_mini_moon"]);

    const allCredits = evaluateMilestonesForPack({
      packId: "pack_space",
      completedBlockCount: 3,
      totalBlocks: 3,
      adaptiveCredits: 360,
      unlockedItemIds: [
        "space_cadet_cap",
        "space_star_visor",
        "space_mini_moon",
      ],
    });
    expect(allCredits.map((i) => i.id)).toEqual([
      "space_astro_helmet",
      "space_nebula_goggles",
      "space_comet_ufo",
    ]);
  });

  it("is idempotent when all milestones are already unlocked", () => {
    const allIds = collectiblesForTheme("pack_animals").map((i) => i.id);
    const result = evaluateMilestonesForPack({
      packId: "pack_animals",
      completedBlockCount: 5,
      totalBlocks: 3,
      adaptiveCredits: 500,
      unlockedItemIds: allIds,
    });
    expect(result).toEqual([]);
  });
});

describe("nextLockedMilestoneItem", () => {
  it("ascends strictly Common -> Uncommon -> Rare -> Epic -> Mythic -> Legendary -> null", () => {
    const unlocked: string[] = [];
    const observedRarities: string[] = [];

    for (let step = 0; step < 6; step++) {
      const next = nextLockedMilestoneItem("pack_music", unlocked);
      expect(next).not.toBeNull();
      observedRarities.push(next!.rarity);
      unlocked.push(next!.id);
    }

    expect(observedRarities).toEqual([...RARITY_ORDER]);
    expect(nextLockedMilestoneItem("pack_music", unlocked)).toBeNull();
  });
});

describe("loadoutFromCollectibles", () => {
  it("preserves cross-theme equipped gear when student switches packs", () => {
    const records: StudentCollectibleRecord[] = [
      {
        itemId: "space_cadet_cap",
        slot: "hat",
        equipped: true,
        milestoneId: "m1_first_block",
        recallNote: "Earned in Space",
        unlockedAt: "2026-11-24T00:00:00Z",
      },
      {
        itemId: "animals_safari_specs",
        slot: "eyewear",
        equipped: true,
        milestoneId: "m2_practice_block",
        recallNote: "Earned in Animals",
        unlockedAt: "2026-11-24T00:05:00Z",
      },
      {
        itemId: "music_note_sprite",
        slot: "pet",
        equipped: false,
        milestoneId: "m3_lesson_clear",
        recallNote: "Unlocked in Music",
        unlockedAt: "2026-11-24T00:10:00Z",
      },
      {
        itemId: "games_pixel_ghost",
        slot: "pet",
        equipped: true,
        milestoneId: "m3_lesson_clear",
        recallNote: "Equipped in Video Games",
        unlockedAt: "2026-11-24T00:15:00Z",
      },
    ];

    expect(loadoutFromCollectibles(records)).toEqual({
      hat: "space_cadet_cap",
      eyewear: "animals_safari_specs",
      pet: "games_pixel_ghost",
    });
  });
});

describe("validateCollectibleAction", () => {
  const validUuid = "11111111-2222-4333-8444-555555555555";

  it("accepts valid unlock/equip/unequip payloads and trims recallNote", () => {
    const res = validateCollectibleAction({
      studentId: validUuid,
      action: "unlock",
      itemId: "space_cadet_cap",
      recallNote: "  Finished launch block!  ",
    });
    expect(res).toEqual({
      ok: true,
      data: {
        studentId: validUuid,
        action: "unlock",
        itemId: "space_cadet_cap",
        recallNote: "Finished launch block!",
      },
    });
  });

  it("rejects invalid UUIDs, unknown itemIds, bad actions, and oversized recallNotes", () => {
    expect(
      validateCollectibleAction({
        studentId: "not-a-uuid",
        action: "equip",
        itemId: "space_cadet_cap",
      }),
    ).toEqual({ ok: false, error: "Invalid studentId" });

    expect(
      validateCollectibleAction({
        studentId: validUuid,
        action: "equip",
        itemId: "does_not_exist",
      }),
    ).toEqual({ ok: false, error: "Unknown itemId" });

    expect(
      validateCollectibleAction({
        studentId: validUuid,
        action: "delete",
        itemId: "space_cadet_cap",
      }),
    ).toEqual({ ok: false, error: "Invalid action" });

    expect(
      validateCollectibleAction({
        studentId: validUuid,
        action: "unlock",
        itemId: "space_cadet_cap",
        recallNote: "a".repeat(281),
      }),
    ).toEqual({ ok: false, error: "recallNote exceeds 280 characters" });
  });
});
