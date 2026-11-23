import { byId, type BlockEntry } from "@/lib/blocks/library";
import { RIDDLE } from "./content";

export type SpacePinSubject = "hook" | "ela" | "art" | "math" | "science";

export type SpacePin = {
  id: string;
  subject: SpacePinSubject;
  kind: "video.story" | "text.question" | "image.draw" | "placeholder" | "riddle";
  title: string;
  videoId: string | null;
  gameUrl: string | null;
  placeholder: boolean;
  blockId: string | null;
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

type FlipPin = BlockEntry & {
  kind: SpacePin["kind"];
  videoSrc?: string;
  choices?: { id: string; text: string }[];
};

/** Same five pins, shaped for BlockFlip. */
export function spaceFlipBlocks(): FlipPin[] {
  return spacePins().map((pin) => {
    if (pin.kind === "video.story") {
      return {
        ...byId("video.story"),
        id: pin.id,
        title: pin.title,
        kind: pin.kind,
        videoSrc: "/spellbound.mp4",
        dur: 186,
      };
    }
    if (pin.kind === "text.question") {
      return {
        ...byId("text.question"),
        id: pin.id,
        title: pin.title,
        kind: pin.kind,
        instr: "Sunny looked out at the blue planet. Which word is a sight word?",
        choices: [
          { id: "a", text: "blue" },
          { id: "b", text: "planet" },
          { id: "c", text: "window" },
        ],
      };
    }
    if (pin.kind === "image.draw") {
      return { ...byId("image.draw"), id: pin.id, title: pin.title, kind: pin.kind };
    }
    if (pin.kind === "riddle") {
      return {
        ...byId("text.question"),
        id: pin.id,
        role: "try",
        title: pin.title,
        kind: pin.kind,
        instr: RIDDLE.text,
      };
    }
    return {
      id: pin.id,
      type: "game",
      sub: "Game",
      role: "try",
      title: pin.title,
      instr: "The math game is not uploaded yet.",
      cta: "Later",
      completes: "",
      shape: "",
      h: 168,
      kind: "placeholder",
    };
  });
}
