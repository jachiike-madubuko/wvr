import { recommendedBlockMs } from "@/domain/pace/block-dwell";
import {
  type PaceBand,
  type PacePin,
  type PaceSession,
  sessionBand,
} from "@/domain/pace/pace";
import { withTeacherDb } from "@/lib/db";
import type {
  MoveStudentPayload,
  RoomCalendarBlock,
  RoomPack,
  RoomSnapshot,
  RoomStudent,
} from "@/lib/room/types";

export const PACK_COLORS: Record<string, string> = {
  pack_cooking: "#f87171",
  pack_video_games: "#60a5fa",
  pack_space: "#38bdf8",
  pack_music: "#c88dfc",
  pack_fashion: "#f472b6",
  pack_animals: "#48e29a",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PACK_RE = /^pack_[a-z0-9_]{2,40}$/;

export function validateMovePayload(
  input: unknown,
): { ok: true; data: MoveStudentPayload } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" };
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.studentId !== "string" || !UUID_RE.test(raw.studentId)) {
    return { ok: false, error: "Invalid studentId" };
  }
  if (typeof raw.toPackId !== "string" || !PACK_RE.test(raw.toPackId)) {
    return { ok: false, error: "Invalid toPackId" };
  }
  if (
    typeof raw.expectedVersion !== "number" ||
    !Number.isInteger(raw.expectedVersion) ||
    raw.expectedVersion < 0
  ) {
    return { ok: false, error: "Invalid expectedVersion" };
  }
  return {
    ok: true,
    data: {
      studentId: raw.studentId,
      toPackId: raw.toPackId,
      expectedVersion: raw.expectedVersion,
    },
  };
}

export function classifyMoveError(err: unknown): {
  status: number;
  body: { error: string };
} {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  if (code === "40001") return { status: 409, body: { error: "VERSION_CONFLICT" } };
  if (code === "42501") return { status: 404, body: { error: "STUDENT_NOT_FOUND" } };
  if (code === "23503") return { status: 400, body: { error: "UNKNOWN_PACK" } };
  return { status: 500, body: { error: "MOVE_FAILED" } };
}

function mapRoleToPinType(role?: string): string {
  switch (role?.toLowerCase()) {
    case "try":
      return "questions";
    case "check":
      return "questions";
    case "next":
      return "write";
    default:
      return "read";
  }
}

export function buildPaceSessions(args: {
  students: { id: string; firstName: string; packId: string; version: number }[];
  blocks: RoomCalendarBlock[];
  tokens: {
    calendarBlockId: string;
    blocks: { id: string; title: string; type?: string; role?: string; durationSec?: number }[];
  }[];
  pathSessions: {
    studentId: string;
    calendarBlockId: string;
    blockMs: Record<string, number>;
  }[];
  blockEvents: {
    studentId: string;
    blockId: string;
    durationSec: number;
    status: string;
  }[];
}): PaceSession[] {
  const firstLesson = args.blocks.find((b) => b.kind === "lesson");
  const pinsByBlock = new Map<string, PacePin[]>();
  for (const token of args.tokens) {
    if (pinsByBlock.has(token.calendarBlockId)) continue;
    pinsByBlock.set(
      token.calendarBlockId,
      token.blocks.map((b) => ({
        id: b.id,
        title: b.title,
        type: b.type ?? mapRoleToPinType(b.role),
        durationSec: b.durationSec ?? 180,
      })),
    );
  }

  const byStudent = new Map<string, PaceSession>();
  for (const ps of args.pathSessions) {
    const stu = args.students.find((s) => s.id === ps.studentId);
    if (!stu) continue;
    byStudent.set(ps.studentId, {
      studentId: ps.studentId,
      firstName: stu.firstName,
      calendarBlockId: ps.calendarBlockId,
      blockMs: { ...ps.blockMs },
      pins: pinsByBlock.get(ps.calendarBlockId) ?? [],
    });
  }

  for (const ev of args.blockEvents) {
    const stu = args.students.find((s) => s.id === ev.studentId);
    if (!stu) continue;
    let session = byStudent.get(ev.studentId);
    if (!session) {
      const blockId = firstLesson?.id ?? null;
      session = {
        studentId: ev.studentId,
        firstName: stu.firstName,
        calendarBlockId: blockId,
        blockMs: {},
        pins: blockId ? (pinsByBlock.get(blockId) ?? []) : [],
      };
      byStudent.set(ev.studentId, session);
    }
    const pin = session.pins.find((p) => p.id === ev.blockId);
    const baseMs = Math.max(0, ev.durationSec * 1000);
    const budget = pin ? recommendedBlockMs(pin) : 180_000;
    const effectiveMs =
      ev.status === "struggling" ? Math.max(baseMs, budget * 2) : baseMs;
    session.blockMs[ev.blockId] = Math.max(session.blockMs[ev.blockId] ?? 0, effectiveMs);
  }

  return Array.from(byStudent.values());
}

export async function getRoomSnapshot(): Promise<RoomSnapshot> {
  return withTeacherDb(async (client) => {
    const classRes = await client.query<{ id: string; name: string; grade: number }>(
      `SELECT id, name, grade FROM public.classes ORDER BY created_at ASC LIMIT 1`,
    );
    const cls = classRes.rows[0];
    if (!cls) {
      throw new Error("No class found for teacher");
    }

    const packsRes = await client.query<{ id: string; label: string }>(
      `SELECT id, label FROM public.context_packs WHERE is_published = true ORDER BY label ASC`,
    );
    const packs: RoomPack[] = packsRes.rows.map((p) => ({
      id: p.id,
      label: p.label,
      color: PACK_COLORS[p.id] ?? "#58b6fa",
    }));

    const studentsRes = await client.query<{
      id: string;
      first_name: string;
      pack_id: string | null;
      version: number;
    }>(
      `SELECT s.id, s.first_name, m.pack_id, COALESCE(m.version, 0) AS version
         FROM public.students s
         LEFT JOIN public.group_memberships m ON m.student_id = s.id
        WHERE s.class_id = $1
        ORDER BY s.sort_key ASC, s.first_name ASC`,
      [cls.id],
    );

    const blocksRes = await client.query<{
      id: string;
      start_date: string;
      end_date: string;
      subjects: string[];
      kind: "unit" | "lesson";
      title: string;
      status: string;
    }>(
      `SELECT id,
              to_char(start_date, 'YYYY-MM-DD') AS start_date,
              to_char(end_date, 'YYYY-MM-DD') AS end_date,
              subjects,
              kind,
              title,
              status
         FROM public.calendar_blocks
        WHERE class_id = $1
        ORDER BY start_date ASC, created_at ASC`,
      [cls.id],
    );

    const blocks: RoomCalendarBlock[] = blocksRes.rows.map((b) => ({
      id: b.id,
      startDate: b.start_date,
      endDate: b.end_date,
      subjects: b.subjects,
      kind: b.kind,
      title: b.title,
      status: b.status,
      assignment: {},
    }));

    const tokensRes = await client.query<{
      calendar_block_id: string;
      payload: { blocks?: { id: string; title: string; type?: string; role?: string; durationSec?: number }[] };
    }>(
      `SELECT t.calendar_block_id, t.payload
         FROM public.student_path_tokens t
         JOIN public.calendar_blocks b ON b.id = t.calendar_block_id
        WHERE b.class_id = $1`,
      [cls.id],
    );

    const pathSessionsRes = await client.query<{
      student_id: string;
      calendar_block_id: string;
      progress: { blockMs?: Record<string, number> };
    }>(
      `SELECT s.student_id, t.calendar_block_id, s.progress
         FROM public.student_path_sessions s
         JOIN public.student_path_tokens t ON t.id = s.path_token_id
         JOIN public.calendar_blocks b ON b.id = t.calendar_block_id
        WHERE b.class_id = $1`,
      [cls.id],
    );

    const eventsRes = await client.query<{
      student_id: string;
      block_id: string;
      subject: string;
      duration_sec: number;
      status: string;
    }>(
      `SELECT e.student_id, e.block_id, e.subject, e.duration_sec, e.status
         FROM public.block_events e
         JOIN public.students s ON s.id = e.student_id
        WHERE s.class_id = $1
        ORDER BY e.created_at ASC`,
      [cls.id],
    );

    const baseStudents = studentsRes.rows.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      packId: s.pack_id ?? packs[0]?.id ?? "pack_space",
      version: Number(s.version),
    }));

    const sessions = buildPaceSessions({
      students: baseStudents,
      blocks,
      tokens: tokensRes.rows.map((t) => ({
        calendarBlockId: t.calendar_block_id,
        blocks: Array.isArray(t.payload?.blocks) ? t.payload.blocks : [],
      })),
      pathSessions: pathSessionsRes.rows.map((ps) => ({
        studentId: ps.student_id,
        calendarBlockId: ps.calendar_block_id,
        blockMs: ps.progress?.blockMs ?? {},
      })),
      blockEvents: eventsRes.rows.map((e) => ({
        studentId: e.student_id,
        blockId: e.block_id,
        durationSec: e.duration_sec,
        status: e.status,
      })),
    });

    const activeLessonTitle =
      blocks.find((b) => b.kind === "lesson")?.title ?? null;

    const students: RoomStudent[] = baseStudents.map((stu) => {
      const session = sessions.find((s) => s.studentId === stu.id);
      const stuEvents = eventsRes.rows.filter((e) => e.student_id === stu.id);
      const paceBand: PaceBand = session
        ? sessionBand(session).band
        : "on";

      const subjectBands: Record<string, PaceBand> = {};
      for (const subj of ["math", "ela"]) {
        const subEv = stuEvents.filter((e) => e.subject === subj);
        if (subEv.some((e) => e.status === "struggling")) {
          subjectBands[subj] = "behind";
        } else if (subEv.some((e) => e.status === "completed")) {
          subjectBands[subj] = "ahead";
        } else {
          subjectBands[subj] = paceBand;
        }
      }

      return {
        ...stu,
        paceBand,
        subjectBands,
        currentLessonTitle: activeLessonTitle,
      };
    });

    return {
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      packs,
      students,
      blocks,
      sessions,
    };
  });
}

export async function moveStudentGroup(payload: MoveStudentPayload): Promise<number> {
  return withTeacherDb(async (client) => {
    const res = await client.query<{ version: number }>(
      `SELECT public.move_student_group($1::uuid, $2::text, $3::integer) AS version`,
      [payload.studentId, payload.toPackId, payload.expectedVersion],
    );
    return Number(res.rows[0]?.version ?? payload.expectedVersion);
  });
}
