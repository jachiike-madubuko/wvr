# Weavr Clean Rebuild — Agent Entrypoint

You are working in the clean rebuild of **Weavr** (K–6 teacher app: calendar-first, standards-aware, interest-personalized lesson packets).

## Fail-Closed Invariants
- **First Name Only**: Student records carry only `first_name`. No logins, emails, photos, or passwords.
- **Anonymous Capability Links**: Student path is `/s/[token]` (SHA-256 hashed). No student auth session.
- **No `service_role` in App Code**: Client runs under teacher Supabase session. `check-env.mjs` fails if secret key exists in web code.
- **Interventions are Teacher-Facing**: Model advises adult offline. Child never chats with an AI model.
- **Zero Chart Bloat**: Charts import from internal `@/components/charts/*` (built on `@visx/*`).

## Pipeline Navigation
Always read the stage's `CONTEXT.md` first (< 8k tokens) before touching files.

| Stage | Folder | Linear Issue | Job |
|---|---|---|---|
| **Factory** | `_factory/` | — | Canonical references (`PRD.md`, `design_tokens.md`, `schemas/`). |
| **01** | `01_db/` | `WVR-226` | Monotonic SQL migrations (001–005) & PGlite RLS attack tests. |
| **02** | `02_engine/` | `WVR-227` | Domain pace math, dwell engine, capability hashers, PII scan. |
| **03.1** | `03_screens/01_galaxy_calendar/` | `WVR-228` | 3D Flip Scene (Galaxy Home & Pace Calendar with WavyStackBar). |
| **03.2** | `03_screens/02_student_profile/` | `WVR-230` | Student Profile, Weaver Wheel, and 3-step offline coaching drawer. |
| **03.3** | `03_screens/03_student_blocks/` | `WVR-229` | Student Device Deck (`/s/[token]`), YouTube mosaic, padlocks. |
| **04** | `04_verify/` | `WVR-232` | Pre-commit verification (`check-env`, `test`, `test:db`, `test:e2e`). |

## Operating Rule
**Done Means Committed**: Never close a Linear issue without a pushed commit SHA and passing verification output.
