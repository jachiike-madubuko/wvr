# Stage 02: Domain Engines & Security Gates

## Job
Implement domain math, pace estimators, capability token hashers, and PII scanners.

## Linear Contract
- **Linear Issue**: `WVR-227`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `_factory/PRD.md`
- Working code files:
  - `block-dwell.ts`: Heartbeat calculation, dwell sanitization, and attempt counts.
  - `pace.ts`: Student pace bands (`dayPace()`, `isDoubleTime()`, `recommendedBlockMs()`).
  - `path-tokens.ts`: Unguessable capability path generator and SHA-256 hasher.
  - `pii.ts` & `pii.test.ts`: Regex PII scanner (`scanForPii()`).

## Constraints & Invariants
- **PII Filter**: Any free-form text input must pass PII scan (no full names, phone numbers, SSNs).
- **Anonymous Capability Tokens**: `/s/[token]` uses SHA-256 hashed lookup against database.

## Outputs
- Tested domain engines under `src/domain/pace/` and `src/lib/security/`.

## Check
Run command:
```bash
npm test tests/unit/
```
All domain tests pass without warnings.
