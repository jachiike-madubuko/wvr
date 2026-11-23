#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "db", "migrations");
const SEED_PATH = join(ROOT, "db", "seed.sql");

for (const envFile of [".env", ".env.local"]) {
  const full = join(ROOT, envFile);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim();
if (!directUrl) {
  console.error("migrate: DATABASE_URL_UNPOOLED is required for schema migrations.");
  process.exit(1);
}
if (/-pooler\./i.test(directUrl)) {
  console.error("migrate: refusing to run migrations over a pooled (-pooler) URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: directUrl });
await client.connect();

try {
  await client.query(`
    create schema if not exists _meta;
    create table if not exists _meta.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await client.query("select name from _meta.migrations")).rows.map((r) => r.name),
  );
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _meta.migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`  ok   ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }

  if (process.argv.includes("--seed") && existsSync(SEED_PATH)) {
    await client.query(readFileSync(SEED_PATH, "utf8"));
    console.log("  ok   db/seed.sql");
  }
} finally {
  await client.end();
}
