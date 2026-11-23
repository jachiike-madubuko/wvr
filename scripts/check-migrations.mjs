#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("check-migrations: no .sql migrations found in supabase/migrations/");
  process.exit(1);
}

const problems = [];
let expectedSeq = 1;

for (const file of files) {
  const match = /^(\d{3})_([a-z0-9_]+)\.sql$/.exec(file);
  if (!match) {
    problems.push(`${file}: filename must match NNN_snake_case.sql`);
    continue;
  }

  const seq = Number(match[1]);
  if (seq !== expectedSeq) {
    problems.push(`${file}: expected monotonic sequence ${String(expectedSeq).padStart(3, "0")}, got ${match[1]}`);
  }
  expectedSeq = seq + 1;

  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  if (/grant\b[\s\S]{0,80}\bto\s+(anon|authenticated)\b[\s\S]{0,40}service_role/i.test(sql) ||
      /grant\s+service_role\s+to\s+(anon|authenticated)/i.test(sql)) {
    problems.push(`${file}: must not grant service_role to anon or authenticated`);
  }

  const studentsMatch = /create\s+table\s+public\.students\s*\(([\s\S]*?)\);/i.exec(sql);
  if (studentsMatch) {
    const body = studentsMatch[1];
    if (/\b(last_name|email|password|photo|photo_url|avatar_url|login)\b/i.test(body)) {
      problems.push(`${file}: public.students violates first-name-only invariant`);
    }
  }
}

if (problems.length > 0) {
  console.error("check-migrations: FAILED");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`check-migrations: ok (${files.length} monotonic migrations: ${files[0]} .. ${files[files.length - 1]})`);
