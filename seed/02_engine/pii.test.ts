import { expect, test } from "vitest";
import { DEMO_SET } from "@/data/demo-set";
import { normalizeForHash, scanForPii, scanVariationSetCopy, sha256Hex } from "./pii.ts";

/** The text JourneyBoard ships with. If this ever blocks, the demo is dead. */
const DEMO_PASTE =
  "Grade 7 — Equivalent ratios\n\nA machine produces 2 parts every 3 minutes. Students write the ratio in simplest form and scale to 12 minutes. Exit ticket: compare to 4 parts in 6 minutes.";

const PASSING = [
  ["the shipped demo paste", DEMO_PASTE],
  [
    "a named theorem",
    "Students apply the Pythagorean Theorem to find the missing side length of a right triangle.",
  ],
  [
    "a curriculum reference",
    "This lesson aligns to Common Core standard 7.RP.A.2 and follows Illustrative Mathematics Unit 4.",
  ],
  [
    "lesson structure words",
    "Exit Ticket: Compare the two rates. Warm Up first, then Turn and Talk with a Partner.",
  ],
  [
    "a day and month reference",
    "On Monday students estimate. By September they should Model and Justify each step.",
  ],
  [
    "classroom grouping notes",
    "Keep groups mixed. Spread talkative kids across tables. Do not make all-boy or all-girl groups unless I ask.",
  ],
] as const;

const BLOCKING = [
  ["roster language", "Class roster: seat 1 through 24 for the ratios lesson.", "roster_language"],
  ["a seating chart", "Use the seating chart to group students by table.", "roster_language"],
  ["an IEP reference", "Follow the IEP accommodation for extended time on this task.", "roster_language"],
  ["an email address", "Send the worksheet to jordan.reyes@district.k12.us before Friday.", "email_address"],
  ["a phone number", "Call the family at 555-311-4820 about the missing homework.", "phone_number"],
  ["a salutation and name", "Ask Mr. Whitfield to co-teach the ratios lesson on Thursday.", "salutation_name"],
  ["a full name", "Marcus Delgado needs the scaffolded version of this ratio task.", "person_name"],
  ["a percentage score", "She scored 62% on the last ratios quiz so reteach scaling.", "gradebook_language"],
] as const;

for (const [label, text] of PASSING) {
  test(`passes ${label}`, () => {
    const result = scanForPii(text);
    expect(
      result.verdict,
      `expected a pass but rule "${result.verdict === "block" ? result.ruleId : ""}" fired`,
    ).toBe("pass");
  });
}

for (const [label, text, expectedRule] of BLOCKING) {
  test(`blocks ${label}`, () => {
    const result = scanForPii(text);
    expect(result.verdict).toBe("block");
    if (result.verdict === "block") {
      expect(result.ruleId).toBe(expectedRule);
      expect(result.excerpt.length).toBeGreaterThan(0);
    }
  });
}

test("normalization collapses whitespace so reformatting keeps the hash stable", async () => {
  const a = normalizeForHash("Grade 7   ratios\n\n  lesson  ");
  const b = normalizeForHash("Grade 7 ratios lesson");
  expect(a).toBe(b);
  expect(await sha256Hex(a)).toBe(await sha256Hex(b));
});

test("hash is 64 lowercase hex characters, matching the column constraint", async () => {
  const hash = await sha256Hex(normalizeForHash(DEMO_PASTE));
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
});

test("different lessons hash differently", async () => {
  const a = await sha256Hex(normalizeForHash(DEMO_PASTE));
  const b = await sha256Hex(normalizeForHash(`${DEMO_PASTE} Extra problem.`));
  expect(a).not.toBe(b);
});

test("approved variation copy without names passes", () => {
  expect(scanVariationSetCopy(DEMO_SET).verdict).toBe("pass");
});

test("approved variation copy with a last name fails closed", () => {
  const edited = structuredClone(DEMO_SET);
  edited.variations[0].surface.hook = "Call Maya Smith at home tonight.";
  const result = scanVariationSetCopy(edited);
  expect(result.verdict).toBe("block");
  if (result.verdict === "block") expect(result.ruleId).toBe("person_name");
});
