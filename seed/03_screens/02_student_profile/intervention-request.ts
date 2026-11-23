export function buildInterventionRequest(guidance: string): { guidance?: string } {
  const trimmed = guidance.trim();
  if (!trimmed) return {};
  return { guidance: trimmed };
}
