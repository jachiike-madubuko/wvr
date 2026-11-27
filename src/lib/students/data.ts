import type { CollectibleSlot, EquippedLoadout } from "@/lib/collectibles/catalog";
import { withTeacherDb } from "@/lib/db";
import {
  buildOfflineCoachingPlan,
  type ActionThreadMessage,
  type ActionThreadRecord,
  type ApprovedOfflinePlan,
  type BlockEventRecord,
  type SelCheckIn,
  type StudentProfileSnapshot,
  type ThreadRequest,
} from "./model";
import {
  WHEEL_COLUMNS,
  WHEEL_DIMENSIONS,
  parseWheelScores,
  type WheelLoad,
  type WheelRecord,
  type WheelScores,
} from "./wheel";

export class WheelVersionConflict extends Error {
  constructor() {
    super("VERSION_CONFLICT");
    this.name = "WheelVersionConflict";
  }
}

const WHEEL_COLS = WHEEL_DIMENSIONS.map((d) => WHEEL_COLUMNS[d]);
const WHEEL_RET = `${WHEEL_COLS.join(", ")}, updated_at, version`;

function rowToWheelRecord(row: Record<string, unknown>): WheelRecord {
  const scores = parseWheelScores(
    Object.fromEntries(
      WHEEL_DIMENSIONS.map((d) => [d, row[WHEEL_COLUMNS[d]] ?? null]),
    ),
  );
  if (!scores) throw new Error("WHEEL_BAD_VALUE"); // fail closed
  const updatedAt =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : String(row.updated_at);
  return {
    scores,
    updatedAt,
    version: Number(row.version),
    setByYou: Boolean(row.set_by_you),
  };
}

export async function getWheelScores(
  studentId: string,
): Promise<WheelRecord | null | "not_found"> {
  if (!isValidUuid(studentId)) return "not_found";
  return withTeacherDb(async (c) => {
    const stu = await c.query(
      `SELECT 1 FROM public.students WHERE id = $1::uuid`,
      [studentId],
    );
    if (stu.rowCount === 0) return "not_found";
    const r = await c.query(
      `SELECT ${WHEEL_RET}, set_by_teacher_id = public.current_teacher_id() AS set_by_you
         FROM public.student_wheel_scores
        WHERE student_id = $1::uuid`,
      [studentId],
    );
    return r.rows[0] ? rowToWheelRecord(r.rows[0]) : null;
  });
}

export async function saveWheelScores(
  studentId: string,
  req: { scores: WheelScores; expectedVersion: number | null },
): Promise<WheelRecord | null> {
  if (!isValidUuid(studentId)) return null;
  return withTeacherDb(async (c) => {
    const stu = await c.query<{ is_demo: boolean }>(
      `SELECT is_demo FROM public.students WHERE id = $1::uuid`,
      [studentId],
    );
    if (!stu.rows[0]) return null;
    const vals = WHEEL_DIMENSIONS.map((d) => req.scores[d]);
    const res =
      req.expectedVersion === null
        ? await c.query(
            `INSERT INTO public.student_wheel_scores (student_id, ${WHEEL_COLS.join(", ")}, is_demo)
             VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (student_id) DO NOTHING
             RETURNING ${WHEEL_RET}, true AS set_by_you`,
            [studentId, ...vals, stu.rows[0].is_demo],
          )
        : await c.query(
            `UPDATE public.student_wheel_scores
                SET ${WHEEL_COLS.map((col, i) => `${col} = $${i + 2}`).join(", ")},
                    set_by_teacher_id = public.current_teacher_id(),
                    version = version + 1
              WHERE student_id = $1::uuid AND version = $7
              RETURNING ${WHEEL_RET}, true AS set_by_you`,
            [studentId, ...vals, req.expectedVersion],
          );
    if (res.rowCount === 0) throw new WheelVersionConflict();
    await c.query(
      `INSERT INTO public.events (teacher_id, name, payload, is_demo)
       VALUES (public.current_teacher_id(), 'student.wheel_updated', $1::jsonb, $2)`,
      [
        JSON.stringify({
          studentId,
          setCount: vals.filter((v) => v !== null).length,
        }),
        stu.rows[0].is_demo,
      ],
    );
    return rowToWheelRecord(res.rows[0]);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getStudentProfile(
  studentId: string,
): Promise<StudentProfileSnapshot | null> {
  if (!isValidUuid(studentId)) return null;

  const profile = await withTeacherDb(async (client) => {
    const stuRes = await client.query<{
      id: string;
      first_name: string;
      class_name: string;
      pack_id: string | null;
      pack_label: string | null;
    }>(
      `SELECT s.id, s.first_name, c.name AS class_name,
              m.pack_id, p.label AS pack_label
         FROM public.students s
         JOIN public.classes c ON c.id = s.class_id
         LEFT JOIN public.group_memberships m ON m.student_id = s.id
         LEFT JOIN public.context_packs p ON p.id = m.pack_id
        WHERE s.id = $1::uuid`,
      [studentId],
    );
    const stu = stuRes.rows[0];
    if (!stu) return null;

    const checkinRes = await client.query<{
      checkin_date: string;
      period: "am" | "pm";
      mood: string;
      level: number;
      teacher_note: string;
    }>(
      `SELECT to_char(checkin_date, 'YYYY-MM-DD') AS checkin_date,
              period, mood, level, teacher_note
         FROM public.student_sel_checkins
        WHERE student_id = $1::uuid
        ORDER BY checkin_date ASC, period ASC`,
      [studentId],
    );

    const eventRes = await client.query<{
      id: string;
      block_id: string;
      subject: string;
      attempts: number;
      duration_sec: number;
      status: "completed" | "struggling" | "abandoned";
      error_log: unknown;
      created_at: Date;
    }>(
      `SELECT id, block_id, subject, attempts, duration_sec, status, error_log, created_at
         FROM public.block_events
        WHERE student_id = $1::uuid
        ORDER BY created_at ASC`,
      [studentId],
    );

    const threadRes = await client.query<{
      kind: "sel" | "iv";
      messages: unknown;
      approved_plan: unknown;
      teacher_approved_at: Date | null;
    }>(
      `SELECT kind, messages, approved_plan, teacher_approved_at
         FROM public.student_action_threads
        WHERE student_id = $1::uuid`,
      [studentId],
    );

    const collectiblesRes = await client.query<{
      item_id: string;
      slot: CollectibleSlot;
    }>(
      `SELECT item_id, slot
         FROM public.student_collectibles
        WHERE student_id = $1::uuid AND equipped = true`,
      [studentId],
    );

    const equipped: EquippedLoadout = {};
    for (const row of collectiblesRes.rows) {
      equipped[row.slot] = row.item_id;
    }

    const checkins: SelCheckIn[] = checkinRes.rows.map((c) => ({
      date: c.checkin_date,
      period: c.period,
      mood: c.mood,
      level: Number(c.level),
      teacherNote: c.teacher_note,
    }));

    const events: BlockEventRecord[] = eventRes.rows.map((e) => ({
      id: e.id,
      blockId: e.block_id,
      subject: e.subject,
      attempts: Number(e.attempts),
      durationSec: Number(e.duration_sec),
      status: e.status,
      errorLog: Array.isArray(e.error_log) ? e.error_log.map(String) : [],
      createdAt:
        e.created_at instanceof Date
          ? e.created_at.toISOString()
          : String(e.created_at),
    }));

    const parseThread = (kind: "sel" | "iv"): ActionThreadRecord | null => {
      const row = threadRes.rows.find((t) => t.kind === kind);
      if (!row) return null;
      const messages = Array.isArray(row.messages)
        ? (row.messages as ActionThreadMessage[])
        : [];
      const plan =
        row.approved_plan && typeof row.approved_plan === "object"
          ? (row.approved_plan as ApprovedOfflinePlan)
          : null;
      return {
        kind,
        messages,
        approvedPlan: plan,
        teacherApprovedAt: row.teacher_approved_at
          ? new Date(row.teacher_approved_at).toISOString()
          : null,
      };
    };

    let wheel: WheelLoad;
    await client.query("SAVEPOINT wheel_load");
    try {
      const wRes = await client.query(
        `SELECT ${WHEEL_RET}, set_by_teacher_id = public.current_teacher_id() AS set_by_you
           FROM public.student_wheel_scores
          WHERE student_id = $1::uuid`,
        [studentId],
      );
      await client.query("RELEASE SAVEPOINT wheel_load");
      wheel = {
        status: "ok",
        wheel: wRes.rows[0] ? rowToWheelRecord(wRes.rows[0]) : null,
      };
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT wheel_load").catch(() => {});
      wheel = { status: "error" };
    }

    return {
      studentId: stu.id,
      firstName: stu.first_name,
      className: stu.class_name,
      packId: stu.pack_id ?? "pack_space",
      packLabel: stu.pack_label ?? "Space",
      equipped,
      wheel,
      checkins,
      events,
      selThread: parseThread("sel"),
      ivThread: parseThread("iv"),
      currentPathToken: "demo-space-lesson",
    };
  });

  return profile;
}

export async function saveStudentThread(
  studentId: string,
  req: ThreadRequest,
): Promise<ActionThreadRecord | null> {
  if (!isValidUuid(studentId)) return null;

  return withTeacherDb(async (client) => {
    const stuRes = await client.query<{ first_name: string; is_demo: boolean }>(
      `SELECT first_name, is_demo FROM public.students WHERE id = $1::uuid`,
      [studentId],
    );
    const firstName = stuRes.rows[0]?.first_name;
    const isDemo = Boolean(stuRes.rows[0]?.is_demo);
    if (!firstName) return null;

    const existingRes = await client.query<{
      messages: unknown;
      approved_plan: unknown;
      teacher_approved_at: Date | null;
    }>(
      `SELECT messages, approved_plan, teacher_approved_at
         FROM public.student_action_threads
        WHERE student_id = $1::uuid AND kind = $2`,
      [studentId, req.kind],
    );
    const existing = existingRes.rows[0];
    const priorMessages: ActionThreadMessage[] = Array.isArray(existing?.messages)
      ? (existing.messages as ActionThreadMessage[])
      : [];

    if (req.kind === "sel") {
      const nextMessages: ActionThreadMessage[] = [
        ...priorMessages,
        { role: "teacher", text: req.message },
        {
          role: "assistant",
          text: `Noted for ${firstName}. Try a calm 30-second door check-in tomorrow morning before blocks start.`,
        },
      ];
      await client.query(
        `INSERT INTO public.student_action_threads (student_id, kind, messages, is_demo)
         VALUES ($1::uuid, 'sel', $2::jsonb, $3)
         ON CONFLICT (student_id, kind) DO UPDATE
           SET messages = excluded.messages`,
        [studentId, JSON.stringify(nextMessages), isDemo],
      );
      await client.query(
        `INSERT INTO public.events (teacher_id, name, payload, is_demo)
         VALUES (public.current_teacher_id(), 'student.sel_note', $1::jsonb, $2)`,
        [JSON.stringify({ studentId }), isDemo],
      );
      return {
        kind: "sel",
        messages: nextMessages,
        approvedPlan: null,
        teacherApprovedAt: null,
      };
    }

    const plan = buildOfflineCoachingPlan({
      firstName,
      misconception: req.misconception || "unequal parts",
      guidance: req.guidance,
    });
    const nextMessages: ActionThreadMessage[] = [
      {
        role: "assistant",
        text: `Offline 3-step manipulative plan prepared for ${firstName} (${plan.misconception}).`,
      },
    ];
    const approvedAt = req.action === "approve" ? new Date().toISOString() : null;

    await client.query(
      `INSERT INTO public.student_action_threads
         (student_id, kind, messages, approved_plan, teacher_approved_at, is_demo)
       VALUES ($1::uuid, 'iv', $2::jsonb, $3::jsonb, $4::timestamptz, $5)
       ON CONFLICT (student_id, kind) DO UPDATE
         SET messages = excluded.messages,
             approved_plan = excluded.approved_plan,
             teacher_approved_at = excluded.teacher_approved_at`,
      [studentId, JSON.stringify(nextMessages), JSON.stringify(plan), approvedAt, isDemo],
    );
    if (req.action === "approve") {
      await client.query(
        `INSERT INTO public.events (teacher_id, name, payload, is_demo)
         VALUES (public.current_teacher_id(), 'student.intervention_resolved', $1::jsonb, $2)`,
        [JSON.stringify({ studentId, misconception: plan.misconception }), isDemo],
      );
    }

    return {
      kind: "iv",
      messages: nextMessages,
      approvedPlan: plan,
      teacherApprovedAt: approvedAt,
    };
  });
}
