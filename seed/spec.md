# Weavr — Clean Rebuild Frontend Specification & Handoff

> Comprehensive specification for all 4 primary UI surfaces, inter-screen navigation flow, and verified interactive prototypes.

---

## 1. Global Navigation & Flip Architecture

The UI operates as a connected multi-surface stage:
- **Galaxy (Home)** ↔ **Pace Calendar**: Front and back faces of a single 3D CSS perspective card (`.wv-flip-scene`). Flipping is triggered via navbar buttons (`Galaxy G` / `Calendar C`) or keybindings.
- **Student Node / Swimlane Click**: Clicking any student avatar in Galaxy or row in Calendar opens the **Student Profile** overlay for that student.
- **Current Blocks CTA**: Inside the Student Profile header, clicking **"View Current Blocks ↗"** switches to the student's active **Block Deck** view.
- **Back Navigation**: Returning from Blocks restores the Student Profile; closing the Profile restores the prior Galaxy/Calendar state.

---

## 2. Screen Specifications

### Screen 1: Galaxy Field (Home)
- **Files in `seed/`**:
  - `GalaxyFieldSnippet.tsx`: Canvas field with ambient starfield and dynamic cluster layout.
  - `GalaxyPackCardSnippet.tsx`: Interest group hub cards (*Cooking*, *Video Games*, *Space*, *Music*, *Fashion*, *Animals*).
  - `GalaxyPopoverDelay.ts`: Strict **500ms hover delay** before opening the student overview popover.
  - `GalaxyDragHighlightSnippet.tsx`: Active drag-and-drop highlight box around target group clusters.
- **Interactive Rules**:
  - Student nodes orbit their assigned interest group.
  - Nodes display pace badges (`FAST` in mint, `SLOW` in coral).
  - Hovering a student for 500ms displays current lesson status and a *"View profile"* CTA.
  - Clicking a student directly opens their Profile.

---

### Screen 2: Pace Calendar & Swimlanes
- **Files in `seed/`**:
  - `CalendarGridSnippet.tsx`: 5-day week grid with day cells, today highlight, and pace distribution summary.
  - `WavyStackBar.tsx` & `waveUtils.ts`: SVG cubic Bézier wavy stacked-bar rendering 3 distinct color bands:
    - **Ahead** (`var(--signal-mint)` / `#48e29a`)
    - **On Pace** (`var(--signal-blue)` / `#58b6fa`)
    - **Behind** (`var(--signal-coral)` / `#f87171`)
  - `PacingTable.tsx`: Swimlane table alternative view grouping students by subject pace, flagging slow students for teacher intervention.

---

### Screen 3: Student Profile & Teacher Interventions
- **Directory**: `seed/student-profile/` (Detailed breakdown in `seed/student-profile/SPEC.md`)
- **Key Files**:
  - `StudentProfileRoom.tsx`: Main profile coordinator.
  - `ProfileRadar.tsx`: **Weaver Wheel** spider chart derived from student intake attributes (Emotional Reg, Focus, Engagement, Task Completion, Social).
  - `CheckInTrend.tsx`: Morning (AM) and afternoon (PM) student check-in trendline.
  - `MasteryChart.tsx`: Full-width **Mastery estimate over time** performance line graph tracking completion speed and attempt count.
  - `ProfileDrawer.tsx` & `MasteryDetailCard.tsx`: Slide-out right side drawer for offline teacher actions:
    - **SEL Action Chat Drawer**: Triggered by clicking check-in dips.
    - **3-Step Coaching Drawer**: Triggered by clicking red struggle points on the mastery line. Displays target misconception and 3-step physical offline plan (*Manipulative Check*, *Partner Scaffolding*, *Quick Check*).
  - Route: `app/students/[studentId]/page.tsx`
  - Tests: `StudentProfileRoom.test.tsx`, `MasteryChart.test.tsx`, `CheckInTrend.test.tsx`, `ProfileDrawer.test.tsx`.

---

### Screen 4: Student Blocks (Continuous Deck)
- **Directory**: `seed/student-blocks/` (Detailed breakdown in `seed/student-blocks/SPEC.md`)
- **Key Files**:
  - `library.ts`: Canonical registry of **6 Types · 21 Sub-types** across the 4 lifecycle roles:
    - `Start` (`var(--pin-hook)` / Yellow): Reading hooks, audio narrative, setup steps.
    - `Try` (`var(--pin-try)` / Sky Blue): Interactive drawing canvas (`DrawPad.tsx`), manipulatives, riddles.
    - `Check` (`var(--pin-check)` / Mint): Formative questions, sight words, student voice recorder.
    - `Next` (`var(--pin-next)` / Purple): Open-ended art studio, project synthesis.
  - `space-pins.ts`: Real lesson block mosaic data mapper (`spaceFlipBlocks()`).
  - `BlockFlip.tsx`: Student deck controller rendering the **YouTube-thumbnail mosaic layout** (wide hero video card on top, 2-column tiles below, sequential padlock gating, and 3D card flips).
  - Tests: `BlockFlip.test.tsx`.

---

## 3. Verified Previews (`seed/previews/`)

Standalone, zero-dependency HTML files ready for instant browser testing:
- **`unified-flow.html`**: **The all-in-one prototype**. Implements 3D flip between Galaxy and Calendar, student clicks to Profile, slide-out 3-step intervention drawer on struggle nodes, and "View Current Blocks" navigation into the live YouTube-thumbnail deck.
- `01-galaxy-home.html`: Standalone Galaxy starfield with clusters and 500ms hover popovers.
- `02-pacing-calendar.html`: Standalone Wavy Stack calendar and swimlane pacing table.
- `03-student-profile.html`: Standalone student profile with Weaver Wheel, check-ins, and performance line graph.
- `04-student-blocks.html`: Standalone YouTube-thumbnail mosaic deck with modal flips.
- `index.html`: Portal launcher listing all previews.

---

## 4. Handoff Instructions for Next Agent

When integrating from `seed/`:
1. **Copy UI components** into their target paths:
   - `seed/student-profile/*` → `src/components/room/profile/` and `src/components/room/`
   - `seed/student-profile/app/students/[studentId]/page.tsx` → `src/app/students/[studentId]/page.tsx`
   - `seed/student-blocks/*` → `src/components/student-path/` and `src/lib/blocks/`
   - `seed/Galaxy*` and `seed/Calendar*` → `src/components/room/`
2. **Keep Zero-Dependency Charting**:
   - All charts must import from `@/components/charts/*` (internal bklitUI library powered by `@visx/*` and `d3-shape`). Do not add external chart packages.
3. **Run Pre-Commit Verification**:
   ```bash
   npm run check:env
   npm test
   npm run build
   ```
