import { withUnpooledAdminDb } from "@/lib/db";
import { assertSafeDemoEnv } from "@/lib/demo/seed";
import { hashStudentToken } from "@/lib/security/path-tokens";

export type DemoSimulationContext = {
  enabled: boolean;
  demoStudentIds: string[];
};

export async function getDemoSimulationContext(
  plainToken: string,
): Promise<DemoSimulationContext> {
  const trimmed = plainToken.trim();
  if (!trimmed) return { enabled: false, demoStudentIds: [] };

  let directUrl: string;
  try {
    directUrl = assertSafeDemoEnv(process.env).directUrl;
  } catch {
    return { enabled: false, demoStudentIds: [] };
  }

  try {
    return await withUnpooledAdminDb(async (client) => {
      const res = await client.query<{
        token_is_demo: boolean;
        demo_student_ids: string[] | null;
      }>(
        `SELECT t.is_demo AS token_is_demo,
                (SELECT array_agg(s.id)
                   FROM public.students s
                  WHERE s.class_id = cb.class_id
                    AND s.is_demo = true) AS demo_student_ids
           FROM public.student_path_tokens t
           JOIN public.calendar_blocks cb ON cb.id = t.calendar_block_id
          WHERE t.token_hash = $1
            AND t.expires_at > now()`,
        [hashStudentToken(trimmed)],
      );
      const row = res.rows[0];
      const ids = Array.isArray(row?.demo_student_ids)
        ? row.demo_student_ids
        : [];
      return {
        enabled: Boolean(row?.token_is_demo && ids.length > 0),
        demoStudentIds: row?.token_is_demo ? ids : [],
      };
    }, directUrl);
  } catch {
    return { enabled: false, demoStudentIds: [] };
  }
}

export async function isDemoSimulationEnabled(
  plainToken: string,
): Promise<boolean> {
  return (await getDemoSimulationContext(plainToken)).enabled;
}
