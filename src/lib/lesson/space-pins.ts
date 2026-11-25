import { byId, CHOICES, type BlockEntry } from "@/lib/blocks/library";

export const RIDDLE = {
  text: "I have no rocket and no wings, yet I float past every planet in silence. Astronauts look right through me, and if I crack, the station alarm sounds. What am I?",
  clues: [
    "You look through me to see the stars.",
    "Every spacecraft cabin has one.",
  ],
  answer: "window",
} as const;

export type SpacePinSubject = "hook" | "ela" | "art" | "math" | "science";
export type SpacePinKind =
  | "video.story"
  | "text.question"
  | "image.draw"
  | "placeholder"
  | "riddle";

export type SpacePin = {
  id: string;
  subject: SpacePinSubject;
  kind: SpacePinKind;
  title: string;
  videoId: string | null;
  gameUrl: string | null;
  placeholder: boolean;
  blockId: string | null;
};

export type FlipBlock = BlockEntry & {
  kind: string;
  subject: SpacePinSubject;
  videoId?: string | null;
  videoSrc?: string;
  choices?: { id: string; text: string; ok?: boolean }[];
  passage?: string[];
  demo?: boolean;
  continuation?: boolean;
};

/** Grade 2–3 space mosaic. Sketch order. Math waits for the uploaded game. */
export function spacePins(): SpacePin[] {
  return [
    {
      id: "hook",
      subject: "hook",
      kind: "video.story",
      title: "Space video",
      videoId: "W_B2UZ_ZoxU",
      gameUrl: null,
      placeholder: false,
      blockId: null,
    },
    {
      id: "ela",
      subject: "ela",
      kind: "text.question",
      title: "ELA",
      videoId: null,
      gameUrl: null,
      placeholder: false,
      blockId: null,
    },
    {
      id: "art",
      subject: "art",
      kind: "image.draw",
      title: "Art",
      videoId: null,
      gameUrl: null,
      placeholder: false,
      blockId: null,
    },
    {
      id: "math",
      subject: "math",
      kind: "placeholder",
      title: "Math",
      videoId: null,
      gameUrl: null,
      placeholder: true,
      blockId: null,
    },
    {
      id: "science",
      subject: "science",
      kind: "riddle",
      title: "The Floating Riddle",
      videoId: null,
      gameUrl: null,
      placeholder: false,
      blockId: "riddle",
    },
  ];
}

/** Same five pins, shaped for BlockFlip. */
export function spaceFlipBlocks(): FlipBlock[] {
  return spacePins().map((pin) => {
    if (pin.kind === "video.story") {
      return {
        ...byId("video.story"),
        id: pin.id,
        subject: pin.subject,
        title: pin.title,
        kind: pin.kind,
        videoId: pin.videoId,
        videoSrc: `https://www.youtube-nocookie.com/embed/${pin.videoId}?rel=0&modestbranding=1`,
        dur: 186,
        h: 168,
        demo: true,
      };
    }
    if (pin.kind === "text.question") {
      return {
        ...byId("text.question"),
        id: pin.id,
        subject: pin.subject,
        title: pin.title,
        kind: pin.kind,
        instr: "Sunny looked out at the blue planet. Which word is a sight word?",
        choices: [
          { id: "a", text: "blue", ok: true },
          { id: "b", text: "planet", ok: false },
          { id: "c", text: "window", ok: false },
        ],
        h: 150,
        demo: true,
      };
    }
    if (pin.kind === "image.draw") {
      return {
        ...byId("image.draw"),
        id: pin.id,
        subject: pin.subject,
        title: pin.title,
        kind: pin.kind,
        h: 190,
        demo: true,
      };
    }
    if (pin.kind === "riddle") {
      return {
        ...byId("text.question"),
        id: pin.id,
        role: "try",
        subject: pin.subject,
        title: pin.title,
        kind: pin.kind,
        instr: RIDDLE.text,
        cta: "Lock in my guess",
        h: 168,
        demo: true,
      };
    }
    return {
      id: pin.id,
      type: "game",
      sub: "Game",
      role: "try",
      subject: pin.subject,
      title: pin.title,
      instr: "The math game is not uploaded yet.",
      cta: "Later",
      h: 168,
      kind: "placeholder",
      demo: true,
    };
  });
}

/** Continuous lesson blocks connected directly after the 5 Space demo blocks. */
export function spaceContinuationBlocks(): FlipBlock[] {
  return [
    {
      ...byId("pbl.manipulative"),
      id: "cont_make_ten",
      role: "start",
      subject: "math",
      title: "Math: Make Ten, space edition",
      kind: "pbl.manipulative",
      instr: "Use ten rods and one cubes to build 10 fuel cells.",
      cta: "That's 10",
      h: 170,
      continuation: true,
    },
    {
      ...byId("text.question"),
      id: "cont_equal_halves",
      subject: "math",
      title: "Math: Equal Halves, space edition",
      kind: "text.question",
      instr: "Which station solar panel is split into equal halves?",
      choices: CHOICES,
      h: 158,
      continuation: true,
    },
    {
      ...byId("image.art"),
      id: "cont_mission_patch",
      subject: "art",
      title: "Art: Mission Patch, space edition",
      kind: "image.art",
      h: 186,
      continuation: true,
    },
    {
      ...byId("text.read"),
      id: "cont_luna_log",
      subject: "ela",
      title: "ELA: Station Luna Log, space edition",
      kind: "text.read",
      passage: [
        "Commander Sunny checked the solar panels at sunrise over Crater Bay.",
        "Each panel needed two equal halves so the rover battery charged evenly.",
        "When both halves matched, the green indicator lit up across the deck.",
      ],
      h: 168,
      continuation: true,
    },
    {
      ...byId("text.write"),
      id: "cont_float_write",
      subject: "science",
      title: "Science: Why Things Float, space edition",
      kind: "text.write",
      h: 162,
      continuation: true,
    },
    {
      ...byId("game.brain"),
      id: "cont_fuel_match",
      subject: "math",
      title: "Math: Fuel Pair Match, space edition",
      kind: "game.brain",
      h: 178,
      continuation: true,
    },
  ];
}

export function wideHook(entry: FlipBlock): boolean {
  if (entry.id === "pbl.social" || entry.kind === "pbl.social") return false;
  if (entry.id !== "hook") return false;
  if (entry.role !== "start") return false;
  const kind = entry.kind || entry.id;
  return kind === "video.story" || kind === "text.read";
}
