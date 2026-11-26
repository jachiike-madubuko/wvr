import { recommendedBlockMs } from "@/domain/pace/block-dwell";
import {
  type PaceBand,
  type PacePin,
  type PaceSession,
  sessionBand,
} from "@/domain/pace/pace";
import type { CollectibleSlot, EquippedLoadout } from "@/lib/collectibles/catalog";
import { withTeacherDb } from "@/lib/db";
import { isDemoProfile, type DemoProfile } from "@/lib/demo/seed";
import {
  PACK_COLORS,
  type InterventionStatus,
  type MoveStudentPayload,
  type RoomCalendarBlock,
  type RoomPack,
  type RoomSnapshot,
  type RoomStudent,
} from "@/lib/room/types";

export { PACK_COLORS };

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
  const lessonsWithSessions = new Set(args.pathSessions.map((ps) => ps.calendarBlockId));
  const activeLessons = args.blocks.filter(
    (b) => b.kind === "lesson" && lessonsWithSessions.has(b.id),
  );
  const targetLesson =
    activeLessons.at(-1) ?? args.blocks.filter((b) => b.kind === "lesson").at(-1);
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

  const byStudentBlock = new Map<string, PaceSession>();
  for (const ps of args.pathSessions) {
    const stu = args.students.find((s) => s.id === ps.studentId);
    if (!stu) continue;
    byStudentBlock.set(`${ps.studentId}:${ps.calendarBlockId}`, {
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
    const blockId = targetLesson?.id ?? null;
    const key = `${ev.studentId}:${blockId ?? "none"}`;
    let session = byStudentBlock.get(key);
    if (!session) {
      session = {
        studentId: ev.studentId,
        firstName: stu.firstName,
        calendarBlockId: blockId,
        blockMs: {},
        pins: blockId ? (pinsByBlock.get(blockId) ?? []) : [],
      };
      byStudentBlock.set(key, session);
    }
    const pin = session.pins.find((p) => p.id === ev.blockId);
    const baseMs = Math.max(0, ev.durationSec * 1000);
    const budget = pin ? recommendedBlockMs(pin) : 180_000;
    const effectiveMs =
      ev.status === "struggling" ? Math.max(baseMs, budget * 2) : baseMs;
    session.blockMs[ev.blockId] = Math.max(session.blockMs[ev.blockId] ?? 0, effectiveMs);
  }

  return Array.from(byStudentBlock.values());
}

export async function getRoomSnapshot(): Promise<RoomSnapshot> {
  return withTeacherDb(async (client) => {
    const classRes = await client.query<{
      id: string;
      name: string;
      grade: number;
      demo_profile: string;
    }>(
      `SELECT id, name, grade, demo_profile FROM public.classes ORDER BY created_at ASC LIMIT 1`,
    );
    const cls = classRes.rows[0];
    if (!cls) {
      throw new Error("No class found for teacher");
    }
    const demoProfile: DemoProfile = isDemoProfile(cls.demo_profile)
      ? cls.demo_profile
      : "sales_walkthrough";

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
      is_demo: boolean;
    }>(
      `SELECT s.id, s.first_name, m.pack_id, COALESCE(m.version, 0) AS version, s.is_demo
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
      attempts: number;
      duration_sec: number;
      status: string;
      created_at: Date;
    }>(
      `SELECT e.student_id, e.block_id, e.subject, e.attempts, e.duration_sec, e.status, e.created_at
         FROM public.block_events e
         JOIN public.students s ON s.id = e.student_id
        WHERE s.class_id = $1
        ORDER BY e.created_at ASC`,
      [cls.id],
    );

    const threadsRes = await client.query<{
      student_id: string;
      teacher_approved_at: Date | null;
    }>(
      `SELECT t.student_id, t.teacher_approved_at
         FROM public.student_action_threads t
         JOIN public.students s ON s.id = t.student_id
        WHERE s.class_id = $1 AND t.kind = 'iv'`,
      [cls.id],
    );

    const ivByStudent = new Map<string, { approvedAt: Date | null }>(
      threadsRes.rows.map((r) => [
        r.student_id,
        { approvedAt: r.teacher_approved_at ? new Date(r.teacher_approved_at) : null },
      ]),
    );

    const collectiblesRes = await client.query<{
      student_id: string;
      item_id: string;
      slot: CollectibleSlot;
    }>(
      `SELECT sc.student_id, sc.item_id, sc.slot
         FROM public.student_collectibles sc
         JOIN public.students s ON s.id = sc.student_id
        WHERE s.class_id = $1 AND sc.equipped = true`,
      [cls.id],
    );

    const equippedByStudent = new Map<string, EquippedLoadout>();
    for (const row of collectiblesRes.rows) {
      const loadout = equippedByStudent.get(row.student_id) ?? {};
      loadout[row.slot] = row.item_id;
      equippedByStudent.set(row.student_id, loadout);
    }

    const baseStudents = studentsRes.rows.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      packId: s.pack_id ?? packs[0]?.id ?? "pack_space",
      version: Number(s.version),
      isDemo: Boolean(s.is_demo),
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

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayLessonId =
      blocks.find((b) => b.kind === "lesson" && b.startDate === todayIso)?.id ??
      blocks.filter((b) => b.kind === "lesson" && b.startDate <= todayIso).at(-1)?.id ??
      blocks.filter((b) => b.kind === "lesson").at(-1)?.id ??
      null;

    const students: RoomStudent[] = baseStudents.map((stu) => {
      const session =
        (todayLessonId
          ? sessions.find((s) => s.studentId === stu.id && s.calendarBlockId === todayLessonId)
          : undefined) ?? sessions.find((s) => s.studentId === stu.id);
      const stuEvents = eventsRes.rows.filter((e) => e.student_id === stu.id);
      const ivRow = ivByStudent.get(stu.id);
      const struggleEvents = stuEvents.filter((e) => e.status === "struggling");
      const latestStruggleMs = struggleEvents.reduce(
        (max, e) => Math.max(max, new Date(e.created_at).getTime()),
        0,
      );
      const ivResolved =
        Boolean(ivRow?.approvedAt) &&
        (latestStruggleMs === 0 || ivRow!.approvedAt!.getTime() >= latestStruggleMs);

      const interventionStatus: InterventionStatus = ivResolved
        ? "resolved"
        : ivRow || struggleEvents.length > 0
          ? "pending"
          : "none";

      let paceBand: PaceBand = session ? sessionBand(session).band : "on";
      if (paceBand === "behind" && ivResolved && struggleEvents.length <= 1) {
        paceBand = "on";
      }

      const subjectBands: Record<string, PaceBand> = {};
      const subjectWeeks: Record<string, number> = {};
      for (const subj of ["math", "ela", "science", "social_studies", "art"]) {
        const subEv = stuEvents.filter((e) => e.subject === subj);
        const struggles = subEv.filter((e) => e.status === "struggling");
        const completed = subEv.filter((e) => e.status === "completed");
        if (struggles.length > 0) {
          const severe =
            struggles.length >= 2 || struggles.some((e) => e.duration_sec >= 360);
          const rawWeek = severe ? -2 : -1;
          const adjustedWeek = ivResolved ? Math.min(0, rawWeek + 1) : rawWeek;
          subjectWeeks[subj] = adjustedWeek;
          subjectBands[subj] = adjustedWeek < 0 ? "behind" : "on";
        } else if (completed.length > 0) {
          const fast = completed.filter(
            (e) => e.attempts <= 1 && e.duration_sec <= 90,
          );
          if (fast.length > 0) {
            subjectBands[subj] = "ahead";
            subjectWeeks[subj] = fast.length >= 2 ? 2 : 1;
          } else {
            subjectBands[subj] = "on";
            subjectWeeks[subj] = 0;
          }
        } else {
          subjectBands[subj] = paceBand;
          subjectWeeks[subj] =
            paceBand === "behind" ? -1 : paceBand === "ahead" ? 1 : 0;
        }
      }

      const rawCredits = stuEvents.reduce((sum, e) => {
        if (e.status === "struggling") return sum + 1;
        if (e.status === "completed" && e.attempts <= 1 && e.duration_sec <= 90) {
          return sum + 6;
        }
        return sum + 3;
      }, 0);
      const creditsEarned = rawCredits + (ivResolved ? 5 : 0);
      const creditTarget =
        paceBand === "ahead" ? 30 : paceBand === "behind" ? 20 : 15;

      return {
        ...stu,
        paceBand,
        subjectBands,
        subjectWeeks,
        currentLessonTitle: activeLessonTitle,
        equipped: equippedByStudent.get(stu.id) ?? {},
        interventionStatus,
        creditsEarned,
        creditTarget,
      };
    });

    const demoStudentCount = students.filter((s) => s.isDemo).length;
    const realStudentCount = students.length - demoStudentCount;

    return {
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      demoProfile,
      hasDemoData: demoStudentCount > 0 || blocks.length > 0,
      demoStudentCount,
      realStudentCount,
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
