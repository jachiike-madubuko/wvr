import type {
  CollectibleAction,
  CollectibleSlot,
  StudentCollectibleRecord,
} from "@/lib/collectibles/catalog";
import { withAnonDb } from "@/lib/db";
import { hashStudentToken } from "@/lib/security/path-tokens";
import type { RawPathPayload } from "./deck";

export type StudentRosterItem = {
  id: string;
  firstName: string;
};

export type StudentCollectiblesBundle = {
  packId: string;
  items: StudentCollectibleRecord[];
};

export type OpenStudentPathResult = {
  variationId: string;
  payload: RawPathPayload;
  progress: {
    completedBlockIds?: string[];
    blockMs?: Record<string, number>;
  };
  roster: StudentRosterItem[];
  collectiblesByStudent: Record<string, StudentCollectiblesBundle>;
};

export async function openStudentPath(
  plainToken: string,
): Promise<OpenStudentPathResult | null> {
  const trimmed = plainToken.trim();
  if (!trimmed) return null;
  const tokenHash = hashStudentToken(trimmed);

  return withAnonDb(async (client) => {
    const pathRes = await client.query<{
      data: {
        variationId: string;
        payload: RawPathPayload;
        progress: { completedBlockIds?: string[]; blockMs?: Record<string, number> };
      } | null;
    }>(`SELECT public.open_student_path($1) AS data`, [tokenHash]);
    const pathData = pathRes.rows[0]?.data;
    if (!pathData) return null;

    const rosterRes = await client.query<{ roster: StudentRosterItem[] | null }>(
      `SELECT public.open_student_path_roster($1) AS roster`,
      [tokenHash],
    );

    const collectiblesRes = await client.query<{
      collectibles: Record<string, StudentCollectiblesBundle> | null;
    }>(`SELECT public.get_student_collectibles($1, NULL) AS collectibles`, [
      tokenHash,
    ]);

    return {
      variationId: pathData.variationId,
      payload: pathData.payload ?? {},
      progress: pathData.progress ?? {},
      roster: Array.isArray(rosterRes.rows[0]?.roster)
        ? rosterRes.rows[0]!.roster
        : [],
      collectiblesByStudent: collectiblesRes.rows[0]?.collectibles ?? {},
    };
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveStudentPathSession(args: {
  plainToken: string;
  studentId: string;
  progress: unknown;
}): Promise<Record<string, unknown> | null> {
  const trimmed = args.plainToken.trim();
  if (!trimmed || !UUID_RE.test(args.studentId)) return null;
  const tokenHash = hashStudentToken(trimmed);

  return withAnonDb(async (client) => {
    const res = await client.query<{ progress: Record<string, unknown> | null }>(
      `SELECT public.save_student_path_session($1, $2::uuid, $3::jsonb) AS progress`,
      [tokenHash, args.studentId, JSON.stringify(args.progress)],
    );
    return res.rows[0]?.progress ?? null;
  });
}

export async function saveStudentCollectible(args: {
  plainToken: string;
  studentId: string;
  action: CollectibleAction;
  itemId: string;
  slot: CollectibleSlot;
  milestoneId?: string;
  recallNote?: string;
}): Promise<StudentCollectibleRecord[] | null> {
  const trimmed = args.plainToken.trim();
  if (!trimmed || !UUID_RE.test(args.studentId)) return null;
  const tokenHash = hashStudentToken(trimmed);

  return withAnonDb(async (client) => {
    const res = await client.query<{ items: StudentCollectibleRecord[] | null }>(
      `SELECT public.save_student_collectible($1, $2::uuid, $3, $4, $5, $6, $7) AS items`,
      [
        tokenHash,
        args.studentId,
        args.action,
        args.itemId,
        args.slot,
        args.milestoneId ?? null,
        args.recallNote ?? "",
      ],
    );
    return res.rows[0]?.items ?? null;
  });
}
