import { isDoubleTime, recommendedBlockMs } from "./block-dwell";

export type PaceBand = "ahead" | "on" | "behind";

export type PaceCalendarBlock = {
  id: string;
  startDate: string;
  endDate: string;
  kind: "unit" | "lesson";
  status: string;
  assignment: Record<string, string | null | undefined>;
};

export type PacePin = {
  id: string;
  title: string;
  type: string;
  durationSec?: number;
  breakSec?: number;
};

export type PaceSession = {
  studentId: string;
  firstName: string;
  calendarBlockId: string | null;
  blockMs: Record<string, number>;
  pins: PacePin[];
};

export type PaceStudent = {
  studentId: string;
  firstName: string;
  band: PaceBand;
  pinTitle: string | null;
};

export type DayPace = {
  date: string;
  ahead: PaceStudent[];
  on: PaceStudent[];
  behind: PaceStudent[];
  hasSessions: boolean;
  empty: boolean;
};

export function overlapsDay(startDate: string, endDate: string, date: string): boolean {
  return startDate <= date && date <= endDate;
}

const SKIP = new Set(["reward", "break"]);

function instructionalPins(pins: PacePin[]): PacePin[] {
  return pins.filter((p) => !SKIP.has(p.type) && !SKIP.has(p.id));
}

export function sessionBand(session: PaceSession): {
  band: PaceBand;
  pinTitle: string | null;
} {
  const pins = instructionalPins(session.pins);
  let longTitle: string | null = null;
  let started = 0;
  for (const pin of pins) {
    const ms = session.blockMs[pin.id] ?? 0;
    if (ms > 0) started += 1;
    const budget = recommendedBlockMs(pin);
    if (isDoubleTime(ms, budget)) {
      longTitle = pin.title;
    }
  }
  if (longTitle) return { band: "behind", pinTitle: longTitle };
  if (pins.length > 0 && started >= pins.length) {
    return { band: "ahead", pinTitle: null };
  }
  if (started > 0) return { band: "on", pinTitle: null };
  return { band: "behind", pinTitle: null };
}

export function dayPace(args: {
  date: string;
  blocks: PaceCalendarBlock[];
  students: { id: string; firstName: string }[];
  sessions: PaceSession[];
}): DayPace {
  const covering = args.blocks.filter(
    (b) =>
      b.kind === "lesson" &&
      (b.status === "generated" || b.status === "approved") &&
      overlapsDay(b.startDate, b.endDate, args.date),
  );
  const assigned = new Map<string, { firstName: string }>();
  for (const block of covering) {
    for (const [studentId, packId] of Object.entries(block.assignment)) {
      if (!packId) continue;
      const student = args.students.find((s) => s.id === studentId);
      if (student) assigned.set(studentId, { firstName: student.firstName });
    }
    if (Object.keys(block.assignment).length === 0) {
      for (const student of args.students) {
        assigned.set(student.id, { firstName: student.firstName });
      }
    }
  }

  const ahead: PaceStudent[] = [];
  const on: PaceStudent[] = [];
  const behind: PaceStudent[] = [];
  let hasSessions = false;

  for (const [studentId, meta] of assigned) {
    const session = args.sessions.find(
      (s) =>
        s.studentId === studentId &&
        covering.some((b) => b.id === s.calendarBlockId),
    );
    if (session) hasSessions = true;
    const reading = session
      ? sessionBand(session)
      : { band: "behind" as const, pinTitle: null };
    const row: PaceStudent = {
      studentId,
      firstName: meta.firstName,
      band: reading.band,
      pinTitle: reading.pinTitle,
    };
    if (row.band === "ahead") ahead.push(row);
    else if (row.band === "on") on.push(row);
    else behind.push(row);
  }

  const empty = assigned.size === 0 || !hasSessions;
  return {
    date: args.date,
    ahead: empty ? [] : ahead,
    on: empty ? [] : on,
    behind: empty ? [] : behind,
    hasSessions,
    empty,
  };
}

export function pacePercents(day: DayPace): {
  ahead: number;
  on: number;
  behind: number;
} {
  if (day.empty) return { ahead: 0, on: 0, behind: 0 };
  const total = day.ahead.length + day.on.length + day.behind.length;
  if (total === 0) return { ahead: 0, on: 0, behind: 0 };
  return {
    ahead: Math.round((day.ahead.length / total) * 100),
    on: Math.round((day.on.length / total) * 100),
    behind: Math.round((day.behind.length / total) * 100),
  };
}
