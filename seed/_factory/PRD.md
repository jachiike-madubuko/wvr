# Weavr — Product Requirements Document (PRD)

> **Document Status**: CANONICAL FRONTEND BLUEPRINT  
> **Team**: Weaver (`WVR`)  
> **Linear Project**: [Weavr Clean Rebuild (P-WVR-5)](https://linear.app/weaver-edu/project/weavr-clean-rebuild-73f58bb45938)  
> **Repository**: `weaver-v0` (clean rebuild branch)  

---

## 1. Product Vision & Architecture

K–6 teacher app: calendar-first, standards-aware, interest-personalized lesson packets. Live wedge: grades 2–4 Math + ELA.

The user interface operates as a connected multi-surface stage:
1. **Galaxy Field (Home)** ↔ **Pace Calendar**: The front and back faces of a single 3D CSS perspective card (`.wv-flip-scene`). Flipping is controlled via keyboard shortcuts (`G` / `C`) or navbar pills.
2. **Student Node / Swimlane Selection**: Clicking any student avatar (in Galaxy) or table row (in Calendar) opens the **Student Profile** overlay.
3. **Current Blocks Action**: In the Student Profile header, clicking **"View Current Blocks ↗"** opens the student's active **Block Deck** view.
4. **Offline Interventions**: Flagged struggle points on the student's mastery line trigger a slide-out right-hand drawer providing a 3-step physical teacher coaching plan.

---

## 2. Linear Workflow & Operating Rules

Linear is the single source of truth for all tasks, bug tracking, and implementation status. Markdown docs define specifications; Linear issues track execution.

### Working from Linear Issues
1. **Pick One Issue**:
   - Work strictly from the active project: **Weavr Clean Rebuild** (`P-WVR-5`).
   - Move issue status from `Backlog` to `In Progress` when development starts.
2. **Fail-Closed Invariants**:
   - **First Name Only**: Student records (`public.students`) carry only `first_name`. No student logins, no last names, no emails, no photos, no passwords.
   - **Capability Links**: The student route is an unguessable capability link (`/s/[token]`). Tokens hashed via SHA-256 against `student_path_tokens`. No student auth session.
   - **`service_role` Never in App Code**: The web client runs under the authenticated teacher session. RLS applies to all public tables.
   - **Offline Interventions**: The model advises the teacher. Interventions are 3-step physical/coaching plans delivered offline. Never inject automated remediation blocks into the student's device deck.
   - **Zero External Chart Bloat**: Charts must import from `@/components/charts/*` (internal bklitUI library backed by `@visx/*` and `d3-shape`).

### Updating & Completing Linear Issues
- **Done Means Committed**: Never mark a Linear issue `Done` without pushing code and including the commit SHA in the completion comment:
  ```markdown
  Completed in commit <SHA>.
  Verified via npm test and playwright smoke tests.
  ```
- **If unpushed**, leave the issue `In Progress`.
- **Blocking Issues**: If an architectural invariant or dependency issue is found, add a comment to the issue and flag priority.

---

## 3. Screen Specifications

### Screen 1: Galaxy Field (Home)
- **Linear Issue**: [`WVR-228`](https://linear.app/weaver-edu/issue/WVR-228/rebuild-phase-3-screen-1-and-screen-2-3d-flip-room-shell-galaxy)
- **Key Files in `seed/`**:
  - `GalaxyFieldSnippet.tsx`: Radial starfield canvas with ambient nebula.
  - `GalaxyPackCardSnippet.tsx`: Interest group cluster cards (*Cooking*, *Video Games*, *Space*, *Music*, *Fashion*, *Animals*).
  - `GalaxyPopoverDelay.ts`: Strict **500ms hover delay** before opening the student overview popover.
  - `GalaxyDragHighlightSnippet.tsx`: Highlight boundary indicator on drag-and-drop grouping.
- **Interactions**:
  - Student node avatars display pace indicators (`FAST` in mint, `SLOW` in coral).
  - Hovering a student for 500ms shows current lesson status and a *"View profile"* CTA.
  - Clicking a student opens their Profile overlay.

### Screen 2: Pace Calendar & Swimlanes
- **Linear Issue**: [`WVR-228`](https://linear.app/weaver-edu/issue/WVR-228/rebuild-phase-3-screen-1-and-screen-2-3d-flip-room-shell-galaxy)
- **Key Files in `seed/`**:
  - `CalendarGridSnippet.tsx`: 5-day week calendar grid with today highlighting.
  - `WavyStackBar.tsx` & `waveUtils.ts`: SVG cubic Bézier wavy stacked-bar rendering 3 distinct color bands:
    - **Ahead** (`var(--signal-mint)` / `#48e29a`)
    - **On Pace** (`var(--signal-blue)` / `#58b6fa`)
    - **Behind** (`var(--signal-coral)` / `#f87171`)
  - `PacingTable.tsx`: Swimlane table alternative view grouping students by subject pace, flagging slow students for teacher intervention.

### Screen 3: Student Profile & Teacher Interventions
- **Linear Issue**: [`WVR-230`](https://linear.app/weaver-edu/issue/WVR-230/rebuild-phase-5-screen-3-student-profile-real-data-ingestion-and)
- **Key Files in `seed/student-profile/`**:
  - `StudentProfileRoom.tsx`: Main coordinator component.
  - `ProfileRadar.tsx`: **Weaver Wheel** spider chart derived from student intake attributes (Emotional Reg, Focus, Engagement, Task Completion, Social).
  - `CheckInTrend.tsx`: Morning (AM) and afternoon (PM) student check-in trendline.
  - `MasteryChart.tsx`: Full-width **Mastery estimate over time** performance line graph tracking completion speed and attempt count.
  - `ProfileDrawer.tsx` & `MasteryDetailCard.tsx`: Slide-out right side drawer:
    - **SEL Action Chat Drawer**: Triggered by clicking check-in dips.
    - **3-Step Coaching Drawer**: Triggered by clicking red struggle points on the mastery line. Displays target misconception and 3-step physical offline plan (*Step 1: Manipulative Check, Step 2: Partner Scaffolding, Step 3: Quick Check*).
  - Route: `app/students/[studentId]/page.tsx`
  - Tests: `StudentProfileRoom.test.tsx`, `MasteryChart.test.tsx`, `CheckInTrend.test.tsx`, `ProfileDrawer.test.tsx`.

### Screen 4: Student Blocks (Continuous Deck)
- **Linear Issue**: [`WVR-229`](https://linear.app/weaver-edu/issue/WVR-229/rebuild-phase-4-screen-4-student-capability-path-stoken-and-sequential)
- **Key Files in `seed/student-blocks/`**:
  - `library.ts`: Canonical registry of **6 Types · 21 Sub-types** across the 4 lifecycle roles:
    - `Start` (`var(--pin-hook)` / Yellow): Reading hooks, audio narrative, setup steps.
    - `Try` (`var(--pin-try)` / Sky Blue): Interactive drawing canvas (`DrawPad.tsx`), manipulatives, riddles.
    - `Check` (`var(--pin-check)` / Mint): Formative questions, sight words, student voice recorder.
    - `Next` (`var(--pin-next)` / Purple): Open-ended art studio, project synthesis.
  - `space-pins.ts`: Real lesson block mosaic data mapper (`spaceFlipBlocks()`).
  - `BlockFlip.tsx`: Student deck controller rendering the **YouTube-thumbnail mosaic layout** (wide hero video card on top, 2-column tiles below, sequential padlock gating, and 3D card flips).
  - Tests: `BlockFlip.test.tsx`.

---

## 4. Interactive Zero-Dependency Prototypes

Run and test all flows in any web browser without running a dev server:
- **`seed/previews/unified-flow.html`**: Master prototype tying all 4 screens together (Galaxy ↔ Calendar 3D flip, Student click to Profile, struggle node click to slide-out Intervention Drawer, and Profile to Blocks deck).
- `seed/previews/01-galaxy-home.html`: Galaxy starfield & 500ms hover popovers.
- `seed/previews/02-pacing-calendar.html`: Wavy stack calendar & swimlane table.
- `seed/previews/03-student-profile.html`: Profile radar, check-ins, and performance chart.
- `seed/previews/04-student-blocks.html`: YouTube-thumbnail continuous deck.
- `seed/previews/index.html`: Portal index linking all standalone prototypes.

---

## 5. Verification Gate

Before closing any issue in Linear:
```bash
npm run check:env      # Verify no SUPABASE_SECRET_KEY in client/server bundles
npm test               # Run all Vitest unit suites
npm run test:db        # Run PGlite RLS security attack tests
npm run build          # Confirm clean Next.js build
```
