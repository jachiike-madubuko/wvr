# Implementation Plan: Nov 26, 2026 Video Updates (Galaxy/Calendar + Lesson Simulation)

## Overview

Implement all 7 approved issues from the Nov 26, 2026 dev spec in strict dependency order, applying minimal high-craft frontend engineering (`ponytail [ultra]`, WCAG 2.1 AA keyboard/focus accessibility, existing design tokens, zero new chart/analytics dependencies). Each task lands as its own verified commit, pushed to `origin/main`, with its corresponding Linear issue updated in tandem.

**Task Tracker:** Linear workspace `weaver-edu`, team **WVR**, project **Weavr Clean Rebuild** (`WVR-240`, `WVR-236`, `WVR-237`, `WVR-233`, `WVR-238`, `WVR-239`, `WVR-241`). Local mirror checklist in `tasks/todo.md`.

## Architecture Decisions

- **Single tunable config (`src/domain/config/weaver-config.ts`):** `alerts.highAttempts = 3`, `alerts.overTimeSec = 200`, `alerts.idleSec = 60`, `alerts.fastSec = 15`, `alerts.latencyTargetMs = 5000`, `alerts.fastStudentNotice = true`, plus `demoSimulation` defaults. Consumed by mastery node classification (`isStruggleEvent`), simulator (`generateSimulation`), live polling, and minimal alert rules (`evaluateStudent`).
- **Accessible SVG chart hit points:** Removing the redundant pill row in `MasteryChart.tsx` moves `data-testid="mastery-node-<id>"`, `role="button"`, `tabIndex={0}`, `aria-label`, Enter/Space handlers, and `onFocus`/`onBlur` tooltip syncing onto `ChartHitPoints.tsx`.
- **Viewport-safe popover placement:** Pure `placePopover()` helper (`galaxy-popover-position.ts`) places the hover popover to the right of the full student node rect (avatar + name + pace badge) with a 12 px gap, flips left near the right edge, and drops below on very narrow viewports without ever overlapping the node.
- **In-place group pacing breakdown:** Clicking or pressing Enter/Space on a Galaxy pack title opens an anchored `role="dialog"` panel (`GroupPacingBreakdown.tsx`) powered by pure `groupPacing()`, closing on Esc, Close button, or outside click without interfering with dnd-kit drag-and-drop.
- **Monotonic migration (`008_block_events_tracking.sql`):** Never edits `003_block_events.sql`. Uses `CREATE OR REPLACE FUNCTION public.save_student_path_session` preserving signature/grants while copying `students.is_demo` into `student_path_sessions` and `block_events` and appending `public.events` (`student.block_submitted`) with strict allowlisted keys.
- **Demo simulation via `/api/demo` (`action: "simulate"`):** Reuses `assertSafeDemoEnv` + `withUnpooledAdminDb`, verifies demo token + demo student + same class, inserts `block_events` (`is_demo = true`), updates `student_path_sessions` (`is_demo = true`), logs `demo.simulation_run`, and reverts cleanly via existing Reset Current Demo Data.
- **Minimal alert rules slice (`src/domain/alerts/rules.ts`):** Evaluates `high_attempts`, `over_time`, and `fast_student` (`alerts.fastStudentNotice`) from `block_events` respecting `interventionStatus === "resolved"`, surfaced via shared `AlertMark` on Galaxy nodes and Swimlane rows linking to `/students/<id>?alert=<blockEventId>`.
- **Polling only (no websockets):** Visible-tab polling at `alerts.latencyTargetMs` (5000 ms) + focus/visibility refresh in `StudentProfileRoom.tsx` and `RoomStage.tsx`.

## Task List (Build Order)

1. **WVR-240** — Remove redundant label row under Mastery estimate over time chart (`MasteryChart.tsx`, `ChartHitPoints.tsx`, tests)
2. **WVR-236** — Offset Galaxy node hover popover to the right of the student (`galaxy-popover-position.ts`, `GalaxyHome.tsx`, tests)
3. **WVR-237** — Clicking a Galaxy group title opens a group-level pacing breakdown (`group-pacing.ts`, `GroupPacingBreakdown.tsx`, `GalaxyHome.tsx`, tests)
4. **WVR-233** (fixture portion only; keep In Progress) — Varied weekday demo fixtures and Swimlane offsets (`src/lib/demo/seed.ts`, tests)
5. **WVR-238** (+ `weaver-config` §5a) — Track click data and attempts, with attempts as the struggle signal (`weaver-config.ts`, `allowlist.ts`, `BlockFlip.tsx`, `008_block_events_tracking.sql`, `model.ts`, tests)
6. **WVR-239** — Simulate fast and struggling students on `/s/[token]` (Demo Data Mode, revertible, live Mastery chart with real `created_at` x-axis) (`simulate.ts`, `simulate-gate.ts`, `/api/demo/route.ts`, `page.tsx`, `BlockFlip.tsx`, `StudentProfileRoom.tsx`, `MasteryChart.tsx`, `LineChart.tsx`, tests)
7. **WVR-241** — Core demo loop: teacher identifies a struggling student and addresses it (`rules.ts`, `AlertMark.tsx`, `data.ts`, `GalaxyHome.tsx`, `PacingTable.tsx`, `RoomStage.tsx`, `StudentProfileRoom.tsx`, `MasteryChart.tsx`, golden-path E2E)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `LineChart` `scaleTime` collapses when two events share identical `created_at` | High | Ensure distinct `secondsAgo` offsets in simulator and guard `maxDate <= minDate` in `LineChart.tsx` |
| `008_block_events_tracking.sql` missing on Neon DB before E2E runs | High | Run `node scripts/migrate.mjs` after adding migration 008 and verify via PGlite `test-migrations.mjs` |
| `buildPaceSessions` leaking today's `block_events` into weekday demo sessions | Med | Scope `blockEvents` fallback to today's lesson session or students without explicit pathSessions |
| Dirty working tree (`.gitignore`, `next-env.d.ts`, `vercel.json`) committed accidentally | Med | Stage only task-specific files explicitly per commit (`git add <files>`) |
| Out-of-scope §4 triage items (T1–T9) accidentally modified | Med | Keep Maya, Make Ten behavior, bone cursor, Swimlane subject letters, and Phase 4 renames untouched |

## Out of Scope

- All §4 triage items (T1–T9)
- Phase 4 renames/panels (Deliver button, Student Insight, SEL chat changes, Block Builder, `student_alerts` table)
- Harder follow-on work generation (US-38)
- Visible click-playback simulator
- Websockets or new analytics vendors
- Reopening or commenting on WVR-228, WVR-229, WVR-230, or WVR-234
