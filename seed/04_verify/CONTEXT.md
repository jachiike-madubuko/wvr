# Stage 04: Pre-Commit & CI Verification Gate

## Job
Run the automated pre-commit gate guaranteeing zero security leaks, zero invariant violations, and clean builds.

## Linear Contract
- **Linear Issue**: `WVR-232`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `check-env.mjs`: Scans environment to ensure `SUPABASE_SECRET_KEY` is not present in client/server bundles.
- `test-migrations.mjs`: PGlite in-memory Postgres test runner verifying multi-tenant RLS attack isolation.

## Check Commands
Execute in order:
```bash
node seed/04_verify/check-env.mjs
npm test
npm run test:db
npm run test:e2e
```
All commands must exit 0 before any Linear ticket is closed.
