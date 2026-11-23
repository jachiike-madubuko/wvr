# Stage 03.2: Screen 3 (Student Profile & Interventions)

## Job
Deliver the student profile view with SEL Weaver Wheel, check-in history, mastery estimate graph, and 3-step offline intervention drawer.

## Linear Contract
- **Linear Issue**: `WVR-230`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `_factory/PRD.md`
- Working code files:
  - `StudentProfileRoom.tsx`: Main coordinator component.
  - `ProfileRadar.tsx`: 5-zone Weaver Wheel radar chart.
  - `CheckInTrend.tsx`: AM/PM check-in trendlines.
  - `MasteryChart.tsx`: Performance mastery line graph tracking speed and attempts (flagging struggles red).
  - `ProfileDrawer.tsx`: Slide-out right side drawer for SEL chat and 3-step offline coaching plans.
  - `app/students/[studentId]/page.tsx`: Next.js route wrapper.
  - `previews/03-student-profile.html`.

## Invariants
- **Interventions are Teacher-Facing**: Model advises the adult. The child never chats with an AI model.

## Outputs
- `src/app/students/[studentId]/page.tsx`
- `src/components/room/StudentProfileRoom.tsx`
- `src/components/room/profile/*`

## Check
Run command:
```bash
npm test seed/student-profile/StudentProfileRoom.test.tsx
```
Tests pass; clicking struggle node opens 3-step coaching plan drawer.
