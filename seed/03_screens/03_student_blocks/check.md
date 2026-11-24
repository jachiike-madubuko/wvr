pass
Stage: 03.3 (`WVR-229` — Student Capability Path `/s/[token]` & Sequential Mosaic Deck)

1. `npm run verify`:
   - `check-env.mjs`: ok
   - `check-migrations.mjs`: ok (5 migrations)
   - `test-migrations.mjs`: 28 passed, 0 failed
   - `tsc --noEmit`: 0 errors
   - `vitest run`: 8 test files, 49 tests passed (`block-dwell`, `pace`, `path-tokens`, `pii`, `room-data`, `wave-utils`, `student-profile`, `student-blocks`)
2. `npm run build`: exited 0
3. `PLAYWRIGHT_HTML_OPEN=never npx playwright test --reporter=line --retries=0`: 7 passed, 0 failed (22.3s)
   - Invalid token `/s/invalid-token-123` fails closed (`invalid-path-link`, zero student names)
   - `/s/demo-space-lesson` first-name-only roster picker (zero password/email inputs)
   - Hero Hook (`data-span="2"`), sequential padlock gating (`data-locked="true"` until prior block completes), `DrawPad` canvas stroke, `Check` choice pills, and Neon `save_student_path_session` persistence
