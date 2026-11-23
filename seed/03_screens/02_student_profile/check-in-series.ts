import type { CheckInPoint } from "./profile-fixture";

function dayNum(day: string): number {
  const n = Number(day.replace("Day ", ""));
  return Number.isFinite(n) ? n : 0;
}

export interface CheckInRow {
  date: Date;
  day: string;
  dateText: string;
  /** Plotted y: 1 - value, so calm (0) sits at the top and distressed (1) at the bottom. */
  am: number | null;
  pm: number | null;
  amLabel: string | null;
  pmLabel: string | null;
}

export interface CheckInHit {
  date: Date;
  y: number;
  slot: "am" | "pm";
  point: CheckInPoint;
}

/**
 * Build bklit chart rows and hit targets from raw check-in points.
 *
 * The y-axis is flipped by plotting `1 - value`: calm renders high next to the
 * mint end of the mood rail, distressed renders low next to the coral end.
 * Bklit's time-based x-axis needs real Dates, so days map onto a synthetic
 * week and the day labels ride along on each row for the ticker and tooltip.
 */
export function checkInChartModel(raw: CheckInPoint[]): {
  categories: string[];
  rows: CheckInRow[];
  hits: CheckInHit[];
  points: CheckInPoint[];
} {
  const days = [...new Set(raw.map((point) => point.day))].sort((a, b) => dayNum(a) - dayNum(b));
  const find = (day: string, slot: "am" | "pm") =>
    raw.find((point) => point.day === day && point.slot === slot) ?? null;
  const points = days.flatMap((day) =>
    (["am", "pm"] as const).map((slot) => find(day, slot)).filter((point) => point != null),
  );
  const rows: CheckInRow[] = days.map((day, index) => {
    const am = find(day, "am");
    const pm = find(day, "pm");
    const dateText = am?.date ?? pm?.date ?? "";
    return {
      date: new Date(2026, 9, 26 + index),
      day,
      dateText,
      am: am == null ? null : 1 - am.value,
      pm: pm == null ? null : 1 - pm.value,
      amLabel: am?.label ?? null,
      pmLabel: pm?.label ?? null,
    };
  });
  const hits: CheckInHit[] = points.flatMap((point) => {
    const index = days.indexOf(point.day);
    if (index < 0) return [];
    return [{
      date: rows[index].date,
      y: 1 - point.value,
      slot: point.slot,
      point,
    }];
  });
  return { categories: days, rows, hits, points };
}

export function hitLabel(hit: CheckInHit): string {
  return `${hit.point.day} · ${hit.point.date} · ${hit.slot} · ${hit.point.label}`;
}
