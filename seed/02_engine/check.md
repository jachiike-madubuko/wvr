pass
Command: `npm run verify` (`check:env`, `check:migrations`, `test:db`, `typecheck`, `vitest run`)
- `check-env.mjs`: ok
- `check-migrations.mjs`: ok (5 monotonic Neon migrations)
- `test-migrations.mjs`: 28 passed, 0 failed
- `tsc --noEmit`: 0 errors
- `vitest run` (`tests/unit/`): 4 test files, 35 tests passed
  - `tests/unit/block-dwell.test.ts`: 5 passed
  - `tests/unit/pace.test.ts`: 6 passed
  - `tests/unit/path-tokens.test.ts`: 4 passed
  - `tests/unit/pii.test.ts`: 20 passed
