import {
  weaverConfig,
  type AlertsConfig,
  type DemoSimulationConfig,
} from "@/domain/config/weaver-config";
import type { Queryable } from "@/lib/demo/seed";
import { assertAllowedPayload } from "@/lib/events/allowlist";
import { hashStudentToken } from "@/lib/security/path-tokens";
import { buildMosaicDeck, type RawPathPayload } from "@/lib/student-path/deck";

export type SimKind = "fast" | "struggling";
export type BlockSubject =
  | "hook"
  | "math"
  | "ela"
  | "science"
  | "social_studies"
  | "art";

export type SimBlock = {
  blockId: string;
  subject: BlockSubject;
};

export type SimEvent = {
  blockId: string;
  subject: BlockSubject;
  attempts: number;
  durationSec: number;
  status: "completed" | "struggling";
  errorLog: string[];
  secondsAgo: number; // created_at = now() - secondsAgo, oldest first
};

const VALID_SUBJECTS = new Set<string>([
  "hook",
  "math",
  "ela",
  "science",
  "social_studies",
  "art",
]);

export function generateSimulation(
  kind: SimKind,
  blocks: SimBlock[],
  cfg: {
    alerts: Pick<AlertsConfig, "fastSec" | "highAttempts" | "overTimeSec" | "idleSec">;
    demoSimulation: DemoSimulationConfig;
  } = weaverConfig,
): SimEvent[] {
  if (blocks.length === 0) return [];
  const { alerts, demoSimulation } = cfg;

  if (kind === "fast") {
    // Completes every block quickly: under alerts.fastSec, first try.
    const dur = Math.max(3, alerts.fastSec - 5);
    return blocks.map((b, i) => ({
      ...b,
      attempts: 1,
      durationSec: dur,
      status: "completed",
      errorLog: [],
      secondsAgo: (blocks.length - i) * (dur + 2),
    }));
  }

  // Struggling: high attempts without getting it right on math (default 10, never below alerts.highAttempts).
  const attempts = Math.min(
    99,
    Math.max(alerts.highAttempts, demoSimulation.strugglingExampleAttempts),
  );
  const targetIdx = blocks.findIndex(
    (b) => b.subject === demoSimulation.strugglingSubject,
  );
  const target = targetIdx >= 0 ? blocks[targetIdx]! : blocks[0]!;
  const before = blocks.slice(0, Math.max(0, targetIdx));
  const gap = alerts.idleSec;

  const events: SimEvent[] = before.map((b, i) => ({
    ...b,
    attempts: 1,
    durationSec: 60,
    status: "completed",
    errorLog: [],
    secondsAgo: (before.length - i) * 70 + alerts.overTimeSec + gap,
  }));

  events.push({
    ...target,
    attempts,
    durationSec: alerts.overTimeSec + 40,
    status: "struggling",
    errorLog: ["Simulated: repeated wrong answers"], // fixed label, never user free text
    secondsAgo: 1,
  });

  return events;
}

export type SimulationResult = {
  inserted: number;
  kind: SimKind;
  studentId: string;
  completedBlockIds: string[];
};

export async function runDemoSimulation(
  client: Queryable,
  args: {
    kind: SimKind;
    studentId: string;
    plainToken: string;
    teacherId: string;
  },
): Promise<SimulationResult> {
  const tokenHash = hashStudentToken(args.plainToken.trim());
  const checkRes = await client.query<{
    ok: boolean;
    token_id: string;
    payload: RawPathPayload;
    org_id: string | null;
  }>(
    `SELECT (s.is_demo AND t.is_demo AND cb.class_id = s.class_id) AS ok,
            t.id AS token_id,
            t.payload,
            c.org_id
       FROM public.students s
       JOIN public.classes c ON c.id = s.class_id
       JOIN public.student_path_tokens t ON t.token_hash = $2
       JOIN public.calendar_blocks cb ON cb.id = t.calendar_block_id
      WHERE s.id = $1::uuid`,
    [args.studentId, tokenHash],
  );

  const row = checkRes.rows[0];
  if (!row?.ok) {
    throw new Error("SIMULATION_NOT_DEMO");
  }

  const deck = buildMosaicDeck(row.payload ?? {});
  const simBlocks: SimBlock[] = deck
    .filter((b) => VALID_SUBJECTS.has(b.subject))
    .map((b) => ({ blockId: b.id, subject: b.subject as BlockSubject }));

  const events = generateSimulation(args.kind, simBlocks);
  if (events.length === 0) {
    return {
      inserted: 0,
      kind: args.kind,
      studentId: args.studentId,
      completedBlockIds: [],
    };
  }

  await client.query(
    `INSERT INTO public.block_events
       (org_id, student_id, block_id, subject, attempts, duration_sec, status, error_log, created_at, is_demo)
     SELECT $1::uuid, $2::uuid, u.block_id, u.subject, u.attempts, u.duration_sec, u.status, u.error_log,
            now() - make_interval(secs => u.secs_ago), true
       FROM unnest($3::text[], $4::text[], $5::int[], $6::int[], $7::text[], $8::jsonb[], $9::int[])
         AS u(block_id, subject, attempts, duration_sec, status, error_log, secs_ago)`,
    [
      row.org_id,
      args.studentId,
      events.map((e) => e.blockId),
      events.map((e) => e.subject),
      events.map((e) => e.attempts),
      events.map((e) => e.durationSec),
      events.map((e) => e.status),
      events.map((e) => JSON.stringify(e.errorLog)),
      events.map((e) => e.secondsAgo),
    ],
  );

  // Also reflect simulated pace in student_path_sessions (is_demo = true)
  const completedBlockIds = events
    .filter((e) => e.status === "completed")
    .map((e) => e.blockId);
  const blockMs: Record<string, number> = {};
  for (const e of events) {
    blockMs[e.blockId] =
      e.status === "struggling"
        ? Math.max(e.durationSec * 1000, 960_000)
        : e.durationSec * 1000;
  }

  await client.query(
    `INSERT INTO public.student_path_sessions (path_token_id, student_id, progress, is_demo)
     VALUES ($1::uuid, $2::uuid, $3::jsonb, true)
     ON CONFLICT (path_token_id, student_id) DO UPDATE
       SET progress = excluded.progress,
           is_demo = true`,
    [
      row.token_id,
      args.studentId,
      JSON.stringify({ completedBlockIds, blockMs }),
    ],
  );

  const eventPayload = {
    studentId: args.studentId,
    kind: args.kind,
    events: events.length,
  };
  assertAllowedPayload("demo.simulation_run", eventPayload);

  await client.query(
    `INSERT INTO public.events (teacher_id, org_id, name, payload, is_demo)
     VALUES ($1::uuid, $2::uuid, 'demo.simulation_run', $3::jsonb, true)`,
    [args.teacherId, row.org_id, JSON.stringify(eventPayload)],
  );

  return {
    inserted: events.length,
    kind: args.kind,
    studentId: args.studentId,
    completedBlockIds,
  };
}
