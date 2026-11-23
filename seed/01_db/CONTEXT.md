# Stage 01: Core Database & Multi-Tenant RLS

## Job
Maintain and verify the clean, monotonic SQL migrations (001–005) with Row-Level Security on every public table.

## Linear Contract
- **Linear Issue**: `WVR-226`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `_factory/PRD.md`
- Working SQL files:
  - `001_core_roster.sql`: `teachers`, `classes`, and `students` (first name only).
  - `002_interest_groupings.sql`: `context_packs`, `group_memberships` (with versioning), and `move_student_group` RPC.
  - `003_block_events.sql`: `block_events` logging dwell seconds, attempts, and completion status.
  - `004_rls_policies.sql`: Multi-tenant isolation enforcement.
  - `005_sel_profile.sql`: Student wheel intake and SEL check-in tables.

## Constraints & Invariants
- **First Name Only**: Table `public.students` carries only `first_name`. Never add `last_name`, `email`, or `password`.
- **No Service Role**: App client never uses `service_role`. All tenant access is scoped through teacher auth session.
- **Monotonic Timestamps**: Migration filenames must sort strictly chronologically.

## Outputs
- Monotonic SQL migrations ready for `supabase/migrations/`.
- Verified passing RLS attack tests.

## Check
Run command:
```bash
npm run test:db
```
First line of `check.md` must be `pass`.
