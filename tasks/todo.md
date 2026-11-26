# Task Checklist — Nov 26, 2026 Video Updates

Tracked in Linear (`weaver-edu` / **WVR** / **Weavr Clean Rebuild**). One commit + push + Linear update per completed task.

## Task 1: WVR-240 — Remove redundant label row under Mastery estimate over time chart
- [x] Delete pill-button row under `LineChart` in `src/components/room/profile/MasteryChart.tsx`
- [x] Move `data-testid="mastery-node-${id}"` and keyboard button semantics (`role="button"`, `tabIndex={0}`, `aria-label`, Enter/Space, `onFocus`/`onBlur` tooltip) to `ChartHitPoints.tsx`
- [x] Add unit test verifying label row removal + keyboard Enter selection
- [x] Update/extend `e2e/student-profile.spec.ts` and `e2e/demo-data-mode.spec.ts` (click + keyboard Tab/Enter)
- [x] Verify (`check:env`, `check:migrations`, `test:db`, `typecheck`, `test`, `build`, E2E), commit, push, update **WVR-240**

## Task 2: WVR-236 — Offset Galaxy node hover popover to the right of the student
- [x] Create pure placement helper `src/components/room/galaxy-popover-position.ts` (`placePopover`, 12 px gap, flip left, below fallback, never overlaps node)
- [x] Update `GalaxyHome.tsx` to measure whole node at open time, re-measure popover in `useLayoutEffect`, expose `data-side`, preserve hover timers & orbit pause
- [x] Add unit test `tests/unit/galaxy-popover-position.test.ts`
- [x] Extend `e2e/room-first.spec.ts` to assert non-overlapping right/left placement + clickable View profile at 1280px and 390px
- [x] Verify, commit, push, update **WVR-236**

## Task 3: WVR-237 — Clicking a Galaxy group title opens a group-level pacing breakdown
- [x] Create pure aggregation helper `src/components/room/group-pacing.ts` (`groupPacing`)
- [x] Create `src/components/room/GroupPacingBreakdown.tsx` (`role="dialog"`, Esc/Close/outside-click dismiss, band split + urgency-sorted per-student list)
- [x] Make `PackCluster` group titles clickable/keyboard-operable `<button>` in `GalaxyHome.tsx` (`onPointerDown` stopPropagation so drag still works)
- [x] Add unit test `tests/unit/group-pacing.test.ts`
- [x] Extend `e2e/room-first.spec.ts` (click, Esc close, keyboard Tab+Enter, drag still works)
- [x] Verify, commit, push, update **WVR-237**

## Task 4: WVR-233 (fixture portion only) — Varied weekday demo fixtures & Swimlane offsets
- [x] Extend `src/lib/demo/seed.ts` with deterministic UUIDv5 weekday lesson blocks (`CURRENT_DATE`-anchored, past+today only), per-student per-day dwell profiles, keep-list updates, and varied Swimlane event inputs (keep Maya, keep layouts/labels)
- [x] Ensure `buildPaceSessions` preserves per-day session profiles without overwriting non-today days
- [x] Extend `tests/unit/demo-seed.test.ts` (multi-band weekdays, idempotency, profile switch keeps blocks, clear removes them)
- [x] Extend `e2e/demo-data-mode.spec.ts` (after Reset, Calendar Week has multiple wavy days and mixed bands)
- [x] Verify, commit, push, comment + tick Nov 26 ACs on **WVR-233** (do NOT change status)

## Task 5: WVR-238 + `weaver-config` (§5a) — Track click data & attempts as struggle signal
- [x] Create `src/domain/config/weaver-config.ts` and switch `buildMasteryNodes` in `src/lib/students/model.ts` to `isStruggleEvent()`
- [x] Create `src/lib/events/allowlist.ts` (`EVENT_PAYLOAD_KEYS`, `assertAllowedPayload`)
- [x] Generalize attempt tracking (`recordAttempt`) in `src/components/student-path/BlockFlip.tsx` across `text.question`, `riddle`, `pbl.manipulative`, `game.brain` (keep Make Ten target/button behavior intact)
- [x] Add `db/migrations/008_block_events_tracking.sql` recreating `save_student_path_session` to propagate `students.is_demo` and append `student.block_submitted` to `public.events`
- [x] Apply migration `008` to Neon DB (`node scripts/migrate.mjs`)
- [x] Add unit tests (attempt counting, payload sanitizer, allowlist) + migration tests in `scripts/test-migrations.mjs` + E2E test in `e2e/student-blocks.spec.ts`
- [x] Verify, commit, push, update **WVR-238**

## Task 6: WVR-239 — Simulate fast & struggling students on `/s/[token]` (Demo Data Mode, revertible, live Mastery chart)
- [x] Create `src/lib/demo/simulate.ts` (`generateSimulation`) driven by `weaverConfig`
- [x] Create server-only `src/lib/demo/simulate-gate.ts` (`isDemoSimulationEnabled`)
- [x] Extend `src/app/api/demo/route.ts` with `action: "simulate"` (reusing `assertSafeDemoEnv`, `withUnpooledAdminDb`, `is_demo = true`, `block_events` + `student_path_sessions` + `demo.simulation_run`)
- [x] Pass `simulationEnabled` from `src/app/s/[token]/page.tsx` to `BlockFlip.tsx`; render secondary dashed "Simulate fast student" & "Simulate struggling student" buttons next to Home / Switch
- [x] Add live polling (`alerts.latencyTargetMs`, visible-tab + focus) to `StudentProfileRoom.tsx` and plot real `created_at` timestamps on `MasteryChart.tsx` / `LineChart.tsx`
- [x] Add unit tests (`simulate.test.ts`), DB/API tests, and E2E spec `e2e/demo-simulation.spec.ts`
- [x] Verify, commit, push, update **WVR-239**

## Task 7: WVR-241 — Core demo loop: teacher identifies a struggling student and addresses it
- [x] Create `src/domain/alerts/rules.ts` (`evaluateStudent`, minimal Phase 4 WP-E2 slice using `weaverConfig.alerts`)
- [x] Compute `alert?: StudentAlert | null` per student in `getRoomSnapshot()` (`src/lib/room/data.ts`), clearing struggle alert when `interventionStatus === "resolved"` and surfacing `fast_student` when `alerts.fastStudentNotice` is true
- [x] Add visible-tab polling (`alerts.latencyTargetMs`) to `RoomStage.tsx`
- [x] Create `src/components/room/AlertMark.tsx` and render on Galaxy node (`GalaxyHome.tsx`) and Swimlane row (`PacingTable.tsx`)
- [x] Handle `?alert=<blockEventId>` in `StudentProfileRoom.tsx` to preselect & highlight flagged node (`data-flagged="true"`) on `MasteryChart.tsx` and open/trigger offline intervention drawer
- [x] Add unit tests (`alerts-rules.test.ts`), component check, and golden-path E2E spec `e2e/core-demo-loop.spec.ts`
- [x] Verify, commit, push, update **WVR-241**

## Final Checkpoint
- [x] Full `verify:all` pass (env, migrations, PGlite RLS, typecheck, unit tests, production build, all Playwright E2E specs)
- [x] Verify all 7 Linear issues match §9 checklist
- [x] Deliver concise QA test checklist for Jah
