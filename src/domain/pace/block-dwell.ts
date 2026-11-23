/** Dwell telemetry for student path. Never concatenated into LLM prompts. */

export const BLOCK_MS_WRITE_CAP = 14_400_000;
export const BLOCK_MS_TOTAL_CAP = 43_200_000;

export type BlockMs = Record<string, number>;

function clampKey(raw: string): string | null {
  const key = raw.trim().slice(0, 80);
  return key.length >= 1 ? key : null;
}

export function sanitizeBlockMs(input: unknown): BlockMs {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: BlockMs = {};
  for (const [rawKey, rawVal] of Object.entries(input as Record<string, unknown>)) {
    const key = clampKey(rawKey);
    if (!key) continue;
    const n =
      typeof rawVal === "number"
        ? rawVal
        : typeof rawVal === "string"
          ? Number(rawVal)
          : NaN;
    if (!Number.isFinite(n) || n < 0) continue;
    out[key] = Math.min(Math.floor(n), BLOCK_MS_TOTAL_CAP);
  }
  return out;
}

export function sanitizeCompletedBlockIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" && typeof item !== "number") continue;
    const id = String(item).trim().slice(0, 80);
    if (id.length >= 1) out.push(id);
    if (out.length >= 200) break;
  }
  return out;
}

/** Per-key max. Used when hydrating localStorage against GET totals. */
export function maxMergeBlockMs(a: BlockMs, b: BlockMs): BlockMs {
  const left = sanitizeBlockMs(a);
  const right = sanitizeBlockMs(b);
  const next: BlockMs = { ...left };
  for (const [key, value] of Object.entries(right)) {
    next[key] = Math.max(next[key] ?? 0, value);
  }
  return next;
}

/** Add a write-capped delta onto stored totals. */
export function addBlockMsDelta(stored: BlockMs, delta: BlockMs): BlockMs {
  const next: BlockMs = { ...sanitizeBlockMs(stored) };
  for (const [key, raw] of Object.entries(sanitizeBlockMs(delta))) {
    const add = Math.min(Math.max(0, raw), BLOCK_MS_WRITE_CAP);
    next[key] = Math.min((next[key] ?? 0) + add, BLOCK_MS_TOTAL_CAP);
  }
  return next;
}

const MINUTE = 60_000;

const TYPE_MINUTES: Record<string, number> = {
  read: 4,
  questions: 8,
  offscreen: 6,
  draw: 5,
  write: 5,
  caption: 5,
  entry: 2,
  reward: 2,
  finish: 1,
  listen: 3,
  watch: 3,
  break: 2,
};

export function recommendedBlockMs(block: {
  type: string;
  durationSec?: number;
  breakSec?: number;
}): number {
  if (block.type === "listen" || block.type === "watch") {
    const sec = block.durationSec && block.durationSec > 0 ? block.durationSec : 180;
    return sec * 1000;
  }
  if (block.type === "break") {
    const sec = block.breakSec && block.breakSec > 0 ? block.breakSec : 120;
    return sec * 1000;
  }
  return (TYPE_MINUTES[block.type] ?? 4) * MINUTE;
}

export function isDoubleTime(ms: number, budgetMs: number): boolean {
  return ms > 0 && budgetMs > 0 && ms >= budgetMs * 2;
}

export function medianPositive(values: number[]): number | null {
  const sorted = values.filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  return Math.floor(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}
