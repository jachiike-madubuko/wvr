#!/usr/bin/env node
/**
 * Refuses to build without the Supabase configuration.
 *
 * This exists because NEXT_PUBLIC_* variables are inlined into the client
 * bundle at build time rather than read at run time. A build that runs without
 * them produces JavaScript containing a literal `undefined`, and setting the
 * variable in the dashboard afterwards changes nothing until you rebuild. No
 * runtime guard can recover from that, so the only place to catch it is here.
 *
 * The runtime guards in src/lib/supabase are a backstop for the server, not a
 * substitute for this.
 *
 * Lives under web/ rather than with the other scripts at the repo root because
 * the Vercel project's root directory is `web`, and a sibling directory is not
 * something a build should count on being able to reach.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    looksRight: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.(co|red)$/.test(v),
    hint: "Expected https://<project-ref>.supabase.co",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    // Both the current sb_publishable_ prefix and the older anon JWT.
    looksRight: (v) => v.startsWith("sb_publishable_") || v.startsWith("eyJ"),
    hint: "Expected the publishable (anon) key, starting sb_publishable_",
  },
];

// The secret key carries BYPASSRLS. If it is present in a build environment it
// is one import away from a route handler, where it would turn every row level
// security policy into decoration.
const FORBIDDEN = [
  { name: "SUPABASE_SECRET_KEY", why: "bypasses RLS and must never reach app code" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", why: "bypasses RLS and must never reach app code" },
  {
    name: "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
    why: "would ship a BYPASSRLS credential in the browser bundle",
  },
  // POSTHOG_PERSONAL_API_KEY reads every project the key can see. The server
  // uses it for /admin/lessons; a NEXT_PUBLIC_ twin would inline it into the
  // browser bundle, where anyone could read the whole analytics project.
  {
    name: "NEXT_PUBLIC_POSTHOG_PERSONAL_API_KEY",
    why: "would ship a PostHog read credential in the browser bundle",
  },
];

loadDotEnvLocal();

const problems = [];

for (const { name, looksRight, hint } of REQUIRED) {
  const value = process.env[name]?.trim();
  if (!value) {
    problems.push(`${name} is not set. ${hint}`);
  } else if (!looksRight(value)) {
    problems.push(`${name} is set but does not look right. ${hint}`);
  }
}

for (const { name, why } of FORBIDDEN) {
  if (process.env[name]) problems.push(`${name} must not be set here: it ${why}.`);
}

if (problems.length > 0) {
  console.error("\ncheck-env: refusing to build.\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\nLocally: copy web/.env.example to web/.env.local and fill it in." +
      "\nOn Vercel: vercel env add <NAME> production, then redeploy." +
      "\nA build without these produces a bundle that can never reach Supabase," +
      "\nno matter what is set afterwards.\n",
  );
  process.exit(1);
}

console.log("check-env: Supabase configuration present, no RLS-bypassing key in scope.");

/**
 * Next reads .env.local itself, but this runs before Next starts, so it has to
 * do its own reading. Deliberately does not overwrite anything already in the
 * environment: on Vercel the real values arrive that way, and a stray .env.local
 * must never mask a missing production variable.
 */
function loadDotEnvLocal() {
  const path = join(WEB, ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}
