import { weaverConfig, type AlertsConfig } from "@/domain/config/weaver-config";

export type BlockEventLite = {
  id: string;
  attempts: number;
  durationSec: number;
  status: string;
  createdAt: string;
};

export type StudentAlert =
  | { kind: "high_attempts" | "over_time"; blockEventId: string; detail: string }
  | { kind: "fast_student"; blockEventId: string; detail: string };

/**
 * Minimal Phase 4 WP-E2 rules slice driven by weaver-config alerts.*.
 * Evaluates most-recent unaddressed events: high_attempts -> over_time -> fast_student.
 */
export function evaluateStudent(
  events: BlockEventLite[],
  cfg: AlertsConfig = weaverConfig.alerts,
): StudentAlert | null {
  if (events.length === 0) return null;

  const recent = [...events].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const struggle = recent.find((e) => e.attempts >= cfg.highAttempts);
  if (struggle) {
    return {
      kind: "high_attempts",
      blockEventId: struggle.id,
      detail: `${struggle.attempts} tries`,
    };
  }

  const slow = recent.find((e) => e.durationSec >= cfg.overTimeSec);
  if (slow) {
    return {
      kind: "over_time",
      blockEventId: slow.id,
      detail: `${Math.max(1, Math.round(slow.durationSec / 60))} min`,
    };
  }

  if (cfg.fastStudentNotice) {
    const lastFew = recent.slice(0, 3);
    if (
      lastFew.length === 3 &&
      lastFew.every((e) => e.attempts === 1 && e.durationSec < cfg.fastSec)
    ) {
      return {
        kind: "fast_student",
        blockEventId: lastFew[0]!.id,
        detail: "Ready for more",
      };
    }
  }

  return null;
}
