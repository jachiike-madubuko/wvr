#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  assertSafeDemoEnv,
  clearDemoData,
  isDemoProfile,
  seedDemoProfile,
} from "../src/lib/demo/seed.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const envFile of [".env", ".env.local"]) {
  const full = join(ROOT, envFile);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const clearOnly = args.includes("--clear");
const reset = args.includes("--reset");
const profileArg =
  args.find((a) => a.startsWith("--profile="))?.slice("--profile=".length) ??
  "sales_walkthrough";

if (!clearOnly && !isDemoProfile(profileArg)) {
  console.error(
    `seed-demo: invalid --profile="${profileArg}". Expected sales_walkthrough or interactive_onboarding.`,
  );
  process.exit(1);
}

const { directUrl, teacherId } = assertSafeDemoEnv(process.env);
const client = new pg.Client({ connectionString: directUrl });
await client.connect();

try {
  await client.query("BEGIN");
  if (clearOnly) {
    const cleared = await clearDemoData(client, { teacherId });
    await client.query("COMMIT");
    console.log(
      `seed-demo: cleared ${cleared.deletedStudents} demo student(s), preserved ${cleared.preservedRealStudents} real student(s).`,
    );
  } else {
    const result = await seedDemoProfile(client, profileArg, { teacherId, reset });
    await client.query("COMMIT");
    console.log(
      `seed-demo: ok (${result.profile}, ${result.studentCount} students, path /s/${result.pathToken})`,
    );
  }
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("seed-demo: FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
