import {
  sanitizeBlockMs,
  sanitizeCompletedBlockIds,
  type BlockMs,
} from "@/domain/pace/block-dwell";
import { byId, CHOICES, type BlockRole } from "@/lib/blocks/library";
import {
  spaceContinuationBlocks,
  spaceFlipBlocks,
  wideHook,
  type FlipBlock,
} from "@/lib/lesson/space-pins";

export type MosaicBlock = FlipBlock & {
  span: 1 | 2;
};

export type RawPathPayload = {
  title?: string;
  packId?: string;
  packLabel?: string;
  profile?: string;
  blocks?: Array<{ id?: string; title?: string; role?: string; badge?: string }>;
};

function normalizeRole(raw?: string): BlockRole {
  const lower = (raw ?? "").toLowerCase();
  if (lower === "try") return "try";
  if (lower === "check") return "check";
  if (lower === "next") return "next";
  return "start";
}

function toMosaicBlock(entry: FlipBlock): MosaicBlock {
  return {
    ...entry,
    span: wideHook(entry) ? 2 : 1,
  };
}

export function resolveInitialStudent<T extends { id: string }>(
  roster: readonly T[],
  initialStudentId?: string | null,
): T | null {
  const trimmed = initialStudentId?.trim();
  if (!trimmed) return null;
  return roster.find((item) => item.id === trimmed) ?? null;
}

export function buildMosaicDeck(payload: RawPathPayload): MosaicBlock[] {
  const isSpaceDeck = !payload.packId || payload.packId === "pack_space";
  if (isSpaceDeck) {
    return [...spaceFlipBlocks(), ...spaceContinuationBlocks()].map(
      toMosaicBlock,
    );
  }

  const rawBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  if (rawBlocks.length === 0) return [];

  return rawBlocks.map((b, idx) => {
    const id = String(b.id ?? `block_${idx}`).slice(0, 80);
    const role = normalizeRole(b.role);
    const title = String(b.title ?? `Block ${idx + 1}`);

    if (idx === 0 || role === "start") {
      return toMosaicBlock({
        ...byId("video.story"),
        id,
        title,
        role: "start",
        kind: "video.story",
        subject: "hook",
      });
    }

    if (role === "try") {
      return toMosaicBlock({
        ...byId("image.draw"),
        id,
        title,
        role: "try",
        kind: "image.draw",
        subject: "art",
      });
    }

    if (role === "check") {
      return toMosaicBlock({
        ...byId("text.question"),
        id,
        title,
        role: "check",
        kind: "text.question",
        subject: "math",
        choices: CHOICES,
      });
    }

    return toMosaicBlock({
      ...byId("pbl.project"),
      id,
      title,
      role: "next",
      kind: "next",
      subject: "science",
    });
  });
}

export function isBlockUnlocked(
  index: number,
  completedIds: string[],
  blocks: MosaicBlock[],
): boolean {
  const target = blocks[index];
  if (!target) return false;
  if (index <= 0) return true;

  const isDemoDeck = blocks[0]?.demo === true;
  if (isDemoDeck) {
    // All 5 demo tiles plus the first connected continuation tile (#6) start unlocked.
    if (target.demo || index === 5) return true;
    const prev = blocks[index - 1];
    return prev ? completedIds.includes(prev.id) : true;
  }

  const done = new Set(completedIds);
  for (let i = 0; i < index; i++) {
    const prev = blocks[i];
    if (prev && !done.has(prev.id)) return false;
  }
  return true;
}

export type AttemptState = {
  attempts: number;
  wrongChoices: string[];
};

export function nextAttemptState(
  state: AttemptState,
  answer: string | null,
  correct: boolean,
): AttemptState {
  const attempts = Math.min(99, state.attempts + 1);
  if (correct || !answer) {
    return { attempts, wrongChoices: state.wrongChoices };
  }
  const trimmed = answer.trim().slice(0, 200);
  if (!trimmed || state.wrongChoices.length >= 8) {
    return { attempts, wrongChoices: state.wrongChoices };
  }
  return {
    attempts,
    wrongChoices: [...state.wrongChoices, trimmed],
  };
}

export function isCorrectRiddle(guess: string, answer: string): boolean {
  const norm = guess.trim().toLowerCase();
  return norm.length > 0 && norm.includes(answer.trim().toLowerCase());
}

export type BlockEventInput = {
  blockId: string;
  subject: string;
  attempts: number;
  durationSec: number;
  errorLog?: string[];
};

export function buildSessionPayload(input: {
  completedBlockIds: unknown;
  blockMs: unknown;
  blockEvents?: unknown;
}): {
  completedBlockIds: string[];
  blockMs: BlockMs;
  blockEvents: BlockEventInput[];
} {
  const completedBlockIds = sanitizeCompletedBlockIds(input.completedBlockIds);
  const blockMs = sanitizeBlockMs(input.blockMs);
  const rawEvents = Array.isArray(input.blockEvents) ? input.blockEvents : [];
  const blockEvents: BlockEventInput[] = [];

  for (const ev of rawEvents.slice(0, 20)) {
    if (!ev || typeof ev !== "object") continue;
    const rec = ev as Record<string, unknown>;
    const blockId =
      typeof rec.blockId === "string" ? rec.blockId.trim().slice(0, 80) : "";
    const subject = typeof rec.subject === "string" ? rec.subject.trim() : "";
    if (!blockId || !subject) continue;
    const attempts = Math.min(
      99,
      Math.max(0, Math.floor(Number(rec.attempts) || 1)),
    );
    const durationSec = Math.min(
      14400,
      Math.max(0, Math.floor(Number(rec.durationSec) || 1)),
    );
    const errorLog = Array.isArray(rec.errorLog)
      ? rec.errorLog
          .filter((x): x is string => typeof x === "string")
          .slice(0, 8)
      : [];
    blockEvents.push({ blockId, subject, attempts, durationSec, errorLog });
  }

  return { completedBlockIds, blockMs, blockEvents };
}
