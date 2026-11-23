# Student Blocks Specification & Handoff

## 1. Overview
The **Student Blocks** system powers the continuous deck rendered on the student path (`/s/[token]`), backed by the formal **6 Types · 21 Sub-types** block specification defined in `web/src/lib/blocks/library.ts`.

### Block Anatomy & The 4 Roles
Every student block maps to one of four lifecycle roles with distinctive kicker, tint, ink, and background tokens:
- **`Start`**: Hooks, introductions, and reading sections (`var(--pin-hook)`). Tapped through; never timed.
- **`Try`**: Hands-on practice, interactives, drawing, manipulatives, and 3D viewers (`var(--pin-try)`).
- **`Check`**: Formative checks, multiple choice questions, and audio recordings (`var(--pin-check)`). Unscored in front of the student; wrong answers preserved for teacher intervention.
- **`Next`**: Open-ended creation, art, project synthesis, or brain games (`var(--pin-next)`).

---

## 2. Block Library Manifest (6 Types / 21 Sub-types)
Defined in `seed/student-blocks/library.ts`:

1. **Text**:
   - `text.question` (Check): Multiple-choice question with inset well.
   - `text.write` (Check): Extended write-in answer (15+ words, kid's natural voice).
   - `text.read` (Start): Reading passage, scroll-depth monitored.
   - `text.instructions` (Start): Step-by-step checklist.
2. **Image**:
   - `image.draw` (Try): Digital canvas drawing pad with undo & clear.
   - `image.display` (Start): Visual hook / display card.
   - `image.art` (Next): Open-ended creative art studio.
   - `image.meme` (Next): Top & bottom captioning studio.
3. **Video**:
   - `video.reference` (Try): Loopable lifeline reference clip.
   - `video.instructions` (Start): Multi-chapter setup guide.
   - `video.story` (Start): Animated narrative hook.
   - `video.lesson` (Try): Video with mid-stream checkpoint.
4. **Audio**:
   - `audio.story` (Start): Voiceover narrative with optional read-along text.
   - `audio.question` (Check): Audio question with kid voice recorder.
   - `audio.instructions` (Start): Guided step-by-step spoken cues.
   - `audio.music` (Try): Calming background focus music.
5. **PBL / IRL (Physical Learning)**:
   - `pbl.social` (Try): 1-minute partner sharing turn-taking with timer.
   - `pbl.manipulative` (Try): Physical or digital base-ten block builder.
   - `pbl.project` (Next): Hands-on kit building with checklist and photo upload.
6. **Game**:
   - `game.brain` (Next): Interactive matching puzzles.
   - `game.viewer3d` (Try): 3D rotatable cube counting puzzle.

---

## 3. Visual Verification & Live Production Screenshots
Captured live from `https://weaver-fawn.vercel.app/?sessionId=room&role=student` in `seed/student-blocks/screenshots/`:
- **`00-youtube-thumbnail-mosaic.png`**: The live student continuous deck grid showing the YouTube thumbnail-like mosaic layout (Wide Hook video card on top spanning full width, followed by the 2-column color-coded tiles for ELA, Art, Math, Science, and locked future tiles).
- `01-block-text-question.png`: Interactive Check card (Question selection with locked/active state and submission pill).
- `03-block-flow-view.png`: Continuous deck Flow view showing the block transition pipeline.
- `04-block-teacher-view.png`: Teacher diagnostic perspective showing time and completion shape details.

Interactive reference also runnable in `seed/previews/unified-flow.html` (click "View Current Blocks" from any student profile).

---

## 4. Seed Components
- `seed/student-blocks/library.ts`: Canonical registry of all 21 block types, roles (`FACE`), completion rules, and default flows.
- `seed/student-blocks/space-pins.ts`: The exact mosaic data mapper shaping lesson blocks into YouTube-thumbnail tiles (`spaceFlipBlocks()`).
- `seed/student-blocks/BlockFlip.tsx`: Continuous deck component handling the thumbnail mosaic grid, card flips, interactions, inputs, and completion events.
- `seed/student-blocks/BlockCard.tsx` & `HookCard.tsx`: Thumbnail block card components with video embeds and interactive flip triggers.
- `seed/student-blocks/DrawPad.tsx`: Canvas drawing pad for `image.draw` and `image.art`.
- `seed/student-blocks/BreakTimer.tsx`: Timer widget for social partner turns and breaks.
- `seed/student-blocks/flip.css`: Card flip 3D animation, inset well styles, and role-based themes.
- `seed/student-blocks/BlockFlip.test.tsx`: Unit tests verifying block progression and input registration.
