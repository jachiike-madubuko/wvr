pass
Target: Neon Lakebase Postgres (`weavr-demo` / `flat-math-41414131`, branch `main`, PG 18)
Command: `npm run verify:db` (`npm run check:env && npm run check:migrations && npm run test:db`)
- `check-env.mjs`: ok (Neon `DATABASE_URL` present, zero secret keys exposed in `NEXT_PUBLIC_*`)
- `check-migrations.mjs`: ok (5 monotonic Neon migrations: `001_core_roster.sql` .. `005_sel_profile.sql`)
- `test-migrations.mjs` (PGlite WASM Postgres under `weavr_app` + `app.teacher_id`): 28 passed, 0 failed
  - Schema & First-Name-Only Invariants: 5/5 passed
  - PII Gate & Append-Only Ledgers: 4/4 passed
  - Multi-Tenant RLS & Privilege Isolation (`weavr_app`): 6/6 passed
  - Anonymous Capability Paths & Telemetry (`/s/[token]`): 2/2 passed
  - Optimistic Concurrency (`move_student_group`): 6/6 passed
  - Postgres / Neon Security Advisor Equivalents & Demo Seed: 5/5 passed
