# Stage 03.3: Screen 4 (Student Blocks Deck)

## Job
Deliver the student device deck (`/s/[token]`): wide hero hook video, 2-column YouTube-thumbnail mosaic tiles, padlock lock gating, and 3D card flips.

## Linear Contract
- **Linear Issue**: `WVR-229`
- **Linear Project**: `Weavr Clean Rebuild (P-WVR-5)`

## Inputs
- `_factory/PRD.md`
- `_factory/design_tokens.md`
- Working code files:
  - `library.ts`: 6 types · 21 sub-types specification.
  - `space-pins.ts`: Lesson block mosaic data mapper.
  - `BlockFlip.tsx`: Continuous deck component with YouTube-thumbnail layout.
  - `DrawPad.tsx` & `BreakTimer.tsx`: Canvas drawing and break timers.
  - `flip.css`: Card flip 3D animation tokens.
  - `previews/04-student-blocks.html` & `previews/unified-flow.html`.

## Invariants
- **Anonymous Capability Token**: No logins or passwords.
- **Sequential Gate**: Upcoming blocks stay locked until earlier blocks complete.

## Outputs
- `src/components/student-path/BlockFlip.tsx`
- `src/lib/blocks/library.ts`

## Check
Run command:
```bash
npm test seed/student-blocks/BlockFlip.test.tsx
```
Continuous deck flips, answers register, and completions advance progress.
