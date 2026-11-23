/**
 * Shared PII gate. Runs unchanged in the browser for instant feedback and on the
 * server as the decision of record.
 *
 * Two fields, two audiences. `ruleId` is safe to log, persist, and aggregate.
 * `excerpt` is the teacher's own text echoed back so they can fix it, and must
 * never reach a log line, an event payload, or the database.
 */

export const PII_SCANNER_VERSION = "pii.v1";

export type PiiPass = { verdict: "pass" };

export type PiiBlock = {
  verdict: "block";
  ruleId: string;
  /** Shown to the teacher in their own browser. Never logged or stored. */
  excerpt: string;
  message: string;
};

export type PiiVerdict = PiiPass | PiiBlock;

export type ScannableVariationSet = {
  base: { surface: { hook: string } };
  variations: ReadonlyArray<{ surface: { hook: string } }>;
  notes?: ReadonlyArray<{ body: string }>;
};

const PASS: PiiPass = { verdict: "pass" };

/**
 * Capitalized words that legitimately appear in a math lesson. Without these the
 * two-capitalized-words heuristic blocks "Pythagorean Theorem" and every teacher
 * gives up on the product in the first minute.
 */
const NON_NAME_TOKENS = new Set(
  [
    // Structure
    "Exit", "Ticket", "Warm", "Up", "Do", "Now", "Bell", "Ringer", "Lesson",
    "Unit", "Module", "Topic", "Chapter", "Grade", "Period", "Objective",
    "Standard", "Standards", "Assessment", "Homework", "Practice", "Problem",
    "Problems", "Task", "Activity", "Answer", "Key", "Rubric", "Worksheet",
    "Directions", "Instructions", "Example", "Examples", "Solution", "Review",
    "Reteach", "Extension", "Closure", "Launch", "Explore", "Summary",
    // Curriculum and program names
    "Common", "Core", "Illustrative", "Mathematics", "Math", "Eureka",
    "EngageNY", "Open", "Middle", "Bridges", "Everyday", "Connected",
    "Big", "Ideas", "Learning", "Zearn", "Desmos",
    // Math proper nouns
    "Pythagorean", "Theorem", "Euclidean", "Cartesian", "Fibonacci", "Pascal",
    "Venn", "Diagram", "Order", "Operations", "Distributive", "Property",
    "Associative", "Commutative", "Identity", "Greatest", "Least", "Common",
    "Denominator", "Multiple", "Factor", "Prime", "Scientific", "Notation",
    "Rational", "Irrational", "Slope", "Intercept", "Form", "Quadratic",
    // Generic lesson subjects
    "Students", "Student", "Teacher", "Class", "Classroom", "Group", "Groups",
    "Partner", "Boys", "Girls", "Mixed", "Gender", "Balance", "Quiet",
    "Energetic", "Talkative", "Dynamics",
    "Table", "Talk", "Think", "Pair", "Share", "Turn", "Write", "Solve",
    "Compare", "Explain", "Justify", "Model", "Represent", "Estimate",
    "Every", "Each", "First", "Second", "Third", "Next", "Then", "Finally",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ].map((t) => t.toLowerCase()),
);

type Rule = {
  id: string;
  message: string;
  find: (text: string) => string | null;
};

function firstMatch(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  return m ? m[0] : null;
}

const RULES: Rule[] = [
  {
    id: "roster_language",
    message:
      "That reads like a roster. Weaver works from class interest tags, never student names.",
    find: (text) =>
      firstMatch(
        text,
        /\b(?:roster|roll\s*call|class\s+list|student\s+names?|name\s+of\s+student|seating\s+chart|IEP|504\s+plan)\b/i,
      ),
  },
  {
    id: "email_address",
    message: "That looks like an email address. Remove it before generating.",
    find: (text) => firstMatch(text, /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/),
  },
  {
    id: "ssn",
    message: "That looks like a Social Security number. Remove it before generating.",
    find: (text) => firstMatch(text, /\b\d{3}-\d{2}-\d{4}\b/),
  },
  {
    id: "phone_number",
    message: "That looks like a phone number. Remove it before generating.",
    find: (text) =>
      firstMatch(text, /(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/),
  },
  {
    id: "gradebook_language",
    message:
      "Individual scores belong in your gradebook, not here. Weaver personalizes by interest, not by performance.",
    find: (text) =>
      firstMatch(
        text,
        /\b(?:scored|earned)\s+(?:a\s+)?\d{1,3}\s*%|\bgrade(?:d)?\s+(?:as|a)\s+[A-F][+-]?\b/i,
      ),
  },
  {
    id: "salutation_name",
    message:
      "That looks like a person's name. Remove it before generating.",
    find: (text) =>
      firstMatch(
        text,
        /\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]{1,20}\b/,
      ),
  },
  {
    id: "person_name",
    message:
      "That looks like a person's name. Weaver takes class interest tags only, so remove it before generating.",
    find: (text) => {
      const re = /\b([A-Z][a-z]{2,20})\s+([A-Z][a-z]{2,20})\b/g;
      for (const m of text.matchAll(re)) {
        const [full, first, last] = m;
        if (
          !NON_NAME_TOKENS.has(first!.toLowerCase()) &&
          !NON_NAME_TOKENS.has(last!.toLowerCase())
        ) {
          return full;
        }
      }
      return null;
    },
  },
];

export function scanForPii(text: string): PiiVerdict {
  for (const rule of RULES) {
    const excerpt = rule.find(text);
    if (excerpt !== null) {
      return {
        verdict: "block",
        ruleId: rule.id,
        excerpt,
        message: rule.message,
      };
    }
  }
  return PASS;
}

/** Teacher-edited packet copy before approve persist. Fail closed on last-name/email/SSN hits. */
export function scanVariationSetCopy(set: ScannableVariationSet): PiiVerdict {
  const chunks = [
    ...[set.base, ...set.variations].map((recipe) => recipe.surface.hook),
    ...(set.notes ?? []).map((note) => note.body),
  ];
  return scanForPii(chunks.filter((chunk) => chunk.length > 0).join("\n"));
}

/**
 * Normalized so trivial reformatting of the same lesson produces the same hash.
 * The hash is what gets stored; the text is not.
 */
export function normalizeForHash(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
