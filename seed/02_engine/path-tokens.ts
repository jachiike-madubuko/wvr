import { createHash, randomBytes } from "crypto";
import type { VariationSetStub } from "@/data/demo-set";
import { hydratePinBoard, resolvePathBlocks } from "@/lib/classroom/pin-board";
import type { StudentPathPayload } from "@/lib/classroom/student-path-cache";

export function hashStudentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function mintPlainToken() {
  return randomBytes(24).toString("base64url");
}

export function payloadForPack(
  set: VariationSetStub,
  packId: string,
): StudentPathPayload | null {
  const hydrated = hydratePinBoard(set);
  const variation = hydrated.variations.find((v) => v.packId === packId);
  if (!variation) return null;
  return {
    title: variation.surface.title || hydrated.title,
    packLabel: variation.packLabel,
    packId,
    standardsPlain: hydrated.standardsPlain,
    blocks: resolvePathBlocks(variation.surface.blocks ?? []),
  };
}

export function expiresFromEndDate(endDate: string | null | undefined): string {
  const end = endDate ? new Date(`${endDate}T23:59:59.000Z`) : new Date();
  if (Number.isNaN(end.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback.toISOString();
  }
  end.setUTCDate(end.getUTCDate() + 7);
  return end.toISOString();
}

/** Persist hashes in student_path_tokens. Never store minted plaintext on variation_sets.payload. */
export function durableVariationPayload(set: VariationSetStub): VariationSetStub {
  const copy = { ...set };
  delete copy.studentPathTokens;
  return copy;
}
