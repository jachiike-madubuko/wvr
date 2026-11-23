import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import {
  type PackVariationSource,
  durableVariationPayload,
  expiresFromEndDate,
  hashStudentToken,
  mintPlainToken,
  payloadForPack,
} from "@/lib/security/path-tokens";

const SAMPLE_SET: PackVariationSource & { studentPathTokens?: Record<string, string> } = {
  title: "Fractions in Action",
  standardsPlain: ["3.NF.A.1"],
  variations: [
    {
      packId: "pack_space",
      packLabel: "Space",
      surface: {
        title: "Space Fuel Halves",
        blocks: [{ id: "hook", title: "Launch" }],
      },
    },
  ],
};

test("durableVariationPayload drops plaintext student path tokens without mutating input", () => {
  const withSecrets = {
    ...SAMPLE_SET,
    studentPathTokens: { pack_space: "minted-plaintext-token" },
  };

  const stored = durableVariationPayload(withSecrets);

  expect("studentPathTokens" in stored).toBe(false);
  expect(stored.title).toBe("Fractions in Action");
  expect(withSecrets.studentPathTokens?.pack_space).toBe("minted-plaintext-token");
});

test("mintPlainToken generates unique URL-safe tokens and hashStudentToken matches sha256", () => {
  const a = mintPlainToken();
  const b = mintPlainToken();
  expect(a).not.toBe(b);
  expect(a.length).toBeGreaterThanOrEqual(32);
  expect(a).toMatch(/^[A-Za-z0-9_-]+$/);

  const expected = createHash("sha256").update(a).digest("hex");
  expect(hashStudentToken(a)).toBe(expected);
  expect(hashStudentToken(a)).toMatch(/^[a-f0-9]{64}$/);
});

test("expiresFromEndDate adds 7 UTC days or falls back to +30 days on invalid date", () => {
  expect(expiresFromEndDate("2026-09-10")).toBe("2026-09-17T23:59:59.000Z");
  const fromNull = Date.parse(expiresFromEndDate(null));
  expect(fromNull).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  const fromInvalid = Date.parse(expiresFromEndDate("not-a-date"));
  expect(fromInvalid).toBeGreaterThan(Date.now() + 25 * 86_400_000);
});

test("payloadForPack returns mapped payload or null when pack is missing", () => {
  expect(payloadForPack(SAMPLE_SET, "pack_space")).toEqual({
    title: "Space Fuel Halves",
    packLabel: "Space",
    packId: "pack_space",
    standardsPlain: ["3.NF.A.1"],
    blocks: [{ id: "hook", title: "Launch" }],
  });
  expect(payloadForPack(SAMPLE_SET, "pack_cooking")).toBeNull();
});
