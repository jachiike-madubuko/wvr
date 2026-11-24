pass
Stage: 04 (`WVR-232` — Pre-Commit & CI Verification Gate)
Command: `npm run verify:all`

1. `npm run check:env`: ok (Neon `DATABASE_URL` present, zero secret keys or client DB leaks in `src/`)
2. `npm run check:migrations`: ok (5 monotonic Neon migrations: `001_core_roster.sql` .. `005_sel_profile.sql`)
3. `npm run test:db`: 28 passed, 0 failed (PGlite WASM Postgres under `weavr_app` + `app.teacher_id`)
4. `npm run typecheck`: 0 errors
5. `npm test` (`vitest run`): 8 test files, 49 tests passed
6. `npm run build`: exited 0 (Next.js 16.4.6 Turbopack)
7. `npm run test:e2e`: 7 passed, 0 failed (36.5s across `room-first.spec.ts`, `student-profile.spec.ts`, `student-blocks.spec.ts`)
