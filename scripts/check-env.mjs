#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const problems = [];
const dbUrl = process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  problems.push("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
} else if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
  problems.push("DATABASE_URL must start with postgres:// or postgresql://.");
} else if (!/-pooler\./i.test(dbUrl)) {
  console.warn("check-env: warning: DATABASE_URL is not using a -pooler Neon hostname.");
}

const FORBIDDEN = [
  { name: "NEXT_PUBLIC_DATABASE_URL", why: "would expose database credentials in the browser bundle" },
  { name: "NEXT_PUBLIC_DATABASE_URL_UNPOOLED", why: "would expose owner database credentials in the browser bundle" },
  { name: "SUPABASE_SECRET_KEY", why: "legacy RLS-bypassing key must not exist in app environment" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", why: "legacy RLS-bypassing key must not exist in app environment" },
  { name: "NEXT_PUBLIC_SUPABASE_SECRET_KEY", why: "would expose an RLS-bypassing key in the browser bundle" },
];

for (const { name, why } of FORBIDDEN) {
  if (process.env[name]) {
    problems.push(`${name} must not be set: it ${why}.`);
  }
}

if (problems.length > 0) {
  console.error("\ncheck-env: FAILED\n");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("check-env: ok (Neon DATABASE_URL present, zero secret keys exposed in NEXT_PUBLIC_*).");
