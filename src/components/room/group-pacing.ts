import type { PaceBand } from "@/domain/pace/pace";

export type GroupPacingStudentInput = {
  id: string;
  firstName: string;
  packId: string;
  paceBand: PaceBand;
  subjectWeeks?: Record<string, number>;
};

export type GroupPacingStudentRow = {
  id: string;
  firstName: string;
  band: PaceBand;
  worstSubject: string | null;
  worstWeeks: number;
};

export type GroupPacing = {
  packId: string;
  total: number;
  counts: Record<PaceBand, number>;
  percents: Record<PaceBand, number>;
  students: GroupPacingStudentRow[];
};

const BAND_RANK: Record<PaceBand, number> = {
  behind: 0,
  on: 1,
  ahead: 2,
};

export function groupPacing(
  students: GroupPacingStudentInput[],
  packId: string,
): GroupPacing {
  const members = students.filter((s) => s.packId === packId);
  const counts: Record<PaceBand, number> = { ahead: 0, on: 0, behind: 0 };
  for (const s of members) counts[s.paceBand] += 1;

  const pct = (n: number) =>
    members.length ? Math.round((n / members.length) * 100) : 0;

  const rows: GroupPacingStudentRow[] = members
    .map((s) => {
      const entries = Object.entries(s.subjectWeeks ?? {});
      const [worstSubject, worstWeeks] = entries.reduce<[string | null, number]>(
        (acc, [subj, w]) =>
          acc[0] === null || w < acc[1] ? [subj, w] : acc,
        [null, 0],
      );
      return {
        id: s.id,
        firstName: s.firstName,
        band: s.paceBand,
        worstSubject,
        worstWeeks,
      };
    })
    .sort((a, b) => {
      if (a.worstWeeks !== b.worstWeeks) return a.worstWeeks - b.worstWeeks;
      if (BAND_RANK[a.band] !== BAND_RANK[b.band]) {
        return BAND_RANK[a.band] - BAND_RANK[b.band];
      }
      return a.firstName.localeCompare(b.firstName);
    });

  return {
    packId,
    total: members.length,
    counts,
    percents: {
      ahead: pct(counts.ahead),
      on: pct(counts.on),
      behind: pct(counts.behind),
    },
    students: rows,
  };
}
