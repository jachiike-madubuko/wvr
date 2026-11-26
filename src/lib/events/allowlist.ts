export const EVENT_PAYLOAD_KEYS = {
  "student.block_submitted": ["studentId", "blockId", "attempts", "durationSec"],
  "demo.simulation_run": ["studentId", "kind", "events"],
} as const satisfies Record<string, readonly string[]>;

export type AllowedEventName = keyof typeof EVENT_PAYLOAD_KEYS;

export function assertAllowedPayload(
  name: AllowedEventName,
  payload: Record<string, unknown>,
): void {
  const allowed = new Set<string>(EVENT_PAYLOAD_KEYS[name]);
  for (const k of Object.keys(payload)) {
    if (!allowed.has(k)) {
      throw new Error(`EVENT_KEY_NOT_ALLOWED:${name}.${k}`);
    }
  }
}
