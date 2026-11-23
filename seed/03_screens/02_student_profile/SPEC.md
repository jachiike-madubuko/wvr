# Student Profile UI Specification & Architecture

## Overview
The **Student Profile** page (`/students/[studentId]`) provides teachers with a unified view of:
1. **SEL (Social-Emotional Learning)**:
   - **Weaver Wheel (`ProfileRadar`)**: Spider/radar chart generated from student intake / interest attributes (Emotional Reg, Focus, Engagement, Task Completion, Social).
   - **Check-ins Line Graph (`CheckInTrend`)**: Daily morning (AM) & afternoon (PM) student check-in trendline (Calm vs Distressed). Clicking a check-in point opens the SEL Action Chat drawer.
2. **Performance (`MasteryChart`)**:
   - Tracking speed of completion and student struggle/mastery across lesson blocks.
   - Filterable by **Zoom** (`Day`, `Week`, `Month`) and **Performance Filter** (`Strengths`, `Struggles`, `Both`).
   - Slow completion times or multiple incorrect attempts flag points in red with diagnosed misconceptions (e.g., *"Adds instead of multiplying when scaling"*).
   - Clicking a struggled block opens the **Teacher Intervention Drawer** to generate a 3-step physical/coaching offline intervention.

---

## 1. Visual Verification & Screenshots
Located in `seed/student-profile/screenshots/`:
- `01-profile-layout.png`: Base student profile layout with SEL row (Wheel left, Check-ins right) and Performance line graph spanning full width underneath.
- `02-sel-chat-initial.png`: SEL Action Chat drawer opened from a distressed check-in point ("Address uneasy").
- `03-sel-chat-drafted.png`: SEL Action Chat with Weaver-generated coaching move and past notes toggle.
- `04-intervention-needs-review.png`: 3-step intervention plan generated from a flagged struggle block in `MasteryChart` (needs teacher approval).
- `05-intervention-approved.png`: Intervention approved and ready to deliver offline.

Interactive reference also implemented in `seed/previews/unified-flow.html` (click red struggle node or PM dip).

---

## 2. File Manifest

### Page Route
- `seed/student-profile/app/students/[studentId]/page.tsx`
  - Next.js server component route forwarding `params.studentId` to `StudentProfileRoom`.

### Core View Container
- `seed/student-profile/StudentProfileRoom.tsx`
  - Primary coordinator component managing drawer state (`chat`, `mastery`, `intervention`), data loading via `useStudentProfile`, and action handlers.

### Profile Subcomponents (`seed/student-profile/`)
- `ProfileRadar.tsx`: Renders the Weaver Wheel radar chart using `@/components/charts/radar-chart`.
- `CheckInTrend.tsx`: AM/PM dual-series check-in trend chart using `@/components/charts/line-chart`.
- `MasteryChart.tsx`: Performance mastery line graph tracking time and struggle points with interactive hit points and zoom/filter controls.
- `ChartHitPoints.tsx`: Interactive SVG hit points with hover indicators for the line chart nodes.
- `ChartTooltip.tsx`: Contextual tooltip showing block name, time estimate, and error summary.
- `ProfileDrawer.tsx`: Sliding sheet drawer containing either SEL Action Chat or the 3-step Intervention Plan.
- `MasteryDetailCard.tsx`: Detail view card for a selected block displaying duration, attempt status, and "Generate intervention" action.

### Supporting Domain Models & Helpers (`seed/student-profile/`)
- `profile-fixture.ts`: Fixture data model generating deterministic SEL zones, check-ins, and multi-tier mastery data.
- `check-in-series.ts`: AM/PM series formatting and domain scale calculations.
- `intervention-phase.ts`: Phase transitions for intervention generation (`idle` -> `compose` -> `generating` -> `ready` -> `sent`).
- `intervention-request.ts`: Request builder for offline physical coaching intervention plans.

### Unit Tests (`seed/student-profile/`)
- `StudentProfileRoom.test.tsx`: Component mounting, student not found states, and drawer toggles.
- `MasteryChart.test.tsx`: Zoom toggles (day/week/month), filter toggles (strengths/struggles), and node selection.
- `CheckInTrend.test.tsx`: AM/PM series rendering and selection.
- `ProfileDrawer.test.tsx`: Drawer modal open/close and intervention approvals.

---

## 3. Styling & Dependencies
- **CSS**: Leverages `card.css` (`.wv-panel`, `.wv-head`, `.wv-title`, `.wv-kicker`) and Tailwind CSS grid layouts (`grid gap-6 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.2fr)]`).
- **Charts**: Built with the project's internal **bklitUI** charting library (`web/src/components/charts/`), powered by `@visx/*` and `d3-shape` already declared in `web/package.json`. No external charting package is required.
