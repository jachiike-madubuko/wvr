# Task Checklist — QA Polish Pass (Nov 26, 2026)

Plan: `tasks/qa-polish-plan.md`

## Task 1: Remove redundant check-in pill row on Student Profile
- [x] Delete pill-button row in `src/components/room/profile/CheckInTrend.tsx` and wire `testId`, `dataIndex`, and selection ring on SVG `ChartHitPoints`
- [x] Add SSR unit test for `CheckInTrend` in `tests/unit/student-profile.test.ts`
- [x] Update `e2e/student-profile.spec.ts` to assert zero check-in pills and open SEL drawer via SVG hit point
- [x] Task review (spec + quality) clean & committed (`df5efde`)

## Task 2: Direct navigation to a student's current blocks from Profile and Galaxy Popover
- [x] Add `resolveInitialStudent` in `src/lib/student-path/deck.ts` and wire `?student=` SSR `searchParams` in `src/app/s/[token]/page.tsx` + `BlockFlip.tsx`
- [x] Update `View Current Blocks ↗` href in `StudentProfileRoom.tsx` to include `?student=${profile.studentId}`
- [x] Expose `currentPathToken` on `RoomStudent` (`src/lib/room/types.ts`, `src/lib/room/data.ts`) and add `"View current blocks ↗"` link to `student-popover` in `GalaxyHome.tsx`
- [x] Add unit & E2E coverage (`student-blocks.test.ts`, `student-profile.spec.ts`, `room-first.spec.ts`)
- [x] Task review (spec + quality) clean & committed (`b9e6009`)

## Task 3: Open student-picker modal on "Switch" in `/s/[token]`
- [x] Create `src/components/student-path/StudentSwitchModal.tsx` (`role="dialog"`, `aria-modal="true"`, Esc/backdrop/Close dismiss)
- [x] Wire `Switch` button in `BlockFlip.tsx` to open `StudentSwitchModal` and sync `?student=<id>` on pick
- [x] Add unit & E2E coverage (`student-blocks.test.ts`, `student-blocks.spec.ts`)
- [x] Task review (spec + quality) clean & committed (`a588237`, `ecdcd84`)

## Task 4: Gap-free 2-column masonry mosaic with varied block heights on `/s/[token]`
- [x] Create `src/lib/student-path/mosaic-layout.ts` (`mosaicTileHeight`, `mosaicRowSpan`)
- [x] Update `[data-testid="mosaic-grid"]` in `BlockFlip.tsx` to CSS Grid row-span masonry (`grid-auto-rows: 4px`, `grid-auto-flow: dense`) with varied heights in `[136, 236]`px
- [x] Add unit & E2E coverage asserting zero column gaps and varied tile heights (`student-blocks.test.ts`, `student-blocks.spec.ts`)
- [x] Task review (spec + quality) clean & committed (`2ca5e49`)

## Final Checkpoint
- [x] Final whole-branch code review clean (`Ready to merge: Yes`)
- [x] Full verify suite (`check:env`, `check:migrations`, `test:db` 32/32, `tsc --noEmit`, `vitest` 86/86, `next build`, all 15 Playwright E2E specs) passes
- [x] Restart local test server on `http://127.0.0.1:3000` (commits ready on `main`; push on user confirmation)
