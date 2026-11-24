export type CollectibleSlot = "hat" | "eyewear" | "pet";

export type CollectibleRarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Mythic"
  | "Legendary";

export const RARITY_ORDER: readonly CollectibleRarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Mythic",
  "Legendary",
] as const;

export const RARITY_META: Record<
  CollectibleRarity,
  { rank: number; color: string; bg: string; border: string; glow?: string }
> = {
  Common: {
    rank: 1,
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.14)",
    border: "rgba(148, 163, 184, 0.35)",
  },
  Uncommon: {
    rank: 2,
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.14)",
    border: "rgba(52, 211, 153, 0.42)",
  },
  Rare: {
    rank: 3,
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.15)",
    border: "rgba(56, 189, 248, 0.48)",
    glow: "0 0 12px rgba(56, 189, 248, 0.25)",
  },
  Epic: {
    rank: 4,
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.16)",
    border: "rgba(167, 139, 250, 0.52)",
    glow: "0 0 14px rgba(167, 139, 250, 0.3)",
  },
  Mythic: {
    rank: 5,
    color: "#fb7185",
    bg: "rgba(251, 113, 133, 0.16)",
    border: "rgba(251, 113, 133, 0.56)",
    glow: "0 0 16px rgba(251, 113, 133, 0.35)",
  },
  Legendary: {
    rank: 6,
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.18)",
    border: "rgba(251, 191, 36, 0.72)",
    glow: "0 0 20px rgba(251, 191, 36, 0.45)",
  },
};

export type EquippedLoadout = Partial<Record<CollectibleSlot, string>>;

export type CollectibleItem = {
  id: string;
  name: string;
  slot: CollectibleSlot;
  interestTheme: string;
  themeLabel: string;
  rarity: CollectibleRarity;
  milestoneId: string;
  milestoneLabel: string;
  conceptLabel: string;
  defaultRecallNote: string;
  creditThreshold?: number;
};

export type StudentCollectibleRecord = {
  itemId: string;
  slot: CollectibleSlot;
  equipped: boolean;
  milestoneId: string;
  recallNote: string;
  unlockedAt: string;
};

type TierSpec = {
  rarity: CollectibleRarity;
  slot: CollectibleSlot;
  milestoneId: string;
  milestoneLabel: string;
  conceptLabel: string;
  creditThreshold?: number;
};

const TIERS: readonly TierSpec[] = [
  {
    rarity: "Common",
    slot: "hat",
    milestoneId: "m1_first_block",
    milestoneLabel: "Complete 1 lesson block",
    conceptLabel: "Launch & Hook",
  },
  {
    rarity: "Uncommon",
    slot: "eyewear",
    milestoneId: "m2_practice_block",
    milestoneLabel: "Complete 2 lesson blocks",
    conceptLabel: "Guided Practice",
  },
  {
    rarity: "Rare",
    slot: "pet",
    milestoneId: "m3_lesson_clear",
    milestoneLabel: "Complete all blocks in a lesson",
    conceptLabel: "Lesson Gateway Clear",
  },
  {
    rarity: "Epic",
    slot: "hat",
    milestoneId: "m4_credit_surge",
    milestoneLabel: "Reach 150 adaptive pace credits",
    conceptLabel: "Focused Effort Streak",
    creditThreshold: 150,
  },
  {
    rarity: "Mythic",
    slot: "eyewear",
    milestoneId: "m5_cross_skill",
    milestoneLabel: "Reach 250 adaptive mastery credits",
    conceptLabel: "Cross-Skill Mastery",
    creditThreshold: 250,
  },
  {
    rarity: "Legendary",
    slot: "pet",
    milestoneId: "m6_capstone",
    milestoneLabel: "Complete the Unit Capstone (360 credits)",
    conceptLabel: "Unit Capstone Legend",
    creditThreshold: 360,
  },
];

type ThemeSeed = {
  interestTheme: string;
  themeLabel: string;
  items: readonly [
    { id: string; name: string; defaultRecallNote: string },
    { id: string; name: string; defaultRecallNote: string },
    { id: string; name: string; defaultRecallNote: string },
    { id: string; name: string; defaultRecallNote: string },
    { id: string; name: string; defaultRecallNote: string },
    { id: string; name: string; defaultRecallNote: string },
  ];
};

const THEME_SEEDS: readonly ThemeSeed[] = [
  {
    interestTheme: "pack_space",
    themeLabel: "Space & Rockets",
    items: [
      {
        id: "space_cadet_cap",
        name: "Cadet Launch Cap",
        defaultRecallNote: "Kicked off the mission by completing your first Launch & Hook block.",
      },
      {
        id: "space_star_visor",
        name: "Starlight Visor",
        defaultRecallNote: "Locked in star-pattern focus across two guided practice blocks.",
      },
      {
        id: "space_mini_moon",
        name: "Orbiting Mini Moon",
        defaultRecallNote: "Cleared every block in the lesson to put a friendly moon in orbit.",
      },
      {
        id: "space_astro_helmet",
        name: "Deep-Space Helmet",
        defaultRecallNote: "Reached 150 adaptive pace credits on a steady effort streak.",
      },
      {
        id: "space_nebula_goggles",
        name: "Nebula Spectrum Goggles",
        defaultRecallNote: "Earned 250 adaptive mastery credits by connecting ideas across skills.",
      },
      {
        id: "space_comet_ufo",
        name: "Solar Comet Cruiser",
        defaultRecallNote: "Completed the 360-credit Unit Capstone as a Space & Rockets legend.",
      },
    ],
  },
  {
    interestTheme: "pack_animals",
    themeLabel: "Wild Animals",
    items: [
      {
        id: "animals_cat_ears",
        name: "Lynx Whisker Ears",
        defaultRecallNote: "Started tracking the trail by finishing your first Launch & Hook block.",
      },
      {
        id: "animals_safari_specs",
        name: "Safari Spotter Specs",
        defaultRecallNote: "Spotted key patterns across two guided practice blocks.",
      },
      {
        id: "animals_tiny_bee",
        name: "Bumblebee Scout",
        defaultRecallNote: "Finished every block in the lesson to recruit a buzzing field scout.",
      },
      {
        id: "animals_frog_hood",
        name: "Treefrog Canopy Hood",
        defaultRecallNote: "Leaped past 150 adaptive pace credits on a focused effort streak.",
      },
      {
        id: "animals_owl_lenses",
        name: "Night-Owl Lenses",
        defaultRecallNote: "Reached 250 adaptive mastery credits with sharp cross-skill insight.",
      },
      {
        id: "animals_mini_dragon",
        name: "Ember Hatchling",
        defaultRecallNote: "Completed the 360-credit Unit Capstone to awaken the Ember Hatchling.",
      },
    ],
  },
  {
    interestTheme: "pack_cooking",
    themeLabel: "Cooking & Kitchen",
    items: [
      {
        id: "cooking_chef_toque",
        name: "Apprentice Toque",
        defaultRecallNote: "Prepped the station by completing your first Launch & Hook block.",
      },
      {
        id: "cooking_steam_goggles",
        name: "Simmer Steam Goggles",
        defaultRecallNote: "Measured and mixed carefully across two guided practice blocks.",
      },
      {
        id: "cooking_cupcake_sprite",
        name: "Frosted Cupcake Sprite",
        defaultRecallNote: "Cleared the whole lesson recipe to bake a cheerful Cupcake Sprite.",
      },
      {
        id: "cooking_gold_toque",
        name: "Master Baker Toque",
        defaultRecallNote: "Hit 150 adaptive pace credits with a golden-brown effort streak.",
      },
      {
        id: "cooking_taste_monocle",
        name: "Critique Monocle",
        defaultRecallNote: "Reached 250 adaptive mastery credits by balancing every skill ingredient.",
      },
      {
        id: "cooking_phoenix_whisk",
        name: "Solar Phoenix Whisk",
        defaultRecallNote: "Completed the 360-credit Unit Capstone as a Kitchen Legend.",
      },
    ],
  },
  {
    interestTheme: "pack_fashion",
    themeLabel: "Fashion & Design",
    items: [
      {
        id: "fashion_beret",
        name: "Studio Sketch Beret",
        defaultRecallNote: "Sketched your first concept by completing a Launch & Hook block.",
      },
      {
        id: "fashion_heart_shades",
        name: "Rose Heart Shades",
        defaultRecallNote: "Styled two guided practice blocks with sharp attention to detail.",
      },
      {
        id: "fashion_ribbon_bow",
        name: "Silk Flutter Bow",
        defaultRecallNote: "Cleared every block in the lesson to tie together the full look.",
      },
      {
        id: "fashion_tiara",
        name: "Runway Star Tiara",
        defaultRecallNote: "Reached 150 adaptive pace credits on a standout effort streak.",
      },
      {
        id: "fashion_prism_frames",
        name: "Prism Atelier Frames",
        defaultRecallNote: "Earned 250 adaptive mastery credits by weaving skills across domains.",
      },
      {
        id: "fashion_crystal_star",
        name: "Astral Crystal Star",
        defaultRecallNote: "Completed the 360-credit Unit Capstone with signature Atelier flair.",
      },
    ],
  },
  {
    interestTheme: "pack_music",
    themeLabel: "Music & Beats",
    items: [
      {
        id: "music_beanie",
        name: "Acoustic Studio Beanie",
        defaultRecallNote: "Dropped the opening beat by completing your first Launch & Hook block.",
      },
      {
        id: "music_retro_shades",
        name: "Synthwave Shades",
        defaultRecallNote: "Kept steady rhythm through two guided practice blocks.",
      },
      {
        id: "music_note_sprite",
        name: "Harmonic Note Sprite",
        defaultRecallNote: "Cleared the full lesson track to summon a floating Eighth-Note Sprite.",
      },
      {
        id: "music_headphones",
        name: "Studio Monitor Cans",
        defaultRecallNote: "Hit 150 adaptive pace credits on an unbroken practice groove.",
      },
      {
        id: "music_eq_visor",
        name: "Equalizer Pulse Visor",
        defaultRecallNote: "Reached 250 adaptive mastery credits by harmonizing cross-skill ideas.",
      },
      {
        id: "music_vinyl_orb",
        name: "Gold-Pressed Vinyl Orb",
        defaultRecallNote: "Completed the 360-credit Unit Capstone for a platinum-grade finish.",
      },
    ],
  },
  {
    interestTheme: "pack_video_games",
    themeLabel: "Video Games",
    items: [
      {
        id: "games_pixel_cap",
        name: "8-Bit Player Cap",
        defaultRecallNote: "Pressed Start by completing your first Launch & Hook block.",
      },
      {
        id: "games_pixel_shades",
        name: "Arcade Pixel Shades",
        defaultRecallNote: "Cleared two guided practice stages without losing focus.",
      },
      {
        id: "games_pixel_ghost",
        name: "Friendly Pixel Ghost",
        defaultRecallNote: "Beat every block in the lesson to unlock an arcade sidekick.",
      },
      {
        id: "games_pixel_crown",
        name: "High-Score Pixel Crown",
        defaultRecallNote: "Reached 150 adaptive pace credits on a combo effort streak.",
      },
      {
        id: "games_vr_visor",
        name: "Holo-Grid VR Visor",
        defaultRecallNote: "Earned 250 adaptive mastery credits by mastering cross-skill levels.",
      },
      {
        id: "games_golden_controller",
        name: "Golden Relic Pad",
        defaultRecallNote: "Completed the 360-credit Unit Capstone to claim the Golden Relic.",
      },
    ],
  },
];

export const COLLECTIBLE_CATALOG: readonly CollectibleItem[] = THEME_SEEDS.flatMap(
  (theme) =>
    TIERS.map((tier, idx) => {
      const seed = theme.items[idx]!;
      return {
        id: seed.id,
        name: seed.name,
        slot: tier.slot,
        interestTheme: theme.interestTheme,
        themeLabel: theme.themeLabel,
        rarity: tier.rarity,
        milestoneId: tier.milestoneId,
        milestoneLabel: tier.milestoneLabel,
        conceptLabel: tier.conceptLabel,
        defaultRecallNote: seed.defaultRecallNote,
        ...(tier.creditThreshold !== undefined
          ? { creditThreshold: tier.creditThreshold }
          : {}),
      };
    }),
);

export const COLLECTIBLE_BY_ID: ReadonlyMap<string, CollectibleItem> = new Map(
  COLLECTIBLE_CATALOG.map((item) => [item.id, item]),
);

export function collectiblesForTheme(packId: string): CollectibleItem[] {
  return COLLECTIBLE_CATALOG.filter((item) => item.interestTheme === packId).sort(
    (a, b) => RARITY_META[a.rarity].rank - RARITY_META[b.rarity].rank,
  );
}

export function loadoutFromCollectibles(
  records: StudentCollectibleRecord[],
): EquippedLoadout {
  const loadout: EquippedLoadout = {};
  for (const record of records) {
    if (!record.equipped) continue;
    const item = COLLECTIBLE_BY_ID.get(record.itemId);
    const slot = item?.slot ?? record.slot;
    loadout[slot] = record.itemId;
  }
  return loadout;
}

export function evaluateMilestonesForPack({
  packId,
  completedBlockCount,
  totalBlocks,
  adaptiveCredits,
  unlockedItemIds,
}: {
  packId: string;
  completedBlockCount: number;
  totalBlocks: number;
  adaptiveCredits: number;
  unlockedItemIds: Iterable<string>;
}): CollectibleItem[] {
  const unlocked = new Set(unlockedItemIds);
  const themeItems = collectiblesForTheme(packId);
  const newlyUnlocked: CollectibleItem[] = [];

  for (const item of themeItems) {
    if (unlocked.has(item.id)) continue;
    let earned = false;
    switch (item.milestoneId) {
      case "m1_first_block":
        earned = completedBlockCount >= 1;
        break;
      case "m2_practice_block":
        earned = completedBlockCount >= 2;
        break;
      case "m3_lesson_clear":
        earned = totalBlocks > 0 && completedBlockCount >= totalBlocks;
        break;
      case "m4_credit_surge":
        earned = adaptiveCredits >= 150;
        break;
      case "m5_cross_skill":
        earned = adaptiveCredits >= 250;
        break;
      case "m6_capstone":
        earned = adaptiveCredits >= 360;
        break;
    }
    if (earned) newlyUnlocked.push(item);
  }

  return newlyUnlocked;
}

export function nextLockedMilestoneItem(
  packId: string,
  unlockedItemIds: Iterable<string>,
): CollectibleItem | null {
  const unlocked = new Set(unlockedItemIds);
  const themeItems = collectiblesForTheme(packId);
  return themeItems.find((item) => !unlocked.has(item.id)) ?? null;
}

export type CollectibleAction = "unlock" | "equip" | "unequip";

export type CollectibleActionPayload = {
  studentId: string;
  action: CollectibleAction;
  itemId: string;
  recallNote?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCollectibleAction(
  input: unknown,
): { ok: true; data: CollectibleActionPayload } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" };
  }
  const raw = input as Record<string, unknown>;

  if (typeof raw.studentId !== "string" || !UUID_RE.test(raw.studentId)) {
    return { ok: false, error: "Invalid studentId" };
  }

  if (
    raw.action !== "unlock" &&
    raw.action !== "equip" &&
    raw.action !== "unequip"
  ) {
    return { ok: false, error: "Invalid action" };
  }

  if (typeof raw.itemId !== "string" || !COLLECTIBLE_BY_ID.has(raw.itemId)) {
    return { ok: false, error: "Unknown itemId" };
  }

  let recallNote: string | undefined;
  if (raw.recallNote !== undefined) {
    if (typeof raw.recallNote !== "string") {
      return { ok: false, error: "Invalid recallNote" };
    }
    const trimmed = raw.recallNote.trim();
    if (trimmed.length > 280) {
      return { ok: false, error: "recallNote exceeds 280 characters" };
    }
    if (trimmed.length > 0) {
      recallNote = trimmed;
    }
  }

  return {
    ok: true,
    data: {
      studentId: raw.studentId,
      action: raw.action,
      itemId: raw.itemId,
      ...(recallNote !== undefined ? { recallNote } : {}),
    },
  };
}
