import type { CollectibleSlot, EquippedLoadout } from "@/lib/collectibles/catalog";
import { withTeacherDb } from "@/lib/db";
import {
  buildOfflineCoachingPlan,
  buildWeaverWheel,
  type ActionThreadMessage,
  type ActionThreadRecord,
  type ApprovedOfflinePlan,
  type BlockEventRecord,
  type SelCheckIn,
  type StudentProfileSnapshot,
  type ThreadRequest,
} from "./model";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getStudentProfile(
  studentId: string,
): Promise<StudentProfileSnapshot | null> {
  if (!isValidUuid(studentId)) return null;

  return withTeacherDb(async (client) => {
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

    const wheelRes = await client.query<{ item_id: string; option_id: string }>(
      `SELECT item_id, option_id
         FROM public.student_wheel_answers
        WHERE student_id = $1::uuid`,
      [studentId],
    );

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

    return {
      studentId: stu.id,
      firstName: stu.first_name,
      className: stu.class_name,
      packId: stu.pack_id ?? "pack_space",
      packLabel: stu.pack_label ?? "Space",
      equipped,
      zones: buildWeaverWheel(
        wheelRes.rows.map((w) => ({ itemId: w.item_id, optionId: w.option_id })),
      ),
      checkins,
      events,
      selThread: parseThread("sel"),
      ivThread: parseThread("iv"),
      currentPathToken: "demo-space-lesson",
    };
  });
}

export async function saveStudentThread(
  studentId: string,
  req: ThreadRequest,
): Promise<ActionThreadRecord | null> {
  if (!isValidUuid(studentId)) return null;

  return withTeacherDb(async (client) => {
    const stuRes = await client.query<{ first_name: string }>(
      `SELECT first_name FROM public.students WHERE id = $1::uuid`,
      [studentId],
    );
    const firstName = stuRes.rows[0]?.first_name;
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
        `INSERT INTO public.student_action_threads (student_id, kind, messages)
         VALUES ($1::uuid, 'sel', $2::jsonb)
         ON CONFLICT (student_id, kind) DO UPDATE
           SET messages = excluded.messages`,
        [studentId, JSON.stringify(nextMessages)],
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
         (student_id, kind, messages, approved_plan, teacher_approved_at)
       VALUES ($1::uuid, 'iv', $2::jsonb, $3::jsonb, $4::timestamptz)
       ON CONFLICT (student_id, kind) DO UPDATE
         SET messages = excluded.messages,
             approved_plan = excluded.approved_plan,
             teacher_approved_at = excluded.teacher_approved_at`,
      [studentId, JSON.stringify(nextMessages), JSON.stringify(plan), approvedAt],
    );

    return {
      kind: "iv",
      messages: nextMessages,
      approvedPlan: plan,
      teacherApprovedAt: approvedAt,
    };
  });
}
