// One typed config module for tunable alert and demo simulation values (Phase 4 AD-5).
// No magic numbers in components.
export const weaverConfig = {
  alerts: {
    idleSec: 60,
    fastSec: 15,
    overTimeSec: 200, // matches the Mastery chart's "slow" threshold
    highAttempts: 3, // matches the Mastery chart's "≥3 attempts" threshold
    latencyTargetMs: 5000,
    fastStudentNotice: true, // Phase 4 open item 8
  },
  demoSimulation: {
    // Jah's confirmed default example ("maybe 10 attempts on the math", Nov 26).
    // Not a threshold: the simulator always writes at least alerts.highAttempts.
    strugglingExampleAttempts: 10,
    strugglingSubject: "math" as const,
  },
} as const;

export type AlertsConfig = {
  readonly idleSec: number;
  readonly fastSec: number;
  readonly overTimeSec: number;
  readonly highAttempts: number;
  readonly latencyTargetMs: number;
  readonly fastStudentNotice: boolean;
};

export type DemoSimulationConfig = {
  readonly strugglingExampleAttempts: number;
  readonly strugglingSubject: string;
};

export function isStruggleEvent(
  ev: { status: string; attempts: number; durationSec: number },
  cfg: Pick<AlertsConfig, "highAttempts" | "overTimeSec"> = weaverConfig.alerts,
): boolean {
  return (
    ev.status === "struggling" ||
    ev.attempts >= cfg.highAttempts ||
    ev.durationSec > cfg.overTimeSec
  );
}
