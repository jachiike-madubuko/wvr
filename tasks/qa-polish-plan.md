# Implementation Plan: QA Polish Pass (Nov 26, 2026)

## Overview
Address five targeted UI/UX QA comments raised during live testing on `http://127.0.0.1:3000`:
1. Remove the redundant check-in mood pill row below the Daily Check-ins chart on Student Profile while preserving direct SVG hit-point interaction and keyboard accessibility.
2. Add direct-to-student block navigation (`/s/[token]?student=<studentId>`) from both the Student Profile header (`View Current Blocks ↗`) and the Galaxy student hover popover, skipping the student selection screen.
3. Turn the `Switch` button on `/s/[token]` into an in-place modal student picker instead of replacing the lesson view with the full-page selection screen.
4. Eliminate vertical gaps above tiles in the `/s/[token]` mosaic deck and give each block varied heights within a reasonable readable range.

## Global Constraints
- **Fail-Closed Invariants (AGENTS.md):**
  1. First Name Only (`public.students` carries only `first_name`; zero PII in URLs — pass student UUID only in `?student=<uuid>`).
  2. Anonymous Capability Links (`/s/[token]`, fail-closed on unknown token; fail-closed on unknown `?student=<uuid>` by falling back to the roster picker).
  3. Zero secret keys in web bundles (`check:env` passes).
  4. Teacher-facing offline interventions only (never mutate child deck).
  5. Zero external chart bloat (`@visx/*` + `d3-shape` only).
  6. No DB schema changes required; never touch `seed/` or existing migrations `001`–`008`.
- **Direct test compatibility:** Visiting `/s/demo-space-lesson` with no `?student=` query parameter MUST still show `data-testid="roster-picker"`.
- **No hydration mismatches:** Varied mosaic tile heights must be deterministic across SSR and client hydration (seeded hash, never `Math.random()` during render).
- **Zero vertical gap in mosaic:** Adjacent tiles in the same column must be separated by exact `16px` (`MOSAIC_GAP`) with no row-alignment gaps above shorter columns' next tile, while keeping all tile `<button>` elements as direct children of `[data-testid="mosaic-grid"]` and preserving `hook` as `data-span="2"` and 2-column reading order (`ela` left, `art` right).
- **Pre-existing dirty files:** Never stage or commit `.gitignore` or untracked `vercel.json`. Always stage files explicitly by path.
- **Sandbox note for implementers:** Run `node scripts/check-env.mjs`, `./node_modules/.bin/tsc --noEmit`, and `./node_modules/.bin/vitest run` directly (rather than `npm run ...`). Do not run `next build` or Playwright inside individual task subagents unless needed; unit tests + typecheck are required per task, and full build + Playwright E2E runs at checkpoints and final verification by the controller.

## Architecture Decisions
- **Direct student URL param (`?student=<uuid>`):** Uses existing UUID (zero PII) read via Next.js 16 async `searchParams` in `src/app/s/[token]/page.tsx`, validated fail-closed against `roster` in `BlockFlip.tsx`.
- **In-place Switch Modal:** Extracted to `src/components/student-path/StudentSwitchModal.tsx` (`role="dialog"`, `aria-modal="true"`, Escape/backdrop/Close dismiss) so `BlockFlip.tsx` stays readable and avoids tearing down lesson state when cancelled. Selecting a student updates `?student=<id>` via `window.history.replaceState`.
- **CSS Grid Row-Span Masonry (`grid-auto-rows: 4px`, `grid-auto-flow: dense`):** Keeps direct `<button>` children inside `[data-testid="mosaic-grid"]`, natively supports `grid-column: 1 / -1` on the wide `hook` tile, maintains shortest-column packing with exact `16px` vertical gaps, and preserves 2-column reading order.

## Task List

### Task 1: Remove redundant check-in pill row on Student Profile
**Description:** Remove the `<div className="mt-2 flex flex-wrap gap-2">` pill button row below the Daily Check-ins SVG chart in `CheckInTrend.tsx`, while ensuring the existing SVG `ChartHitPoints` carry accurate `dataIndex`, `testId`, and selection feedback for both pointer and keyboard interaction.

**Acceptance criteria:**
- [ ] `src/components/room/profile/CheckInTrend.tsx` renders no pill buttons (`checkin-btn-*`) below the SVG chart.
- [ ] Each SVG hit point in `CheckInTrend.tsx` passes `testId: \`checkin-point-${pt.id}\``, `dataIndex` matching its date row index in `series.rows`, and visual selection feedback (`flagged: selectedId === pt.id`), remaining clickable and keyboard-focusable (`role="button"`, `tabIndex={0}`).
- [ ] Unit test in `tests/unit/student-profile.test.ts` verifies `CheckInTrend` omits pill buttons and renders focusable SVG hit points.
- [ ] `e2e/student-profile.spec.ts` asserts zero pill buttons inside `[data-testid="checkin-trend"]` and opens the SEL Action Chat drawer via the SVG `dip` hit point.

**Verification:**
- [ ] `./node_modules/.bin/tsc --noEmit` exits 0
- [ ] `./node_modules/.bin/vitest run tests/unit/student-profile.test.ts` passes cleanly

**Dependencies:** None

**Files likely touched:**
- `src/components/room/profile/CheckInTrend.tsx`
- `tests/unit/student-profile.test.ts`
- `e2e/student-profile.spec.ts`

**Estimated scope:** Small (3 files)

---

### Task 2: Direct navigation to a student's current blocks from Profile and Galaxy Popover
**Description:** Support `?student=<studentId>` on `/s/[token]` to pre-select the matching roster student and skip the selection screen, wire `View Current Blocks ↗` on Student Profile to include `?student=<studentId>`, expose `currentPathToken` on `RoomStudent`, and add a matching nav button inside the Galaxy hover popover (`student-popover`).

**Acceptance criteria:**
- [ ] `src/app/s/[token]/page.tsx` reads async `searchParams` (`student`) and passes `initialStudentId` to `BlockFlip`.
- [ ] `src/components/student-path/BlockFlip.tsx` resolves `initialStudentId` against `roster` (using a small pure helper `resolveInitialStudent(roster, initialStudentId)` exported from `src/lib/student-path/deck.ts`) and skips `roster-picker` when matched; unknown/omitted `student` still shows `roster-picker`.
- [ ] `src/components/room/StudentProfileRoom.tsx` sets `data-testid="view-current-blocks"` href to `/s/${profile.currentPathToken}?student=${profile.studentId}`.
- [ ] `src/lib/room/types.ts` and `src/lib/room/data.ts` expose `currentPathToken: string | null` on `RoomStudent` (`"demo-space-lesson"` when lesson blocks exist, else `null`).
- [ ] `src/components/room/GalaxyHome.tsx` renders a nav link (`data-testid="popover-view-blocks"`, label `"View current blocks ↗"`) inside `student-popover` linking to `/s/${popover.student.currentPathToken}?student=${popover.student.id}` whenever `currentPathToken` is present, positioned cleanly above or alongside `"View profile"` without breaking edge-flip placement.
- [ ] Unit test in `tests/unit/student-blocks.test.ts` covers `resolveInitialStudent` (valid ID, unknown ID, undefined).
- [ ] `e2e/student-profile.spec.ts` verifies `view-current-blocks` href includes `?student=${mayaId}` and clicking it lands directly on Maya's blocks view (no `roster-picker`).
- [ ] `e2e/room-first.spec.ts` verifies `student-popover` displays `popover-view-blocks` for Maya with `?student=${mayaId}` and clicking it skips `roster-picker`.

**Verification:**
- [ ] `./node_modules/.bin/tsc --noEmit` exits 0
- [ ] `./node_modules/.bin/vitest run tests/unit/student-blocks.test.ts tests/unit/galaxy-popover-position.test.ts` passes cleanly

**Dependencies:** None (touches `e2e/student-profile.spec.ts`, so run after Task 1)

**Files likely touched:**
- `src/lib/student-path/deck.ts`
- `src/app/s/[token]/page.tsx`
- `src/components/student-path/BlockFlip.tsx`
- `src/components/room/StudentProfileRoom.tsx`
- `src/lib/room/types.ts`
- `src/lib/room/data.ts`
- `src/components/room/GalaxyHome.tsx`
- `tests/unit/student-blocks.test.ts`
- `e2e/student-profile.spec.ts`
- `e2e/room-first.spec.ts`

**Estimated scope:** Medium

---

### Task 3: Open student-picker modal on "Switch" in `/s/[token]`
**Description:** Replace the full-page teardown when clicking `Switch` on `/s/[token]` with an accessible modal dialog listing roster students to pick from, keeping the active lesson mounted behind it until a new student is selected.

**Acceptance criteria:**
- [ ] Create `src/components/student-path/StudentSwitchModal.tsx` rendering an accessible modal (`role="dialog"`, `aria-modal="true"`, `data-testid="student-switch-modal"`) with roster students (avatar + firstName, highlighting the currently selected student), a close button, backdrop-click dismiss, and `Escape` key dismiss.
- [ ] In `src/components/student-path/BlockFlip.tsx`, clicking `Switch` (`data-testid="switch-student-btn"`) opens `StudentSwitchModal` without setting `student` to `null`.
- [ ] Selecting a student in the modal updates `student`, resets `activeTab` to `"blocks"`, clears `flip`, `unlockToast`, and `simToast`, syncs `?student=<id>` via `window.history.replaceState`, and closes the modal.
- [ ] Pressing `Escape` or clicking Close/backdrop dismisses the modal and leaves the current student active.
- [ ] Unit test in `tests/unit/student-blocks.test.ts` verifies `StudentSwitchModal` renders all roster names, dialog semantics, and marks the active student (`aria-current="true"`).
- [ ] `e2e/student-blocks.spec.ts` verifies clicking `Switch` opens `student-switch-modal` (without showing `roster-picker`), `Escape` closes it while keeping the current student, and picking another student switches the header & URL `?student=` cleanly.

**Verification:**
- [ ] `./node_modules/.bin/tsc --noEmit` exits 0
- [ ] `./node_modules/.bin/vitest run tests/unit/student-blocks.test.ts` passes cleanly

**Dependencies:** Task 2 (`?student=` URL handling in `BlockFlip.tsx`)

**Files likely touched:**
- `src/components/student-path/StudentSwitchModal.tsx` (new)
- `src/components/student-path/BlockFlip.tsx`
- `tests/unit/student-blocks.test.ts`
- `e2e/student-blocks.spec.ts`

**Estimated scope:** Small (4 files)

---

### Task 4: Gap-free 2-column masonry mosaic with varied block heights on `/s/[token]`
**Description:** Eliminate vertical row-alignment gaps above tiles in `[data-testid="mosaic-grid"]` using CSS Grid row-span masonry (`grid-auto-rows: 4px`, `grid-auto-flow: dense`) and assign each tile a deterministic pseudo-random height within `[136, 236]`px (multiples of 4px).

**Acceptance criteria:**
- [ ] Create `src/lib/student-path/mosaic-layout.ts` exporting `MOSAIC_ROW_UNIT = 4`, `MOSAIC_GAP = 16`, `MOSAIC_MIN_HEIGHT = 136`, `MOSAIC_MAX_HEIGHT = 236`, `mosaicTileHeight(blockId: string, seed?: string): number`, and `mosaicRowSpan(heightPx: number): number`.
- [ ] `mosaicTileHeight` returns deterministic multiples of `MOSAIC_ROW_UNIT` within `[MOSAIC_MIN_HEIGHT, MOSAIC_MAX_HEIGHT]` with strong spread across block IDs (no `Math.random()`, zero SSR hydration mismatch).
- [ ] `BlockFlip.tsx` updates `[data-testid="mosaic-grid"]` to `grid grid-cols-2 gap-x-4 gap-y-0 [grid-auto-flow:dense]` with `style={{ gridAutoRows: \`${MOSAIC_ROW_UNIT}px\` }}`.
- [ ] Each tile `<button>` stays a direct child of `[data-testid="mosaic-grid"]`, computes `tileHeight = mosaicTileHeight(block.id, student.id)` (or wide hook height in range), sets `height: tileHeight`, `gridRowEnd: \`span ${mosaicRowSpan(tileHeight)}\``, `alignSelf: "start"`, and `data-tile-height={tileHeight}`.
- [ ] Unit test in `tests/unit/student-blocks.test.ts` verifies `mosaicTileHeight` stays in `[136, 236]` (multiple of 4), produces varied heights (`>= 4` distinct values across the 11 Space blocks), is deterministic, and `mosaicRowSpan` equals `(h + 16) / 4`.
- [ ] `e2e/student-blocks.spec.ts` asserts: (a) all non-hook tiles have heights within `[136, 236]`px with `>= 3` distinct heights; (b) in each column (left and right), every consecutive pair of tiles has vertical gap `16px ± 2px` (zero excess gap above tile #4 or any other tile); (c) hook remains `data-span="2"` and `ela` is left of `art`.

**Verification:**
- [ ] `./node_modules/.bin/tsc --noEmit` exits 0
- [ ] `./node_modules/.bin/vitest run tests/unit/student-blocks.test.ts` passes cleanly

**Dependencies:** Task 3 (shared file `BlockFlip.tsx`)

**Files likely touched:**
- `src/lib/student-path/mosaic-layout.ts` (new)
- `src/components/student-path/BlockFlip.tsx`
- `tests/unit/student-blocks.test.ts`
- `e2e/student-blocks.spec.ts`

**Estimated scope:** Small (4 files)

---

### Checkpoint: Complete & Final Verification
- [ ] Final whole-branch code review (`pro` model) clean
- [ ] Full verify suite passes: `check:env`, `check:migrations`, `test:db`, `tsc --noEmit`, `vitest run`, `next build`
- [ ] Full Playwright E2E suite passes (`room-first`, `student-profile`, `student-blocks`, `demo-data-mode`, `demo-simulation`, `core-demo-loop`)
- [ ] Local test server restarted on `http://127.0.0.1:3000` serving the newly built bundle
