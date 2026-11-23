import { createHash, randomBytes } from "node:crypto";

export type StudentPathPayload = {
  title: string;
  packLabel: string;
  packId: string;
  standardsPlain?: string[];
  blocks: unknown[];
};

export type PackVariationSource = {
  title: string;
  standardsPlain?: string[];
  variations: Array<{
    packId: string;
    packLabel: string;
    surface: {
      title?: string;
      blocks?: unknown[];
    };
  }>;
};

export function hashStudentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintPlainToken(): string {
  return randomBytes(24).toString("base64url");
}

export function payloadForPack(
  set: PackVariationSource,
  packId: string,
): StudentPathPayload | null {
  const variation = set.variations.find((v) => v.packId === packId);
  if (!variation) return null;
  return {
    title: variation.surface.title || set.title,
    packLabel: variation.packLabel,
    packId,
    standardsPlain: set.standardsPlain,
    blocks: variation.surface.blocks ?? [],
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
export function durableVariationPayload<T extends { studentPathTokens?: unknown }>(
  set: T,
): Omit<T, "studentPathTokens"> {
  const copy = { ...set };
  delete copy.studentPathTokens;
  return copy;
}
