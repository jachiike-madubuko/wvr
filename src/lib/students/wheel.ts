export const WHEEL_DIMENSIONS = [
  "Emotional Reg",
  "Focus",
  "Engagement",
  "Task Completion",
  "Social",
] as const;

export type WheelDimension = (typeof WHEEL_DIMENSIONS)[number];
export type WheelScore = 1 | 2 | 3 | 4 | 5;
export type WheelScores = Record<WheelDimension, WheelScore | null>;
export type WheelRecord = {
  scores: WheelScores;
  updatedAt: string;
  version: number;
  setByYou: boolean;
};
export type WheelLoad =
  | { status: "ok"; wheel: WheelRecord | null }
  | { status: "error" };

export const WHEEL_SHORT_LABELS: Record<WheelDimension, string> = {
  "Emotional Reg": "Emo Reg",
  Focus: "Focus",
  Engagement: "Engagement",
  "Task Completion": "Task Comp",
  Social: "Social",
};

// Proposed defaults (OQ-7, OQ-2)
export const WHEEL_ANCHORS: Record<WheelScore, string> = {
  1: "Rarely",
  2: "Sometimes",
  3: "About half the time",
  4: "Usually",
  5: "Almost always",
};

export const WHEEL_HINTS: Record<WheelDimension, string> = {
  "Emotional Reg": "Recovers after a mistake or frustration",
  Focus: "Stays on a task with normal room noise",
  Engagement: "Joins in when something new starts",
  "Task Completion": "Finishes work once it gets hard",
  Social: "Works well with a partner",
};

export const WHEEL_COLUMNS: Record<WheelDimension, string> = {
  "Emotional Reg": "emotional_reg",
  Focus: "focus",
  Engagement: "engagement",
  "Task Completion": "task_completion",
  Social: "social",
};

export const EMPTY_SCORES: WheelScores = {
  "Emotional Reg": null,
  Focus: null,
  Engagement: null,
  "Task Completion": null,
  Social: null,
};

export const isWheelScore = (v: unknown): v is WheelScore =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

/** Strict: any bad value → null (caller fails closed). Never clamps or rounds. */
export function parseWheelScores(input: unknown): WheelScores | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (
    Object.keys(raw).some(
      (k) => !(WHEEL_DIMENSIONS as readonly string[]).includes(k),
    )
  ) {
    return null;
  }
  const out = { ...EMPTY_SCORES };
  for (const d of WHEEL_DIMENSIONS) {
    const v = raw[d] === undefined ? null : raw[d];
    if (v === null) continue;
    if (!isWheelScore(v)) return null;
    out[d] = v;
  }
  return out;
}

export const countSet = (s: WheelScores): number =>
  WHEEL_DIMENSIONS.filter((d) => s[d] !== null).length;

export const sameScores = (a: WheelScores, b: WheelScores): boolean =>
  WHEEL_DIMENSIONS.every((d) => a[d] === b[d]);

export function validateWheelSaveRequest(
  input: unknown,
):
  | { ok: true; data: { scores: WheelScores; expectedVersion: number | null } }
  | {
      ok: false;
      status: 400;
      error: "INVALID_BODY" | "INVALID_SCORES" | "EMPTY_WHEEL";
    } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, error: "INVALID_BODY" };
  }
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) {
    if (k !== "scores" && k !== "expectedVersion") {
      return { ok: false, status: 400, error: "INVALID_BODY" };
    }
  }
  const scores = parseWheelScores(raw.scores);
  if (!scores) return { ok: false, status: 400, error: "INVALID_SCORES" };
  if (countSet(scores) === 0) {
    return { ok: false, status: 400, error: "EMPTY_WHEEL" }; // proposed (OQ-3)
  }
  const ev = raw.expectedVersion;
  if (
    !(
      ev === null ||
      (typeof ev === "number" && Number.isInteger(ev) && ev >= 1)
    )
  ) {
    return { ok: false, status: 400, error: "INVALID_BODY" };
  }
  return { ok: true, data: { scores, expectedVersion: ev } };
}

export const ariaValueText = (v: WheelScore | null): string =>
  v === null ? "Not set" : `${v}, ${WHEEL_ANCHORS[v]}`;

export const valuesLine = (s: WheelScores): string =>
  WHEEL_DIMENSIONS.map((d) => `${d} ${s[d] ?? "Not set"}`).join(" · ");

/** Proposed (OQ-8): first tied dimension in fixed order wins. */
export function lowestCaption(s: WheelScores): string | null {
  let low: WheelDimension | null = null;
  for (const d of WHEEL_DIMENSIONS) {
    const v = s[d];
    if (v !== null && (low === null || v < (s[low] as number))) low = d;
  }
  if (!low) return null;
  const n = countSet(s);
  return `Lowest right now: ${low}.${n < 5 ? ` (${n} of 5 set)` : ""}`;
}

/** Draw-time only. Never persist. */
export const plotRadius = (v: WheelScore | null): number =>
  v === null ? 0 : v * 20;

export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "just now";
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
