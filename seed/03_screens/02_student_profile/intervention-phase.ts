export type InterventionPhase = "idle" | "compose" | "generating" | "ready" | "approved" | "sent";
export type InterventionEvent = "approve" | "unapprove" | "publish";

export function nextInterventionPhase(phase: InterventionPhase, event: InterventionEvent): InterventionPhase {
  if (event === "approve" && phase === "ready") return "approved";
  if (event === "unapprove" && phase === "approved") return "ready";
  if (event === "publish" && phase === "approved") return "sent";
  return phase;
}

export function publishEnabled(phase: InterventionPhase): boolean {
  return phase === "approved";
}
