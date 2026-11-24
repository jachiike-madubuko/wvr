#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

function walkTs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTs(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

for (const file of walkTs(join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);
  const isClient = /^\s*["']use client["'];/m.test(src);

  if (/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(src)) {
    problems.push(`${rel}: references forbidden legacy SUPABASE secret key.`);
  }
  if (/from\s+["'](recharts|chart\.js|react-chartjs-2)["']/.test(src)) {
    problems.push(`${rel}: imports forbidden external chart library.`);
  }
  if (isClient) {
    if (/from\s+["'](@\/lib\/db|pg)["']/.test(src)) {
      problems.push(`${rel}: "use client" module must not import server DB modules.`);
    }
    if (/DATABASE_URL(_UNPOOLED)?/.test(src)) {
      problems.push(`${rel}: "use client" module must not reference DATABASE_URL.`);
    }
  }
}

if (problems.length > 0) {
  console.error("\ncheck-env: FAILED\n");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  "check-env: ok (Neon DATABASE_URL present, zero secret keys or client DB leaks in src/).",
);
