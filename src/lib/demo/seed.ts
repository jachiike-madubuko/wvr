import { createHash } from "node:crypto";

export type DemoProfile = "sales_walkthrough" | "interactive_onboarding";

export type Queryable = {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

export type SeedResult = {
  profile: DemoProfile;
  studentCount: number;
  studentIds: Record<string, string>;
  pathToken: string;
};

export type ClearResult = {
  deletedStudents: number;
  preservedRealStudents: number;
};

// RFC 4122 DNS namespace; deterministic primary keys only — never used for security tokens.
const WEAVER_NS_BYTES = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");

export const DEMO_TEACHER_DEFAULT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CLASS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const DEMO_PATH_PLAIN_TOKEN = "demo-space-lesson";
export const DEMO_PATH_TOKEN_HASH = createHash("sha256")
  .update(DEMO_PATH_PLAIN_TOKEN)
  .digest("hex");

export function isDemoProfile(value: unknown): value is DemoProfile {
  return value === "sales_walkthrough" || value === "interactive_onboarding";
}

export function uuidv5(label: string): string {
  const hash = createHash("sha1")
    .update(WEAVER_NS_BYTES)
    .update(label, "utf8")
    .digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertSafeDemoEnv(
  env: Record<string, string | undefined> = process.env,
): { directUrl: string; teacherId: string } {
  const directUrl = env.DATABASE_URL_UNPOOLED?.trim();
  if (!directUrl) {
    throw new Error("DATABASE_URL_UNPOOLED is required for demo seeding.");
  }
  if (/-pooler\./i.test(directUrl)) {
    throw new Error("Refusing demo seed over a pooled (-pooler) Neon URL.");
  }

  for (const key of ["VERCEL_ENV", "APP_ENV", "WEAVR_ENV"] as const) {
    if (env[key]?.trim().toLowerCase() === "production") {
      throw new Error(`Refusing demo seed when ${key}=production.`);
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(directUrl);
  } catch {
    throw new Error("DATABASE_URL_UNPOOLED is not a valid Postgres URL.");
  }
  if (/(^|[.-])(prod|production)([.-]|$)/i.test(parsed.hostname)) {
    throw new Error(`Refusing demo seed against production host: ${parsed.hostname}`);
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (/(^|[._-])(prod|production)([._-]|$)/i.test(dbName)) {
    throw new Error(`Refusing demo seed against production database: ${dbName}`);
  }

  const teacherId = (env.DEMO_TEACHER_ID ?? DEMO_TEACHER_DEFAULT_ID).trim();
  if (!UUID_RE.test(teacherId)) {
    throw new Error("DEMO_TEACHER_ID must be a valid UUID.");
  }
  return { directUrl, teacherId };
}

export const DEMO_IDS = {
  piiScan: uuidv5("weaver:pii_scan:space-standards-v1"),
  recipe: uuidv5("weaver:recipe:space-fractions-core-v1"),
  variationSetSpace: uuidv5("weaver:variation_set:space-fractions-v1"),
  unitBlock: uuidv5("weaver:calendar_block:unit:space-mission"),
  lessonPrev: uuidv5("weaver:calendar_block:lesson:space-warmup"),
  lessonToday: uuidv5("weaver:calendar_block:lesson:space-happy-path"),
  pathToken: uuidv5("weaver:path_token:demo-space-lesson"),
  pathTokenPrev: uuidv5("weaver:path_token:demo-space-warmup"),
  students: {
    nebula: uuidv5("weaver:student:nebula-stalled"),
    maya: uuidv5("weaver:student:maya-split-pace"),
    cosmo: uuidv5("weaver:student:cosmo-steady"),
    astra: uuidv5("weaver:student:astra-fast-track"),
    pulsar: uuidv5("weaver:student:pulsar-edgecase"),
    leo: uuidv5("weaver:student:leo-mentor"),
    zoe: uuidv5("weaver:student:zoe-ahead"),
    noah: uuidv5("weaver:student:noah-steady"),
  },
} as const;

type BlockEventSpec = {
  slug: string;
  blockId: string;
  subject: "hook" | "math" | "ela" | "science" | "social_studies" | "art";
  attempts: number;
  durationSec: number;
  status: "completed" | "struggling" | "abandoned";
  errorLog: string[];
  hoursAgo: number;
};

type CheckinSpec = {
  daysAgo: number;
  period: "am" | "pm";
  mood: "calm" | "happy" | "focused" | "tired" | "frustrated" | "anxious" | "overwhelmed";
  level: number;
};

type CollectibleSpec = {
  itemId: string;
  slot: "hat" | "eyewear" | "pet";
  equipped: boolean;
  milestoneId: string;
  recallNote: string;
};

type StudentSpec = {
  key: keyof typeof DEMO_IDS.students;
  id: string;
  firstName: string; // First-name-only invariant!
  sortKey: number;
  packId: string;
  blockMs: Record<string, number>;
  completedBlockIds: string[];
  events: BlockEventSpec[];
  wheel: Array<[string, string]>;
  checkins: CheckinSpec[];
  ivDraft?: {
    misconception: string;
    steps: [string, string, string];
    approved: boolean;
    message: string;
  };
  selDraft?: Array<{ role: "teacher" | "assistant"; text: string }>;
  collectibles: CollectibleSpec[];
};

const CORE_STUDENTS: readonly StudentSpec[] = [
  {
    key: "nebula",
    id: DEMO_IDS.students.nebula,
    firstName: "Nebula",
    sortKey: 0,
    packId: "pack_space",
    completedBlockIds: ["hook"],
    blockMs: { hook: 90_000, math: 420_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 90, status: "completed", errorLog: [], hoursAgo: 48 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 5, durationSec: 420, status: "struggling", errorLog: ["Numerator/denominator inversion"], hoursAgo: 26 },
      { slug: "math_2", blockId: "cont_equal_halves", subject: "math", attempts: 4, durationSec: 380, status: "struggling", errorLog: ["Numerator/denominator inversion"], hoursAgo: 4 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 4, durationSec: 310, status: "struggling", errorLog: ["Skipped multisyllabic sight word"], hoursAgo: 2 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 2, durationSec: 155, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "breaks"],
      ["partner", "pairs"],
      ["mistake", "asks"],
      ["noise", "quiet"],
      ["newact", "retries"],
    ],
    checkins: [
      { daysAgo: 2, period: "am", mood: "calm", level: 3 },
      { daysAgo: 2, period: "pm", mood: "tired", level: 2 },
      { daysAgo: 1, period: "am", mood: "anxious", level: 2 },
      { daysAgo: 1, period: "pm", mood: "frustrated", level: 1 },
      { daysAgo: 0, period: "am", mood: "frustrated", level: 2 },
    ],
    selDraft: [
      { role: "teacher", text: "Nebula has 4 low check-ins in a row before math." },
      {
        role: "assistant",
        text: "Prewritten SEL guide: 1) Offer a 60-second quiet reset at the door. 2) Pair with Cosmo for low-stakes start. 3) Re-check mood at midday.",
      },
    ],
    ivDraft: {
      misconception: "Numerator/denominator inversion",
      message: "Pending 3-step offline manipulative plan for Nebula (Numerator/denominator inversion).",
      steps: [
        "1. Manipulative Check: Fold paper fuel strips with Nebula, counting total equal parts (bottom) before shaded parts (top).",
        "2. Partner Scaffolding: Pair Nebula with Cosmo for a 1-minute verbal explain-back using fraction tiles.",
        "3. Quick Check: Run 2 oral exit checks offline before reopening the Space deck.",
      ],
      approved: false,
    },
    collectibles: [
      {
        itemId: "space_cadet_cap",
        slot: "hat",
        equipped: true,
        milestoneId: "m1_first_block",
        recallNote: "Kicked off the mission by completing your first Launch & Hook block.",
      },
    ],
  },
  {
    key: "maya",
    id: DEMO_IDS.students.maya,
    firstName: "Maya",
    sortKey: 1,
    packId: "pack_space",
    completedBlockIds: ["hook", "ela", "science", "art"],
    blockMs: { hook: 95_000, math: 240_000, ela: 165_000, science: 65_000, art: 70_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 95, status: "completed", errorLog: [], hoursAgo: 30 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 4, durationSec: 240, status: "struggling", errorLog: ["unequal parts"], hoursAgo: 20 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 2, durationSec: 165, status: "completed", errorLog: [], hoursAgo: 16 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 1, durationSec: 65, status: "completed", errorLog: [], hoursAgo: 5 },
      { slug: "art_1", blockId: "art", subject: "art", attempts: 1, durationSec: 70, status: "completed", errorLog: [], hoursAgo: 2 },
    ],
    wheel: [
      ["hard", "keeps"],
      ["partner", "pairs"],
      ["mistake", "retries"],
      ["noise", "quiet"],
      ["newact", "asks"],
    ],
    checkins: [
      { daysAgo: 0, period: "am", mood: "focused", level: 4 },
      { daysAgo: 0, period: "pm", mood: "frustrated", level: 2 },
    ],
    ivDraft: {
      misconception: "unequal parts",
      message: "3-step offline manipulative plan for Maya (unequal parts).",
      steps: [
        "1. Manipulative Check: Fold paper strips into 2 equal halves with Maya.",
        "2. Partner Scaffolding: Compare equal vs unequal cuts with a peer.",
        "3. Quick Check: 2 verbal exit prompts on equal parts before resuming.",
      ],
      approved: false,
    },
    collectibles: [],
  },
  {
    key: "cosmo",
    id: DEMO_IDS.students.cosmo,
    firstName: "Cosmo",
    sortKey: 2,
    packId: "pack_space",
    completedBlockIds: ["hook", "math", "ela"],
    blockMs: { hook: 120_000, math: 185_000, ela: 195_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 120, status: "completed", errorLog: [], hoursAgo: 28 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 2, durationSec: 185, status: "completed", errorLog: [], hoursAgo: 22 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 2, durationSec: 195, status: "completed", errorLog: [], hoursAgo: 14 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 2, durationSec: 190, status: "completed", errorLog: [], hoursAgo: 6 },
      { slug: "ss_1", blockId: "social_studies", subject: "social_studies", attempts: 2, durationSec: 180, status: "completed", errorLog: [], hoursAgo: 3 },
      { slug: "art_1", blockId: "art", subject: "art", attempts: 2, durationSec: 185, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "keeps"],
      ["partner", "pairs"],
      ["mistake", "retries"],
      ["noise", "quiet"],
      ["newact", "keeps"],
    ],
    checkins: [
      { daysAgo: 3, period: "am", mood: "calm", level: 4 },
      { daysAgo: 3, period: "pm", mood: "happy", level: 4 },
      { daysAgo: 2, period: "am", mood: "focused", level: 4 },
      { daysAgo: 1, period: "am", mood: "calm", level: 4 },
      { daysAgo: 1, period: "pm", mood: "focused", level: 4 },
    ],
    selDraft: [
      {
        role: "assistant",
        text: "Cosmo is steady across recent check-ins. Keep standard morning greeting and partner rotation.",
      },
    ],
    collectibles: [
      {
        itemId: "space_cadet_cap",
        slot: "hat",
        equipped: true,
        milestoneId: "m1_first_block",
        recallNote: "Kicked off the mission by completing your first Launch & Hook block.",
      },
      {
        itemId: "space_star_visor",
        slot: "eyewear",
        equipped: false,
        milestoneId: "m2_practice_block",
        recallNote: "Locked in star-pattern focus across two guided practice blocks.",
      },
    ],
  },
  {
    key: "astra",
    id: DEMO_IDS.students.astra,
    firstName: "Astra",
    sortKey: 3,
    packId: "pack_space",
    completedBlockIds: [
      "hook",
      "math",
      "ela",
      "science",
      "social_studies",
      "art",
      "cont_make_ten",
      "cont_equal_halves",
    ],
    blockMs: {
      hook: 32_000,
      math: 38_000,
      ela: 35_000,
      science: 40_000,
      social_studies: 43_000,
      art: 36_000,
      cont_make_ten: 42_000,
      cont_equal_halves: 39_000,
    },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 32, status: "completed", errorLog: [], hoursAgo: 40 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 1, durationSec: 38, status: "completed", errorLog: [], hoursAgo: 32 },
      { slug: "math_2", blockId: "cont_make_ten", subject: "math", attempts: 1, durationSec: 42, status: "completed", errorLog: [], hoursAgo: 20 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 1, durationSec: 35, status: "completed", errorLog: [], hoursAgo: 18 },
      { slug: "ela_2", blockId: "cont_luna_log", subject: "ela", attempts: 1, durationSec: 44, status: "completed", errorLog: [], hoursAgo: 12 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 1, durationSec: 40, status: "completed", errorLog: [], hoursAgo: 8 },
      { slug: "ss_1", blockId: "social_studies", subject: "social_studies", attempts: 1, durationSec: 43, status: "completed", errorLog: [], hoursAgo: 4 },
      { slug: "art_1", blockId: "art", subject: "art", attempts: 1, durationSec: 36, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "retries"],
      ["partner", "pairs"],
      ["mistake", "retries"],
      ["noise", "keeps"],
      ["newact", "keeps"],
    ],
    checkins: [
      { daysAgo: 2, period: "am", mood: "happy", level: 5 },
      { daysAgo: 2, period: "pm", mood: "focused", level: 5 },
      { daysAgo: 1, period: "am", mood: "calm", level: 5 },
      { daysAgo: 1, period: "pm", mood: "happy", level: 5 },
      { daysAgo: 0, period: "am", mood: "focused", level: 5 },
    ],
    selDraft: [
      {
        role: "assistant",
        text: "Astra is consistently calm and high-energy. Invite them to lead a 1-minute peer explain-back.",
      },
    ],
    collectibles: [
      { itemId: "space_cadet_cap", slot: "hat", equipped: false, milestoneId: "m1_first_block", recallNote: "Common: CCSS.MATH.3.NF.A.1 launch block." },
      { itemId: "space_star_visor", slot: "eyewear", equipped: false, milestoneId: "m2_practice_block", recallNote: "Uncommon: guided fractions practice." },
      { itemId: "space_mini_moon", slot: "pet", equipped: false, milestoneId: "m3_lesson_clear", recallNote: "Rare: 5-subject Space sequence clear." },
      { itemId: "space_astro_helmet", slot: "hat", equipped: true, milestoneId: "m4_credit_surge", recallNote: "Epic: raised adaptive threshold mastered." },
      { itemId: "space_nebula_goggles", slot: "eyewear", equipped: true, milestoneId: "m5_cross_skill", recallNote: "Mythic: cross-subject Space mastery." },
      { itemId: "space_comet_ufo", slot: "pet", equipped: true, milestoneId: "m6_capstone", recallNote: "Legendary: Unit Capstone Legend." },
    ],
  },
];

const SALES_EXTRA_STUDENTS: readonly StudentSpec[] = [
  {
    key: "pulsar",
    id: DEMO_IDS.students.pulsar,
    firstName: "Pulsar",
    sortKey: 4,
    packId: "pack_animals",
    completedBlockIds: ["hook"],
    blockMs: { hook: 100_000, math: 390_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 100, status: "completed", errorLog: [], hoursAgo: 24 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 4, durationSec: 390, status: "struggling", errorLog: ["Simulated LLM API 500 / Timeout trigger"], hoursAgo: 3 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 2, durationSec: 165, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "breaks"],
      ["partner", "solo"],
      ["mistake", "asks"],
      ["noise", "quiet"],
      ["newact", "breaks"],
    ],
    checkins: [
      { daysAgo: 2, period: "am", mood: "anxious", level: 2 },
      { daysAgo: 2, period: "pm", mood: "overwhelmed", level: 1 },
      { daysAgo: 1, period: "am", mood: "overwhelmed", level: 1 },
      { daysAgo: 1, period: "pm", mood: "anxious", level: 2 },
      { daysAgo: 0, period: "am", mood: "overwhelmed", level: 1 },
    ],
    selDraft: [
      { role: "teacher", text: "Pulsar is withdrawing during independent blocks." },
      {
        role: "assistant",
        text: "Prewritten SEL guide (Withdrawal): 1) Check in 1-on-1 away from peers. 2) Offer a two-choice starter. 3) Shorten first block goal to 2 minutes.",
      },
    ],
    collectibles: [
      { itemId: "animals_cat_ears", slot: "hat", equipped: true, milestoneId: "m1_first_block", recallNote: "Started tracking the trail." },
    ],
  },
  {
    key: "leo",
    id: DEMO_IDS.students.leo,
    firstName: "Leo",
    sortKey: 5,
    packId: "pack_cooking",
    completedBlockIds: ["hook", "math", "ela"],
    blockMs: { hook: 80_000, math: 150_000, ela: 60_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 80, status: "completed", errorLog: [], hoursAgo: 26 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 2, durationSec: 150, status: "completed", errorLog: [], hoursAgo: 14 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 1, durationSec: 60, status: "completed", errorLog: [], hoursAgo: 6 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 2, durationSec: 155, status: "completed", errorLog: [], hoursAgo: 2 },
    ],
    wheel: [
      ["hard", "keeps"],
      ["partner", "pairs"],
      ["mistake", "retries"],
      ["noise", "keeps"],
      ["newact", "keeps"],
    ],
    checkins: [
      { daysAgo: 2, period: "am", mood: "frustrated", level: 2 },
      { daysAgo: 2, period: "pm", mood: "tired", level: 2 },
      { daysAgo: 1, period: "am", mood: "calm", level: 3 },
      { daysAgo: 1, period: "pm", mood: "focused", level: 4 },
      { daysAgo: 0, period: "am", mood: "happy", level: 5 },
    ],
    selDraft: [
      { role: "teacher", text: "Leo dipped Tuesday afternoon, checking how recovery looks." },
      {
        role: "assistant",
        text: "Prewritten SEL guide: Leo rebounded from level 2 to 5 after a short break. Reinforce the strategy that helped.",
      },
    ],
    collectibles: [
      { itemId: "cooking_chef_toque", slot: "hat", equipped: true, milestoneId: "m1_first_block", recallNote: "Prepped the station by completing your first Launch & Hook block." },
    ],
  },
  {
    key: "zoe",
    id: DEMO_IDS.students.zoe,
    firstName: "Zoe",
    sortKey: 6,
    packId: "pack_video_games",
    completedBlockIds: [
      "hook",
      "math",
      "ela",
      "science",
      "social_studies",
      "art",
      "cont_make_ten",
      "cont_equal_halves",
    ],
    blockMs: {
      hook: 40_000,
      math: 45_000,
      ela: 48_000,
      science: 42_000,
      social_studies: 46_000,
      art: 44_000,
      cont_make_ten: 44_000,
      cont_equal_halves: 41_000,
    },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 40, status: "completed", errorLog: [], hoursAgo: 25 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 1, durationSec: 45, status: "completed", errorLog: [], hoursAgo: 18 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 1, durationSec: 48, status: "completed", errorLog: [], hoursAgo: 12 },
      { slug: "sci_1", blockId: "science", subject: "science", attempts: 1, durationSec: 42, status: "completed", errorLog: [], hoursAgo: 6 },
      { slug: "ss_1", blockId: "social_studies", subject: "social_studies", attempts: 1, durationSec: 46, status: "completed", errorLog: [], hoursAgo: 3 },
      { slug: "art_1", blockId: "art", subject: "art", attempts: 1, durationSec: 44, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "retries"],
      ["partner", "pairs"],
      ["mistake", "retries"],
      ["noise", "keeps"],
      ["newact", "keeps"],
    ],
    checkins: [
      { daysAgo: 0, period: "am", mood: "happy", level: 5 },
    ],
    collectibles: [
      { itemId: "games_pixel_shades", slot: "eyewear", equipped: true, milestoneId: "m2_practice_block", recallNote: "Cleared two guided practice stages without losing focus." },
    ],
  },
  {
    key: "noah",
    id: DEMO_IDS.students.noah,
    firstName: "Noah",
    sortKey: 7,
    packId: "pack_music",
    completedBlockIds: ["hook", "math", "ela", "art"],
    blockMs: { hook: 110_000, math: 170_000, ela: 160_000, social_studies: 270_000, art: 55_000 },
    events: [
      { slug: "hook", blockId: "hook", subject: "hook", attempts: 1, durationSec: 110, status: "completed", errorLog: [], hoursAgo: 22 },
      { slug: "math_1", blockId: "math", subject: "math", attempts: 2, durationSec: 170, status: "completed", errorLog: [], hoursAgo: 14 },
      { slug: "ela_1", blockId: "ela", subject: "ela", attempts: 2, durationSec: 160, status: "completed", errorLog: [], hoursAgo: 10 },
      { slug: "ss_1", blockId: "social_studies", subject: "social_studies", attempts: 3, durationSec: 270, status: "struggling", errorLog: ["Timeline order reversed"], hoursAgo: 4 },
      { slug: "art_1", blockId: "art", subject: "art", attempts: 1, durationSec: 55, status: "completed", errorLog: [], hoursAgo: 1 },
    ],
    wheel: [
      ["hard", "keeps"],
      ["partner", "pairs"],
      ["mistake", "asks"],
      ["noise", "quiet"],
      ["newact", "keeps"],
    ],
    checkins: [
      { daysAgo: 3, period: "am", mood: "calm", level: 4 },
      { daysAgo: 2, period: "am", mood: "focused", level: 4 },
      { daysAgo: 1, period: "am", mood: "tired", level: 2 },
      { daysAgo: 0, period: "am", mood: "calm", level: 4 },
    ],
    selDraft: [
      {
        role: "assistant",
        text: "Noah only has morning check-ins logged. Prompt a quick midday check-in after lunch.",
      },
    ],
    collectibles: [
      { itemId: "music_note_sprite", slot: "pet", equipped: true, milestoneId: "m3_lesson_clear", recallNote: "Cleared the full lesson track to summon a floating Eighth-Note Sprite." },
    ],
  },
];

function spaceTokenPayload(profile: DemoProfile) {
  const happyPath = [
    { id: "hook", title: "Space Video & SEL Launch", role: "Start", subject: "hook", standard: "SEL.CASEL.1A", durationSec: 180 },
    { id: "math", title: "Station Fuel Fractions", role: "Try", subject: "math", standard: "CCSS.MATH.3.NF.A.1", durationSec: 180 },
    { id: "ela", title: "Station Luna Sight Words", role: "Check", subject: "ela", standard: "CCSS.ELA-LITERACY.RF.2.3", durationSec: 180 },
    { id: "science", title: "Planet Classification & Floating Riddle", role: "Try", subject: "science", standard: "NGSS.2-PS1-1", durationSec: 180 },
    { id: "social_studies", title: "Spaceflight Timeline", role: "Check", subject: "social_studies", standard: "C3.D2.HIS.1.3-5", durationSec: 180 },
    { id: "art", title: "Constellation Patch Drawing", role: "Next", subject: "art", standard: "NCAS.VA:Cr1.1.3a", durationSec: 180 },
  ];

  const generatedDemoBlocks =
    profile === "sales_walkthrough"
      ? [
          {
            id: "cont_make_ten",
            title: "Make Ten Fuel Cells",
            role: "Next",
            subject: "math",
            badge: "Generated for Demo Purposes",
            durationSec: 180,
          },
          {
            id: "cont_equal_halves",
            title: "Solar Panel Equal Halves",
            role: "Check",
            subject: "math",
            badge: "Generated for Demo Purposes",
            durationSec: 180,
          },
        ]
      : [];

  return {
    title: "Equal Parts & Halves — Station Luna",
    packId: "pack_space",
    packLabel: "Space",
    profile,
    standards: [
      "CCSS.MATH.3.NF.A.1",
      "CCSS.ELA-LITERACY.RF.2.3",
      "NGSS.2-PS1-1",
      "C3.D2.HIS.1.3-5",
      "NCAS.VA:Cr1.1.3a",
    ],
    blocks: [...happyPath, ...generatedDemoBlocks],
  };
}

/**
 * Purges strictly `is_demo = true` rows for the demo teacher/class while leaving
 * every manually created (`is_demo = false`) student, lesson, and append-only ledger untouched.
 */
export async function clearDemoData(
  client: Queryable,
  opts?: { teacherId?: string; classId?: string; logEvent?: boolean },
): Promise<ClearResult> {
  const teacherId = opts?.teacherId ?? DEMO_TEACHER_DEFAULT_ID;
  const classId = opts?.classId ?? DEMO_CLASS_ID;

  await client.query(
    `DELETE FROM public.block_events
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_path_sessions
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_wheel_answers
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_sel_checkins
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_action_threads
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_collectibles
      WHERE is_demo = true
        AND student_id IN (SELECT id FROM public.students WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.student_path_tokens
      WHERE is_demo = true
        AND calendar_block_id IN (SELECT id FROM public.calendar_blocks WHERE class_id = $1)`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.calendar_blocks WHERE class_id = $1 AND is_demo = true`,
    [classId],
  );
  await client.query(
    `DELETE FROM public.variation_sets WHERE teacher_id = $1 AND is_demo = true`,
    [teacherId],
  );
  await client.query(
    `DELETE FROM public.recipes WHERE teacher_id = $1 AND is_demo = true`,
    [teacherId],
  );
  const delStudents = await client.query<{ id: string }>(
    `DELETE FROM public.students WHERE class_id = $1 AND is_demo = true RETURNING id`,
    [classId],
  );
  const realCountRes = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM public.students WHERE class_id = $1 AND is_demo = false`,
    [classId],
  );

  if (opts?.logEvent !== false) {
    await client.query(
      `INSERT INTO public.events (teacher_id, name, payload, is_demo)
       VALUES ($1, 'demo.data_cleared', $2::jsonb, true)`,
      [teacherId, JSON.stringify({ deletedStudents: delStudents.rows.length })],
    );
  }

  return {
    deletedStudents: delStudents.rows.length,
    preservedRealStudents: Number(realCountRes.rows[0]?.n ?? 0),
  };
}

/**
 * Idempotently seeds Layer 1 (Shared Core) + Layer 2A (`sales_walkthrough`) or
 * Layer 2B (`interactive_onboarding`) inside the caller's transaction.
 */
export async function seedDemoProfile(
  client: Queryable,
  profile: DemoProfile,
  opts?: { teacherId?: string; classId?: string; reset?: boolean },
): Promise<SeedResult> {
  const teacherId = opts?.teacherId ?? DEMO_TEACHER_DEFAULT_ID;
  const classId = opts?.classId ?? DEMO_CLASS_ID;
  const roster: readonly StudentSpec[] =
    profile === "sales_walkthrough"
      ? [...CORE_STUDENTS, ...SALES_EXTRA_STUDENTS]
      : CORE_STUDENTS;

  await client.query(
    `INSERT INTO public.teachers (id, display_name)
     VALUES ($1, 'Ms. Rivera')
     ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name`,
    [teacherId],
  );

  await client.query(
    `INSERT INTO public.classes (id, teacher_id, name, grade, nav_layout, demo_profile)
     VALUES ($1, $2, 'Room 204', 3, 'top', $3)
     ON CONFLICT (id) DO UPDATE
       SET demo_profile = excluded.demo_profile,
           grade = excluded.grade`,
    [classId, teacherId, profile],
  );

  if (opts?.reset) {
    await clearDemoData(client, { teacherId, classId, logEvent: false });
  } else {
    // Drop demo students not belonging to this profile (e.g. switching 8 -> 4 or replacing legacy seed).
    // Never touches is_demo = false (real teacher-created) students.
    await client.query(
      `DELETE FROM public.students
        WHERE class_id = $1
          AND is_demo = true
          AND NOT (id = ANY($2::uuid[]))`,
      [classId, roster.map((s) => s.id)],
    );
    await client.query(
      `DELETE FROM public.calendar_blocks
        WHERE class_id = $1
          AND is_demo = true
          AND NOT (id = ANY($2::uuid[]))`,
      [classId, [DEMO_IDS.unitBlock, DEMO_IDS.lessonPrev, DEMO_IDS.lessonToday]],
    );
  }

  // Layer 1: Reference curriculum (pii_scans -> recipes -> variation_sets -> calendar_blocks -> path_token)
  const scanHash = createHash("sha256")
    .update("weavr:demo:space-standards-recipe:v1")
    .digest("hex");

  await client.query(
    `INSERT INTO public.pii_scans (id, teacher_id, verdict, rule_id, scanned_text_sha256, scanner_version)
     VALUES ($1, $2, 'pass', null, $3, 'pii.v1')
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_IDS.piiScan, teacherId, scanHash],
  );

  const lockedRecipe = {
    title: "Space Mission: Equal Parts & Core Standards",
    gradeBand: "2-3",
    standards: [
      { subject: "math", code: "CCSS.MATH.3.NF.A.1", label: "Understand a fraction 1/b as equal parts of a whole" },
      { subject: "ela", code: "CCSS.ELA-LITERACY.RF.2.3", label: "Decode grade-level sight words and space log passages" },
      { subject: "science", code: "NGSS.2-PS1-1", label: "Classify planetary materials and observable properties" },
      { subject: "social_studies", code: "C3.D2.HIS.1.3-5", label: "Order key milestones on a spaceflight timeline" },
      { subject: "art", code: "NCAS.VA:Cr1.1.3a", label: "Design constellation patterns using balanced symmetry" },
    ],
  };

  await client.query(
    `INSERT INTO public.recipes
       (id, teacher_id, schema_version, pii_scan_id, source_text_sha256, locked, context_layer, surface, is_demo)
     VALUES ($1, $2, 'recipe.v1', $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, true)
     ON CONFLICT (id) DO UPDATE
       SET locked = excluded.locked,
           context_layer = excluded.context_layer,
           surface = excluded.surface,
           is_demo = true,
           deleted_at = null`,
    [
      DEMO_IDS.recipe,
      teacherId,
      DEMO_IDS.piiScan,
      scanHash,
      JSON.stringify(lockedRecipe),
      JSON.stringify({ primaryPack: "pack_space", profile }),
      JSON.stringify({ blocks: spaceTokenPayload(profile).blocks }),
    ],
  );

  await client.query(
    `INSERT INTO public.variation_sets
       (id, teacher_id, base_recipe_id, pack_ids, payload, qa_status, inference_cost_usd, is_demo)
     VALUES ($1, $2, $3, array['pack_space', 'pack_cooking', 'pack_video_games'], $4::jsonb, 'pass', 0, true)
     ON CONFLICT (id) DO UPDATE
       SET payload = excluded.payload,
           qa_status = 'pass',
           is_demo = true,
           deleted_at = null`,
    [
      DEMO_IDS.variationSetSpace,
      teacherId,
      DEMO_IDS.recipe,
      JSON.stringify({
        profile,
        peerTriads:
          profile === "sales_walkthrough"
            ? [
                { role: "triad_1", mentor: "Astra", core: "Cosmo", emerging: "Nebula" },
                { role: "triad_2", mentor: "Zoe", core: "Leo", emerging: "Maya" },
              ]
            : [],
      }),
    ],
  );

  // Evergreen calendar blocks anchored dynamically to CURRENT_DATE
  await client.query(
    `INSERT INTO public.calendar_blocks
       (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, variation_set_id, status, is_demo)
     VALUES ($1, $2, $3, current_date - 2, current_date + 4,
             array['math', 'ela', 'science', 'social_studies', 'art'],
             'unit', 'Space Mission: Fractions & Core Standards', $4, 'approved', true)
     ON CONFLICT (id) DO UPDATE
       SET start_date = excluded.start_date,
           end_date = excluded.end_date,
           subjects = excluded.subjects,
           title = excluded.title,
           variation_set_id = excluded.variation_set_id,
           status = 'approved',
           is_demo = true`,
    [DEMO_IDS.unitBlock, classId, teacherId, DEMO_IDS.variationSetSpace],
  );

  await client.query(
    `INSERT INTO public.calendar_blocks
       (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, unit_id, variation_set_id, status, is_demo)
     VALUES
       ($1, $3, $4, current_date - 1, current_date - 1, array['math', 'science'], 'lesson', 'Orbit Fractions Warmup', $5, $6, 'approved', true),
       ($2, $3, $4, current_date, current_date, array['math', 'ela', 'science', 'social_studies', 'art'], 'lesson', 'Equal Parts & Halves — Station Luna', $5, $6, 'approved', true)
     ON CONFLICT (id) DO UPDATE
       SET start_date = excluded.start_date,
           end_date = excluded.end_date,
           subjects = excluded.subjects,
           title = excluded.title,
           unit_id = excluded.unit_id,
           variation_set_id = excluded.variation_set_id,
           status = 'approved',
           is_demo = true`,
    [
      DEMO_IDS.lessonPrev,
      DEMO_IDS.lessonToday,
      classId,
      teacherId,
      DEMO_IDS.unitBlock,
      DEMO_IDS.variationSetSpace,
    ],
  );

  const tokenRes = await client.query<{ id: string }>(
    `INSERT INTO public.student_path_tokens
       (id, token_hash, calendar_block_id, variation_id, payload, progress, expires_at, is_demo)
     VALUES ($1, $2, $3, 'var_space', $4::jsonb, '{}'::jsonb, now() + interval '365 days', true)
     ON CONFLICT (token_hash) DO UPDATE
       SET calendar_block_id = excluded.calendar_block_id,
           variation_id = excluded.variation_id,
           payload = excluded.payload,
           expires_at = excluded.expires_at,
           is_demo = true
     RETURNING id`,
    [
      DEMO_IDS.pathToken,
      DEMO_PATH_TOKEN_HASH,
      DEMO_IDS.lessonToday,
      JSON.stringify(spaceTokenPayload(profile)),
    ],
  );
  const activeTokenId = tokenRes.rows[0]!.id;

  const prevTokenHash = createHash("sha256").update("demo-space-warmup").digest("hex");
  const prevPayload = {
    title: "Orbit Fractions Warmup",
    packId: "pack_space",
    packLabel: "Space",
    blocks: spaceTokenPayload(profile).blocks.slice(0, 2),
  };
  const prevTokenRes = await client.query<{ id: string }>(
    `INSERT INTO public.student_path_tokens
       (id, token_hash, calendar_block_id, variation_id, payload, progress, expires_at, is_demo)
     VALUES ($1, $2, $3, 'var_space', $4::jsonb, '{}'::jsonb, now() + interval '365 days', true)
     ON CONFLICT (token_hash) DO UPDATE
       SET calendar_block_id = excluded.calendar_block_id,
           payload = excluded.payload,
           expires_at = excluded.expires_at,
           is_demo = true
     RETURNING id`,
    [DEMO_IDS.pathTokenPrev, prevTokenHash, DEMO_IDS.lessonPrev, JSON.stringify(prevPayload)],
  );
  const prevTokenId = prevTokenRes.rows[0]!.id;

  // Batched unnest() upserts keep Neon remote latency under ~1s and avoid idle timeouts
  const rosterIds = roster.map((s) => s.id);

  await client.query(
    `INSERT INTO public.students (id, class_id, first_name, sort_key, is_demo)
     SELECT u.id, $1::uuid, u.first_name, u.sort_key, true
     FROM unnest($2::uuid[], $3::text[], $4::int[]) AS u(id, first_name, sort_key)
     ON CONFLICT (id) DO UPDATE
       SET first_name = excluded.first_name,
           sort_key = excluded.sort_key,
           is_demo = true`,
    [
      classId,
      roster.map((s) => s.id),
      roster.map((s) => s.firstName),
      roster.map((s) => s.sortKey),
    ],
  );

  await client.query(
    `INSERT INTO public.group_memberships (student_id, class_id, pack_id, version)
     SELECT u.student_id, $1::uuid, u.pack_id, 1
     FROM unnest($2::uuid[], $3::text[]) AS u(student_id, pack_id)
     ON CONFLICT (student_id) DO UPDATE
       SET pack_id = excluded.pack_id,
           version = GREATEST(public.group_memberships.version, 1)`,
    [
      classId,
      roster.map((s) => s.id),
      roster.map((s) => s.packId),
    ],
  );

  await client.query(
    `INSERT INTO public.student_path_sessions (id, path_token_id, student_id, progress, is_demo)
     SELECT u.id, $1::uuid, u.student_id, u.progress, true
     FROM unnest($2::uuid[], $3::uuid[], $4::jsonb[]) AS u(id, student_id, progress)
     ON CONFLICT (path_token_id, student_id) DO UPDATE
       SET progress = excluded.progress,
           is_demo = true`,
    [
      activeTokenId,
      roster.map((s) => uuidv5(`weaver:path_session:${s.key}`)),
      roster.map((s) => s.id),
      roster.map((s) =>
        JSON.stringify({ completedBlockIds: s.completedBlockIds, blockMs: s.blockMs }),
      ),
    ],
  );

  await client.query(
    `INSERT INTO public.student_path_sessions (id, path_token_id, student_id, progress, is_demo)
     SELECT u.id, $1::uuid, u.student_id, u.progress, true
     FROM unnest($2::uuid[], $3::uuid[], $4::jsonb[]) AS u(id, student_id, progress)
     ON CONFLICT (path_token_id, student_id) DO UPDATE
       SET progress = excluded.progress,
           is_demo = true`,
    [
      prevTokenId,
      roster.map((s) => uuidv5(`weaver:path_session_prev:${s.key}`)),
      roster.map((s) => s.id),
      roster.map((s) =>
        JSON.stringify({
          completedBlockIds: s.completedBlockIds.filter((b) => b === "hook" || b === "math"),
          blockMs: {
            ...(s.blockMs.hook ? { hook: s.blockMs.hook } : {}),
            ...(s.blockMs.math ? { math: s.blockMs.math } : {}),
          },
        }),
      ),
    ],
  );

  const flatEvents = roster.flatMap((stu) =>
    stu.events.map((ev) => ({
      id: uuidv5(`weaver:block_event:${stu.key}:${ev.slug}`),
      studentId: stu.id,
      blockId: ev.blockId,
      subject: ev.subject,
      attempts: ev.attempts,
      durationSec: ev.durationSec,
      status: ev.status,
      errorLog: JSON.stringify(ev.errorLog),
      hoursAgo: ev.hoursAgo,
    })),
  );
  if (flatEvents.length > 0) {
    await client.query(
      `INSERT INTO public.block_events
         (id, student_id, block_id, subject, attempts, duration_sec, status, error_log, created_at, is_demo)
       SELECT u.id, u.student_id, u.block_id, u.subject, u.attempts, u.duration_sec, u.status,
              u.error_log, now() - (u.hours_ago || ' hours')::interval, true
       FROM unnest(
         $1::uuid[], $2::uuid[], $3::text[], $4::text[],
         $5::int[], $6::int[], $7::text[], $8::jsonb[], $9::int[]
       ) AS u(id, student_id, block_id, subject, attempts, duration_sec, status, error_log, hours_ago)
       ON CONFLICT (id) DO UPDATE
         SET block_id = excluded.block_id,
             subject = excluded.subject,
             attempts = excluded.attempts,
             duration_sec = excluded.duration_sec,
             status = excluded.status,
             error_log = excluded.error_log,
             created_at = excluded.created_at,
             is_demo = true`,
      [
        flatEvents.map((e) => e.id),
        flatEvents.map((e) => e.studentId),
        flatEvents.map((e) => e.blockId),
        flatEvents.map((e) => e.subject),
        flatEvents.map((e) => e.attempts),
        flatEvents.map((e) => e.durationSec),
        flatEvents.map((e) => e.status),
        flatEvents.map((e) => e.errorLog),
        flatEvents.map((e) => e.hoursAgo),
      ],
    );
  }

  const flatWheel = roster.flatMap((stu) =>
    stu.wheel.map(([itemId, optionId]) => ({
      id: uuidv5(`weaver:wheel:${stu.key}:${itemId}`),
      studentId: stu.id,
      itemId,
      optionId,
    })),
  );
  if (flatWheel.length > 0) {
    await client.query(
      `INSERT INTO public.student_wheel_answers (id, student_id, item_id, option_id, is_demo)
       SELECT u.id, u.student_id, u.item_id, u.option_id, true
       FROM unnest($1::uuid[], $2::uuid[], $3::text[], $4::text[])
         AS u(id, student_id, item_id, option_id)
       ON CONFLICT (student_id, item_id) DO UPDATE
         SET option_id = excluded.option_id,
             is_demo = true`,
      [
        flatWheel.map((w) => w.id),
        flatWheel.map((w) => w.studentId),
        flatWheel.map((w) => w.itemId),
        flatWheel.map((w) => w.optionId),
      ],
    );
  }

  // Clear stale demo check-ins for seeded students so rolling CURRENT_DATE never leaves orphaned days
  await client.query(
    `DELETE FROM public.student_sel_checkins
      WHERE student_id = ANY($1::uuid[]) AND is_demo = true`,
    [rosterIds],
  );
  const flatCheckins = roster.flatMap((stu) =>
    stu.checkins.map((c) => ({
      id: uuidv5(`weaver:checkin:${stu.key}:${c.daysAgo}:${c.period}`),
      studentId: stu.id,
      daysAgo: c.daysAgo,
      period: c.period,
      mood: c.mood,
      level: c.level,
      note: "",
    })),
  );
  if (flatCheckins.length > 0) {
    await client.query(
      `INSERT INTO public.student_sel_checkins
         (id, student_id, checkin_date, period, mood, level, teacher_note, is_demo)
       SELECT u.id, u.student_id, current_date - u.days_ago, u.period, u.mood, u.level, u.note, true
       FROM unnest(
         $1::uuid[], $2::uuid[], $3::int[], $4::text[], $5::text[], $6::smallint[], $7::text[]
       ) AS u(id, student_id, days_ago, period, mood, level, note)
       ON CONFLICT (student_id, checkin_date, period) DO UPDATE
         SET mood = excluded.mood,
             level = excluded.level,
             teacher_note = excluded.teacher_note,
             is_demo = true`,
      [
        flatCheckins.map((c) => c.id),
        flatCheckins.map((c) => c.studentId),
        flatCheckins.map((c) => c.daysAgo),
        flatCheckins.map((c) => c.period),
        flatCheckins.map((c) => c.mood),
        flatCheckins.map((c) => c.level),
        flatCheckins.map((c) => c.note),
      ],
    );
  }

  const flatThreads = [
    ...roster
      .filter((stu) => stu.ivDraft)
      .map((stu) => ({
        id: uuidv5(`weaver:thread:${stu.key}:iv`),
        studentId: stu.id,
        kind: "iv" as const,
        messages: JSON.stringify([{ role: "assistant", text: stu.ivDraft!.message }]),
        approvedPlan: JSON.stringify({
          misconception: stu.ivDraft!.misconception,
          steps: stu.ivDraft!.steps,
        }),
        approvedAt: stu.ivDraft!.approved ? new Date().toISOString() : null,
      })),
    ...roster
      .filter((stu) => stu.selDraft && stu.selDraft.length > 0)
      .map((stu) => ({
        id: uuidv5(`weaver:thread:${stu.key}:sel`),
        studentId: stu.id,
        kind: "sel" as const,
        messages: JSON.stringify(stu.selDraft),
        approvedPlan: null,
        approvedAt: null,
      })),
  ];
  if (flatThreads.length > 0) {
    await client.query(
      `INSERT INTO public.student_action_threads
         (id, student_id, kind, messages, approved_plan, teacher_approved_at, is_demo)
       SELECT u.id, u.student_id, u.kind, u.messages, u.approved_plan, u.approved_at, true
       FROM unnest($1::uuid[], $2::uuid[], $3::text[], $4::jsonb[], $5::jsonb[], $6::timestamptz[])
         AS u(id, student_id, kind, messages, approved_plan, approved_at)
       ON CONFLICT (student_id, kind) DO UPDATE
         SET messages = excluded.messages,
             approved_plan = excluded.approved_plan,
             teacher_approved_at = excluded.teacher_approved_at,
             is_demo = true`,
      [
        flatThreads.map((t) => t.id),
        flatThreads.map((t) => t.studentId),
        flatThreads.map((t) => t.kind),
        flatThreads.map((t) => t.messages),
        flatThreads.map((t) => t.approvedPlan),
        flatThreads.map((t) => t.approvedAt),
      ],
    );
  }

  // Reset equipped demo slots before upsert so the one-equipped-per-slot unique index never collides
  await client.query(
    `UPDATE public.student_collectibles
        SET equipped = false
      WHERE student_id = ANY($1::uuid[]) AND is_demo = true`,
    [rosterIds],
  );
  const flatCollectibles = roster.flatMap((stu) =>
    stu.collectibles.map((item) => ({
      id: uuidv5(`weaver:collectible:${stu.key}:${item.itemId}`),
      studentId: stu.id,
      itemId: item.itemId,
      slot: item.slot,
      equipped: item.equipped,
      milestoneId: item.milestoneId,
      recallNote: item.recallNote,
    })),
  );
  if (flatCollectibles.length > 0) {
    await client.query(
      `INSERT INTO public.student_collectibles
         (id, student_id, item_id, slot, equipped, milestone_id, recall_note, is_demo)
       SELECT u.id, u.student_id, u.item_id, u.slot, u.equipped, u.milestone_id, u.recall_note, true
       FROM unnest(
         $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::boolean[], $6::text[], $7::text[]
       ) AS u(id, student_id, item_id, slot, equipped, milestone_id, recall_note)
       ON CONFLICT (student_id, item_id) DO UPDATE
         SET slot = excluded.slot,
             equipped = excluded.equipped,
             milestone_id = excluded.milestone_id,
             recall_note = excluded.recall_note,
             is_demo = true`,
      [
        flatCollectibles.map((c) => c.id),
        flatCollectibles.map((c) => c.studentId),
        flatCollectibles.map((c) => c.itemId),
        flatCollectibles.map((c) => c.slot),
        flatCollectibles.map((c) => c.equipped),
        flatCollectibles.map((c) => c.milestoneId),
        flatCollectibles.map((c) => c.recallNote),
      ],
    );
  }

  // Analytics hygiene: tag seed event as is_demo = true so real metrics exclude demo runs
  await client.query(
    `INSERT INTO public.events (teacher_id, name, payload, is_demo)
     VALUES ($1, 'demo.profile_seeded', $2::jsonb, true)`,
    [
      teacherId,
      JSON.stringify({ profile, reset: Boolean(opts?.reset), studentCount: rosterIds.length }),
    ],
  );

  return {
    profile,
    studentCount: roster.length,
    studentIds: Object.fromEntries(roster.map((s) => [s.key, s.id])),
    pathToken: DEMO_PATH_PLAIN_TOKEN,
  };
}
