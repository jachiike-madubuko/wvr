pass
Stage: 03.2 (`WVR-230` — Student Profile, Bklit UI Charts & Offline Interventions)

1. `npm run verify`:
   - `check-env.mjs`: ok
   - `check-migrations.mjs`: ok (5 migrations)
   - `test-migrations.mjs`: 28 passed, 0 failed
   - `tsc --noEmit`: 0 errors
   - `vitest run`: 7 test files, 46 tests passed (`block-dwell`, `pace`, `path-tokens`, `pii`, `room-data`, `wave-utils`, `student-profile`)
2. `npm run build`: exited 0
3. `PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/room-first.spec.ts e2e/student-profile.spec.ts --reporter=line --retries=0`: 5 passed, 0 failed (34.0s)
   - Bklit `RadarChart` (Weaver Wheel 5 zones), `CheckInTrend` AM/PM lines, `MasteryChart` Zoom/Filter & red struggle nodes
   - SEL Action Chat drawer + PII gate (`422 PII_BLOCKED`)
   - 3-Step Offline Intervention drawer + Neon persistence + `"Offline teacher plan · Never sent to student deck"`
   - Clean not-found fallback for unknown student UUID
