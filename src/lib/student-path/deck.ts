import {
  sanitizeBlockMs,
  sanitizeCompletedBlockIds,
  type BlockMs,
} from "@/domain/pace/block-dwell";
import { CHOICES, type BlockRole } from "@/lib/blocks/library";

export type MosaicBlock = {
  id: string;
  title: string;
  role: BlockRole;
  kind: "video.story" | "image.draw" | "text.question" | "pbl.social" | "next";
  subject: "hook" | "math" | "ela" | "science" | "art";
  span: 1 | 2;
  instr: string;
  cta: string;
  choices?: { id: string; text: string; ok: boolean }[];
};

export type RawPathPayload = {
  title?: string;
  packId?: string;
  packLabel?: string;
  blocks?: Array<{ id?: string; title?: string; role?: string }>;
};

function normalizeRole(raw?: string): BlockRole {
  const lower = (raw ?? "").toLowerCase();
  if (lower === "try") return "try";
  if (lower === "check") return "check";
  if (lower === "next") return "next";
  return "start";
}

export function buildMosaicDeck(payload: RawPathPayload): MosaicBlock[] {
  const rawBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  if (rawBlocks.length === 0) return [];

  return rawBlocks.map((b, idx) => {
    const id = String(b.id ?? `block_${idx}`).slice(0, 80);
    const role = normalizeRole(b.role);
    const title = String(b.title ?? `Block ${idx + 1}`);

    if (idx === 0 || role === "start") {
      return {
        id,
        title,
        role: "start",
        kind: "video.story",
        subject: "hook",
        span: idx === 0 ? 2 : 1,
        instr: "Watch Sunny and her sister on Station Luna to launch today's mission.",
        cta: "Start the lesson",
      };
    }

    if (role === "try") {
      return {
        id,
        title,
        role: "try",
        kind: "image.draw",
        subject: "art",
        span: 1,
        instr: "Draw a line to split the moon into 2 equal halves.",
        cta: "Save my drawing",
      };
    }

    if (role === "check") {
      return {
        id,
        title,
        role: "check",
        kind: "text.question",
        subject: "math",
        span: 1,
        instr: "Which picture shows equal halves?",
        cta: "Lock in my answer",
        choices: CHOICES,
      };
    }

    return {
      id,
      title,
      role: "next",
      kind: "next",
      subject: "science",
      span: 1,
      instr: "Synthesize what you discovered in your own words.",
      cta: "Complete mission",
    };
  });
}

export function isBlockUnlocked(
  index: number,
  completedIds: string[],
  blocks: MosaicBlock[],
): boolean {
  if (index <= 0) return true;
  const done = new Set(completedIds);
  for (let i = 0; i < index; i++) {
    const prev = blocks[i];
    if (prev && !done.has(prev.id)) return false;
  }
  return true;
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
    const blockId = typeof rec.blockId === "string" ? rec.blockId.trim().slice(0, 80) : "";
    const subject = typeof rec.subject === "string" ? rec.subject.trim() : "";
    if (!blockId || !subject) continue;
    const attempts = Math.min(99, Math.max(0, Math.floor(Number(rec.attempts) || 1)));
    const durationSec = Math.min(14400, Math.max(0, Math.floor(Number(rec.durationSec) || 1)));
    const errorLog = Array.isArray(rec.errorLog)
      ? rec.errorLog.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [];
    blockEvents.push({ blockId, subject, attempts, durationSec, errorLog });
  }

  return { completedBlockIds, blockMs, blockEvents };
}
