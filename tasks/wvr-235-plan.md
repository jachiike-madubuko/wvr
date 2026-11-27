# Implementation Plan: WVR-235 — Weaver Wheel Teacher Input (Radar Drag)

## Overview

Implement the teacher-authored Weaver Wheel input UI on Student Profile using the decided **v2 Radar drag** pattern with **+/− steppers collapsed by default** behind an accessible disclosure button. Values are stored raw (`1..5` or `NULL` = Not set) in a new `public.student_wheel_scores` table under teacher-only RLS with optimistic concurrency (`version`), fail-closed load/save semantics, local draft autosave with Resume/Discard, and full mobile/keyboard/screen-reader accessibility.

**Task Tracker:** Linear `WVR-235` (team `WVR`, project `Weavr Clean Rebuild`). Branch: `jachiikemadubuko/wvr-235-weaver-wheel-teacher-input-ui`. Local plan & checklist live exclusively in this file (`tasks/wvr-235-plan.md`) so `tasks/plan.md` and `tasks/todo.md` remain untouched.

## Architecture Decisions

- **Monotonic migration `009_student_wheel_scores.sql`** (shifted from `008` in spec because `008_block_events_tracking.sql` already exists on `main`). Approved by Jah on 2026-11-26 to apply to Neon for real-DB E2E (AC-5, AC-34).
- **Ponytail trims (zero behavior/validation/a11y dropped):**
  - Inline localStorage draft helpers (`readDraft`, `writeDraft`, `clearDraft`) directly in `WeaverWheelPanel.tsx` instead of a separate single-use `useWheelDraft.ts`.
  - Rely on `ON DELETE CASCADE` on `student_wheel_scores.student_id -> students(id)` for demo cleanup instead of modifying `clearDemoData()` in `src/lib/demo/seed.ts`.
  - Render dashed Not-set axes & hollow tip rings inside `ProfileRadar.tsx` without mutating vendored `src/components/charts/radar-*.tsx`.
- **Fail-closed load isolation:** `getStudentProfile` fetches `getWheelScores` in its own `try/catch` producing `wheel: WheelLoad`, so wheel load errors affect only the wheel panel on both SSR and `useLiveProfile` 5s polling. `WeaverWheelPanel` never clobbers an active edit/draft on background poll ticks.
- **Keep `student_wheel_answers` and `buildWeaverWheel` intact** (OQ-13), unused by the radar. Keep `data-testid="profile-radar"` and the 5 dimension labels so `e2e/student-profile.spec.ts` stays green.
- **Proposed defaults built (still open for Jah):** OQ-D1 (collapsed each edit, not persisted), OQ-D2 (Delete/Backspace clears on handle; touch expands and uses Clear), OQ-1 (1–5 raw, ×20 at draw, centre = Not set), OQ-3 (partial save ≥1), OQ-10 (`student_wheel_scores` Option A), OQ-12 (409 `VERSION_CONFLICT`), OQ-14 (`localStorage` ids+ints only), OQ-15 (`student.wheel_updated` payload `{ studentId, setCount }`), OQ-16 (toggle copy & 2-line value box layout).

## Task List

### Task 1: Pure wheel model, 72° wedge geometry & unit tests
**Description:** Create the closed 5-dimension enum, strict parser/validator (never clamps or rounds), ARIA/caption formatters, relative-time helper, and polar wedge hit-testing/snapping math, backed by Vitest unit suites.
- [x] `src/lib/students/wheel.ts`
- [x] `src/lib/students/wheel-geometry.ts`
- [x] `tests/unit/wheel-model.test.ts`
- [x] `tests/unit/wheel-geometry.test.ts`
- **Verification:** `npx vitest run tests/unit/wheel-model.test.ts tests/unit/wheel-geometry.test.ts && npm run typecheck`
- **Dependencies:** None | **Scope:** S (4 files)

### Task 2: Migration `009_student_wheel_scores.sql`, PGlite RLS suite & Neon apply
**Description:** Add monotonic migration `009_student_wheel_scores.sql` with 1–5 checks, at-least-one check, `set_updated_at` trigger, teacher-only RLS policy, and `weavr_app` grants; add PGlite RLS & constraint tests; add Maya's demo row in `db/seed.sql`; apply to Neon (approved).
- [x] `db/migrations/009_student_wheel_scores.sql`
- [x] `scripts/test-migrations.mjs`
- [x] `db/seed.sql`
- [x] Apply migration to Neon (`npm run db:migrate`) and seed demo wheel row
- **Verification:** `npm run verify:db`
- **Dependencies:** Task 1 | **Scope:** S (3 files)

### Task 3: Server data layer, `/api/students/[studentId]/wheel` API & profile load isolation
**Description:** Implement `getWheelScores`, `saveWheelScores` (optimistic `version` check → `WheelVersionConflict`, allowlisted `student.wheel_updated` event), `GET`/`PUT /api/students/[studentId]/wheel`, and attach isolated `wheel: WheelLoad` to `StudentProfileSnapshot`.
- [x] `src/lib/students/model.ts`
- [x] `src/lib/students/data.ts`
- [x] `src/app/api/students/[studentId]/wheel/route.ts`
- **Verification:** `npm run verify`
- **Dependencies:** Tasks 1, 2 | **Scope:** M (3 files)

### Checkpoint 1: Foundation
- [x] `npm run verify` exits 0 (env, monotonic 001..009, PGlite RLS, TypeScript, Vitest)

### Task 4: Radar visual layer, interactive SVG edit overlay & stepper disclosure
**Description:** Update `ProfileRadar` for raw 1–5 scores (dashed Not-set axes, hollow tip rings, optional faint saved fill, responsive size), build `WheelEditOverlay` (absolute SVG, `touch-action: none` in edit only, wedge pointer capture, 150ms rAF tween + reduced-motion, 48px `role="spinbutton"` handles, `preventScroll: true`), and build `WheelStepperDisclosure` (collapsed default, `aria-expanded`/`aria-controls`, 3-line 360px layout with ≥16px line-1 slack).
- [x] `src/components/room/profile/ProfileRadar.tsx`
- [x] `src/components/room/profile/WheelEditOverlay.tsx`
- [x] `src/components/room/profile/WheelStepperDisclosure.tsx`
- **Verification:** `npm run typecheck && npm test`
- **Dependencies:** Task 1 | **Scope:** M (3 files)

### Task 5: `WeaverWheelPanel` state machine & `StudentProfileRoom` integration
**Description:** Build `WeaverWheelPanel` (`loading | error | view | edit`, fail-closed load/save, inline `localStorage` draft helpers with Resume/Discard, sticky bar with safe-area padding, `confirm()` on dirty Cancel/Escape/in-page links, live regions, provenance, caption, relative timestamp) and wire into `StudentProfileRoom` without letting 5s background polling clobber active edits.
- [x] `src/components/room/profile/WeaverWheelPanel.tsx`
- [x] `src/components/room/StudentProfileRoom.tsx`
- **Verification:** `npm run verify && npm run build`
- **Dependencies:** Tasks 3, 4 | **Scope:** S (2 files)

### Checkpoint 2: Feature Complete
- [x] `npm run verify && npm run build` exits 0

### Task 6: Playwright E2E suite (`e2e/weaver-wheel-editor.spec.ts`), commit & Linear sync
**Description:** Add Playwright E2E coverage for AC-1..AC-34 at `360×780` and `430×932` (touch drag without scroll, swipe below scrolls, 48px handles, line-1 slack ≥16px, disclosure a11y + keyboard edit while collapsed, empty save blocked, dirty confirm, Resume/Discard, real-DB save + reload, load failure fails closed + Retry, save failure + 409 conflict keep draft). Verify existing `e2e/student-profile.spec.ts`, commit locally, and update Linear `WVR-235`.
- [x] `e2e/weaver-wheel-editor.spec.ts`
- [x] `npm run verify && npm run build && npm run test:e2e`
- [x] Local commit (stage only WVR-235 files) & Linear `WVR-235` completion comment + status sync
- **Dependencies:** Task 5 | **Scope:** S (1 file)

### Checkpoint 3: Complete
- [x] All non-iPhone ACs (AC-1..AC-34) passing; iPhone checks (T-16, T-41, T-37, R-11 iOS font) documented as pending on WVR-235

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `useLiveProfile` 5s polling overwrites edit state or draft | High | Guard state sync in `WeaverWheelPanel` so polling updates only when `state.kind === "view"` and never replaces active edit/draft |
| Existing `e2e/student-profile.spec.ts` expects full 5 labels inside `[data-testid="profile-radar"]` | Med | Keep `data-testid="profile-radar"` on the panel wrapper so full names in the values line / labels are always present for Maya |
| Uncommitted working-tree files (`.gitignore`, `tasks/todo.md`, `tasks/qa-polish-plan.md`, `vercel.json`) swept into commit | Med | Stage only explicit WVR-235 paths with `git add <files>` |
| Chromium touch drag behavior vs `page.mouse` in Playwright | Med | Use real `pointer` / CDP touch events where needed and verify scrollY stays unchanged during radar drag while swiping below scrolls |
