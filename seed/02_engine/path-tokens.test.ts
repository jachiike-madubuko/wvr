import { expect, test } from "vitest";
import { DEMO_SET } from "@/data/demo-set";
import { durableVariationPayload } from "./path-tokens";

test("durable variation payload drops plaintext student path tokens", () => {
  const withSecrets = {
    ...DEMO_SET,
    studentPathTokens: { pack_soccer: "minted-plaintext-token" },
  };

  const stored = durableVariationPayload(withSecrets);

  expect(stored.studentPathTokens).toBeUndefined();
  expect(stored.variations[0].surface.hook).toBe(DEMO_SET.variations[0].surface.hook);
  expect(withSecrets.studentPathTokens?.pack_soccer).toBe("minted-plaintext-token");
});
