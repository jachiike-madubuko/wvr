# Weavr Clean Rebuild — Human Verification Checklist

Start the local server (`npx next dev -p 3000`, already running if launched) and verify each PRD screen below.

---

## Screen 1 & 2: Room Shell — Galaxy Field & Pace Calendar (`WVR-228`)
**URL:** `http://localhost:3000/`

- [ ] **First-Name-Only Roster:** 6 students (`Maya`, `Leo`, `Zoe`, `Noah`, `Ava`, `Kai`) appear across the 6 interest clusters (*Animals*, *Cooking*, *Fashion*, *Music*, *Space*, *Video Games*) with no last names, emails, or photos.
- [ ] **GSAP Orbital Drift:** Student nodes gently float (`prefers-reduced-motion` disables drift).
- [ ] **Strict 500ms Hover Popover:** Brushing a node for <500ms does **not** open the popover; hovering `Maya` for ≥500ms opens the popover showing `"Equal Parts & Halves"` and `"View profile"`.
- [ ] **Drag-and-Drop Grouping + Optimistic Concurrency:**
  - Drag `Leo` over *Space* → green dashed target border appears.
  - Drop `Leo` and refresh (`Cmd+R`) → `Leo` remains in *Space* (persisted in Neon `group_memberships`).
  - Stale-version `409 VERSION_CONFLICT` check:
    ```bash
    curl -i -X POST http://localhost:3000/api/room/move \
      -H "Content-Type: application/json" \
      -d '{"studentId":"dddddddd-dddd-4ddd-8ddd-dddddddddd02","toPackId":"pack_cooking","expectedVersion":0}'
    ```
- [ ] **3D Perspective Flip (`G` / `C`):** Pressing `C` or clicking **Calendar C** flips 180° to Pace Calendar; pressing `G` or clicking **Galaxy G** flips back.
- [ ] **WavyStackBar & Swimlane Table:** Week/Month toggle renders `WavyStackBar` (`Ahead` mint, `On pace` blue, `Behind` coral); **Swimlane Table** sorts by urgency and filters by **Behind / On Track / Ahead** and **Overall / Math / ELA**.
- [ ] **WebGL2 Galaxy Background:** Warm gold/amber starfield (`GalaxyBackground.tsx`) animates behind clusters with `clickWarp` on click (`prefers-reduced-motion` and CSS `.wv-stars` fallback supported).

---

## Screen 3: Student Profile & Offline Interventions (`WVR-230`)
**URL:** `http://localhost:3000/students/dddddddd-dddd-4ddd-8ddd-dddddddddd01` (Maya)

- [ ] **Header & Deck Link:** Displays `Maya`, `Room 204 · Space`, `"← Room"`, and **`"View Current Blocks ↗"`** linking to `/s/demo-space-lesson`.
- [ ] **Bklit Weaver Wheel (`ProfileRadar`):** 5 zones (*Emotional Reg*, *Focus*, *Engagement*, *Task Completion*, *Social*).
- [ ] **Daily Check-ins (`CheckInTrend`):** AM (mint) & PM (coral) trendlines with Calm–Distressed gradient rail.
- [ ] **SEL Action Chat Drawer & PII Gate:** Clicking `PM · frustrated` opens the right-side SEL drawer. Submitting `maya.parent@example.com` returns `422 PII_BLOCKED` and shows a block message; submitting a clean coaching note saves to Neon `student_action_threads`.
- [ ] **Mastery Chart & 3-Step Offline Intervention Drawer:**
  - Toggle **Day / Week / Month** and **Strengths / Struggles / Both**.
  - Click red struggle node `check_1 (math)` → opens Intervention Drawer showing `"unequal parts"`, **`"Offline teacher plan · Never sent to student deck"`**, and the 3 physical steps (*1. Manipulative Check*, *2. Partner Scaffolding*, *3. Quick Check*).
  - Click **Approve Offline Plan** → persists `approved_plan` and `teacher_approved_at` to Neon.
- [ ] **Not-Found Guard:** `http://localhost:3000/students/00000000-0000-4000-8000-000000000000` shows clean not-found fallback.

---

## Screen 4: Student Capability Path (`/s/[token]`) (`WVR-229`)
**URL (Valid):** `http://localhost:3000/s/demo-space-lesson`  
**URL (Invalid):** `http://localhost:3000/s/invalid-token-123`

- [ ] **Fail-Closed Invalid Token:** `/s/invalid-token-123` renders `"Lesson link unavailable"` with zero student names.
- [ ] **Zero-Login Roster Picker:** `/s/demo-space-lesson` shows first-name tiles (`Maya`, `Leo`, `Zoe`, `Noah`, `Ava`, `Kai`) with zero password or email inputs.
- [ ] **YouTube-Thumbnail Mosaic & Sequential Padlocks:**
  - Selecting `Maya` shows full-width yellow Hero Hook (`Start`) unlocked and tiles 2–3 locked (`🔒`).
  - Completing **Launch Fuel Cells** (`Start`) saves progress via `save_student_path_session` and unlocks **Split the Moon** (`Try`).
  - Drawing on **DrawPad** (`Undo` / `Clear` work) and saving unlocks **Half Orbit Check** (`Check`).
  - Picking an answer choice saves silently without scoring/shaming the child and reaches `3 of 3 done`.

---

## Automated Gate (`WVR-232`)
Run anytime to verify DB, security, types, unit tests, build, and Playwright E2E:
```bash
npm run verify:all
```
