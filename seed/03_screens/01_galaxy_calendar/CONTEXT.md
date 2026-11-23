# Stage 03.1: Screen 1 & Screen 2 (Galaxy & Pace Calendar)

## Job
Deliver the teacher room shell: 3D perspective flip between Galaxy Field (front) and Pace Calendar (back).

## Linear Contract
- **Linear Issue**: `WVR-228`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `_factory/PRD.md`
- `_factory/design_tokens.md`
- Working code files:
  - `GalaxyFieldSnippet.tsx`: Canvas field with starfield and interest cluster hubs.
  - `GalaxyPackCardSnippet.tsx`: Cluster cards (*Cooking*, *Video Games*, *Space*).
  - `GalaxyPopoverDelay.ts`: Strict **500ms hover delay** for student popover.
  - `GalaxyDragHighlightSnippet.tsx`: Active drag-and-drop grouping highlight indicator.
  - `CalendarGridSnippet.tsx`: 5-day week calendar grid.
  - `WavyStackBar.tsx`, `WavyStackBar.module.css`, `waveUtils.ts`: SVG cubic Bézier wavy stacked-bar.
  - `PacingTable.tsx`: Swimlane pacing table view.
  - `previews/01-galaxy-home.html` & `previews/02-pacing-calendar.html`.

## Outputs
- `src/components/room/GalaxyHome.tsx`
- `src/components/room/CalendarGrid.tsx`
- `src/components/room/RoomStage.tsx` (3D Flip Scene)

## Check
Run command:
```bash
npx playwright test e2e/room-first.spec.ts
```
Flip animation completes, shortcuts `G` and `C` toggle face, and 500ms hover works.
