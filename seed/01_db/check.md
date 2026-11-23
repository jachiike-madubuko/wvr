pass
Command: `npm run verify:db` (`npm run check:migrations && npm run test:db`)
- `check-migrations.mjs`: ok (5 monotonic migrations: `001_core_roster.sql` .. `005_sel_profile.sql`)
- `test-migrations.mjs` (PGlite WASM Postgres): 29 passed, 0 failed
  - Schema & First-Name-Only Invariants: 6/6 passed
  - PII Gate & Append-Only Ledgers: 4/4 passed
  - Multi-Tenant RLS & Privilege Isolation: 6/6 passed
  - Anonymous Capability Paths & Telemetry (`/s/[token]`): 2/2 passed
  - Optimistic Concurrency (`move_student_group`): 6/6 passed
  - Supabase Advisor Security Equivalents: 5/5 passed
