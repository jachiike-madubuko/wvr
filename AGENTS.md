# Weavr Clean Rebuild — Agent Entrypoint

You are working in the clean rebuild of **Weavr** (K–6 teacher app: calendar-first, standards-aware, interest-personalized lesson packets; live wedge: grades 2–4 Math + ELA).

## Fail-Closed Invariants (Non-Negotiable)
1. **First Name Only:** `public.students` carries ONLY `first_name` (no last names, emails, passwords, student logins, or photos).
2. **Anonymous Capability Links:** Student path is `/s/[token]` (SHA-256 hashed against `student_path_tokens`). No student auth session.
3. **Zero Secret Keys in Web Bundles:** Neon `DATABASE_URL` (pooled, least-privilege `weavr_app` with transaction-local `set_config('app.teacher_id', $1, true)`) and `DATABASE_URL_UNPOOLED` (migrations only) stay strictly server-side. Never expose DB/secret credentials in `NEXT_PUBLIC_*` or browser bundles. Enforced via `npm run check:env`.
4. **Teacher-Facing Offline Interventions:** AI advises the adult offline. The child NEVER chats with an AI or receives automated remediation blocks in their deck.
5. **Zero External Chart Bloat:** Charts import from `@/components/charts/*` (`@visx/*` + `d3-shape` only; no Recharts, Chart.js, or Lucide chart deps).
6. **Optimistic Concurrency:** Student group moves require `expected_version` (`move_student_group`); stale writes fail with `VERSION_CONFLICT` (409 / SQLSTATE `40001`).

## Repository Layout
- `db/migrations/` & `db/seed.sql` — Monotonic Neon Lakebase Postgres migrations (001–005) & demo seed.
- `src/domain/pace/` — Dwell sanitization, pace budgets, and `dayPace()` math.
- `src/lib/security/` — `scanForPii()`, SHA-256 capability token minting/hashing.
- `tests/unit/` — Vitest unit suites.
- `scripts/` — `check-env.mjs`, `check-migrations.mjs`, `test-migrations.mjs`, `migrate.mjs`.
- `seed/` — Read-only ICM specs, reference snippets, and standalone HTML previews. Never edit `seed/` reference files.

## Pipeline Status
Always read the active stage's `CONTEXT.md` (< 8k tokens) before touching files.

| Stage | Folder | Linear | Status | Job |
|---|---|---|---|---|
| **01** | `seed/01_db/` | `WVR-226` | Done | Neon `weavr-demo` + `db/migrations/001..005` + PGlite RLS suite |
| **02** | `seed/02_engine/` | `WVR-227` | Done | Domain pace/dwell math, PII gate, SHA-256 capability tokens |
| **03.1** | `seed/03_screens/01_galaxy_calendar/` | `WVR-228` | Done | 3D Flip Scene (Galaxy Home & Pace Calendar with WavyStackBar) |
| **03.2** | `seed/03_screens/02_student_profile/` | `WVR-230` | Done | Student Profile, Weaver Wheel, check-ins, 3-step offline drawer (`https://bklit.com/llms.txt` for line & radar charts) |
| **03.3** | `seed/03_screens/03_student_blocks/` | `WVR-229` | Done | Student Device Deck (`/s/[token]`), YouTube mosaic, padlocks |
| **04** | `seed/04_verify/` | `WVR-232` | Done | Pre-commit verification (`check:env`, `test`, `test:db`, `build`, `test:e2e`) |

## Operating Rules
- Never commit `.env` or print credentials.
- Run `npm run verify` (exit 0) before committing.
- **Done Means Committed:** Update Linear with the commit SHA and verification output; leave `In Progress` until pushed to a remote.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
