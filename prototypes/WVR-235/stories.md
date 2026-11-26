# User stories: WVR-235

Written by WVR.dev. **Revision 2, 2026-11-26 (America/Denver)**, revised from Petey Pablo's red team at `0ea5566` (see `redteam.md`). Status: round 0, revised and waiting on WVR.dev to hand off. Proto builds from this version only.

> **Every default in this file is PROPOSED, not decided.** Jah hasn't answered OQ-1 to OQ-11. Wherever a story or checklist seed relies on one, it's tagged **(proposed, OQ-n)**. Proto builds the proposed default. Sequoia grades against it. Neither should treat it as a product rule.

## Issue

- Linear: [WVR-235, Weaver Wheel Teacher Input UI](https://linear.app/weaver-edu/issue/WVR-235/weaver-wheel-teacher-input-ui) (Backlog, project Weavr Clean Rebuild, created by Jah)
- Replaces WVR-37, WVR-72, and WVR-118 (all three canceled 2026-11-25).
- **What this prototype tests:** which **input pattern** lets a teacher on a Student Profile record one or more of the 5 Weaver Wheel scores on her phone in about 30 seconds, see the radar change immediately, and come back later to update them. The radar must read as her view, never an AI judgment.
- **What it does not test:** the scale. All variations use the same proposed 1–5 scale this round (OQ-1).
- **Out of scope (do not build):**
  - A questionnaire or question bank (OQ-2; old rebuild Q6 is still unanswered).
  - Any AI suggestion, autofill, "explain", or chat.
  - Check-ins, the mastery chart, the intervention drawer, and the student path (`/s/[token]`).
  - Login, roles, and a class roster. It's one teacher and one student.
  - Revision history and the class average (OQ-6, OQ-4).
  - Any network call: no Neon, no API, no fetch.

## Ground rules for Proto (read first)

1. **Self-contained HTML.** One `index.html` per variation with inline CSS and JS, system fonts, no CDN, no build step, and nothing imported from `src/`. It must work when opened through `html-preview.github.io` on a phone.
2. **The 5 dimensions are fixed in this order and spelling:** `Emotional Reg`, `Focus`, `Engagement`, `Task Completion`, `Social`. Don't add, rename, or reorder any of them. This is the closed enum from WVR-72.
3. **Storage stores the raw 1–5 value only.**
   - Saved record key: `wvr235:<variation>:student:tobin`, for example `wvr235:v1:student:tobin`.
   - Shape: `{ "scores": { "Emotional Reg": 1|2|3|4|5|null, "Focus": …, "Engagement": …, "Task Completion": …, "Social": … }, "updatedAt": "<ISO 8601>", "updatedBy": "teacher" }`.
   - `null` means "Not set". Every non-null value is a whole number from 1 to 5.
   - **Never persist the plotted radius (value × 20) or any 0–100 number.** Multiply by 20 only at draw time. After a reload, the radar comes from these raw values.
   - Draft key (US-5): `wvr235:<variation>:student:tobin:draft`, same shape plus `"draftAt"`.
   - Controls key (rule 7): `wvr235:<variation>:controls`.
   - A variation reads and writes only its own three keys.
4. **Neon Postgres and teacher RLS are the eventual contract, not something Proto calls.** In the real app the values go to Neon, where only the teacher of the student's class can read or write them (same policy shape as `student_wheel_answers` in migration 005). In the prototype this shows only as a footer note: "Prototype: saved on this device only."
5. **Student identity is first name only, and it's a prototype pseudonym: "Tobin", class "Room 12".**
   - "Tobin" is an invented stand-in, not a real student. Label it on screen with a small tag next to the name: "Prototype pseudonym".
   - It isn't on weaver-v0's `OLD_NAMES` or `OLD_IDS` guard lists, it isn't Maya, Andre, Jordan, or Lila, and it doesn't appear anywhere in weaver-v0 or wvr.
   - Jah can swap it (OQ-11).
   - No last name, photo, email, or ID anywhere on screen. This is fail-closed invariant 1.
6. **Visual tone.** Low fidelity, but in the app's dark palette:
   - page `#0b1020`, panel `#111728`, text `#f6f1ea`, muted text `#8892b0`
   - accent and polygon `#58b6fa`, error `#ff7a7a`
   - borders `rgba(255,255,255,.1)`, panel radius 24px

   The radar is a hand-drawn SVG pentagon with no chart library.
7. **Prototype controls live at the TOP, never at the bottom** (see the layering below).
   - A small pill button labeled "Proto controls" sits in the page header, top right, at least 44×44px, below `env(safe-area-inset-top)`.
   - Tapping it opens a **modal sheet that drops down from the top**, with a backdrop. It has a Close button, and Escape closes it.
   - Toggle state persists in the controls key so it survives a reload.
   - Contents:
     - **Slow load:** the next load (and every reload while on) waits 1.5 s in the loading state.
     - **Fail load:** see US-7. The loader does not read the saved or draft keys at all while this is on.
     - **Fail next save:** the next Save fails once, then the toggle switches itself off.
     - **Bad stored value:** writes `{"scores":{"Focus":7}}` into the saved key to prove fail-closed parsing (US-7).
     - **Last saved:** "just now", "2 days ago", or "3 weeks ago". This rewrites `updatedAt` on the saved record so US-5's revisit can be shown. It's disabled when nothing is saved.
     - **Start empty:** clears this variation's saved and draft keys, keeps the control toggles, and reloads into the empty state.
     - **Reset demo:** clears this variation's saved, draft, **and** controls keys, so every toggle goes back to its default (all off, "just now"), then reloads.

     Neither "Start empty" nor "Reset demo" touches another variation's keys.
8. **Layering on a phone.** From back to front:
   - page content (z 0)
   - the sticky Save/Cancel bar (z 20, only in edit mode)
   - the controls backdrop and sheet (z 40, only while open)

   When the sheet is open it covers everything on purpose. When it's closed, nothing overlaps the Save bar. Content gets `padding-bottom` equal to the bar height plus `env(safe-area-inset-bottom)`, so the last row is never hidden behind the bar.
9. **Proposed-defaults banner on every variation (v1, v2, v3).**
   - It sits under the header, scrolls with the page (not sticky), is muted, and can be collapsed to one line, but it can't be removed.
   - Text: **"Proposed defaults, not decided: 1–5 scale · partial save allowed · latest value only (no history) · no class average · no question bank."**

## Persona

**Ms. Rivera** teaches a grade 2–4 class. She's on Tobin's Student Profile, often on her phone between lessons. Today she may have noticed only one thing, such as how Tobin focused during a noisy center. She wants to record that in about 30 seconds and get back to class. She isn't a clinician and doesn't want the tool to sound like a diagnosis.

## Shared layout and copy for each dimension row (v1 and v2; v3 uses it on its card)

At phone width (360–430px), each dimension is a **stacked block, never one line**. Five 44px segments plus four 8px gaps already take 252px, so the label can't share their line.

1. **Line 1:** the dimension name in bold on the left, and on the right the current value text ("4 · Usually" or "Not set") plus a **Clear** text button (at least 44px tall, shown only when a value is set; Clear returns the row to Not set).
2. **Line 2:** the hint in muted text.
3. **Line 3:** the input control, **full width**. In v1 that's the five segments with equal flex and an 8px gap; at 360px with 16px page and panel padding, each segment is about 52px wide.
4. **Line 4, v1 only:** small end labels, "1 Rarely" on the left and "5 Almost always" on the right.

Anchor labels for 1–5 **(proposed, OQ-7):** 1 Rarely · 2 Sometimes · 3 About half the time · 4 Usually · 5 Almost always.

Hints for each dimension **(proposed placeholder copy; this is not the Q6 question bank, see OQ-2):**
- Emotional Reg: "Recovers after a mistake or frustration"
- Focus: "Stays on a task with normal room noise"
- Engagement: "Joins in when something new starts"
- Task Completion: "Finishes work once it gets hard"
- Social: "Works well with a partner"

## Radar rules (all variations)

- 5 axes in the fixed order, starting at the top and going clockwise.
- Drawn radius = value × 20 on a 0–100 scale, **at draw time only** (rule 3).
- **A score of 1 plots at 20% of the radius, not at the center. The center is reserved for "Not set."** This is intentional **(proposed, OQ-1)**: a "Rarely" still draws a small polygon point rather than an empty axis.
- A Not-set axis is drawn dashed. Its polygon vertex sits at the center, and a hollow ring marker sits at the axis tip with the label "Not set". Because 1 never plots at the center, a vertex at the center always means Not set.
- **Motion budget (one rule):** on any change the polygon starts moving on the same frame as the input and finishes a 150ms ease-out tween. With `prefers-reduced-motion: reduce` it jumps with no tween.
- **Draft vs saved:** while there are unsaved changes, the draft polygon is drawn **dashed, unfilled**, and the last saved polygon stays behind it as a faint filled shape. In view mode only the saved polygon shows, **solid and filled**. Line style carries the difference, not color alone.
- Legend: "Your view". Never "Estimate" or "Score".
- A live values line under the chart, for example "Emotional Reg 4 · Focus Not set · Engagement 5 · Task Completion 2 · Social Not set". The SVG has `role="img"` with an `aria-label` that matches this line.
- The radar must not clip labels at 360px. In the chart only, the labels may shorten to "Emo Reg" and "Task Comp". Full names stay in the rows and the values line.

## Stories

### US-1: See the empty wheel and start

**Trigger:** Ms. Rivera opens Tobin's profile for the first time, so nothing is saved.
**Action:** She taps "Set Weaver Wheel".
**Outcome:** Edit mode opens with all 5 dimensions Not set.

Acceptance:
- [ ] With nothing saved, the panel shows the title "Weaver Wheel", an empty pentagon grid with 5 labels, and the text "No scores yet. These are your observations, not a diagnosis."
- [ ] No polygon, no numbers, and no made-up default scores. The old code fell back to defaults like 72 and 76; do not copy that.
- [ ] One primary button, "Set Weaver Wheel", at least 44px tall.

### US-2: Set one or more scores

**Trigger:** Edit mode is open.
**Action:** She sets a value for any of the 5 dimensions, one or all of them, with the variation's control.
**Outcome:** Each set value shows on its row and the radar redraws.

Acceptance:
- [ ] All 5 are editable in the fixed order, using the stacked row layout above.
- [ ] Values are whole numbers 1–5 **(proposed, OQ-1)** with the anchor labels **(proposed, OQ-7)**.
- [ ] Not set stays distinct from 1. A dimension she hasn't touched never quietly becomes 1. Clear puts a row back to Not set.

### US-3: The radar updates immediately

**Trigger:** She changes, or clears, any value.
**Outcome:** The draft polygon moves by the motion budget in the radar rules, and the values line updates with it. She doesn't need to save to see the change.

Acceptance:
- [ ] The movement starts on the same frame as the input, and the 150ms tween runs only when reduced motion is off.
- [ ] Draft is dashed and unfilled, with the faint saved shape behind it. View mode is solid and filled.
- [ ] A Not-set axis follows the radar rules: vertex at the center, a hollow ring at the tip, and the label "Not set".

### US-4: Save, including a partial set, and have it persist through a reload

**Trigger:** She has set or changed **at least one** dimension and taps Save. Saving some dimensions and leaving others Not set is allowed **(proposed, OQ-3)**.
**Action:** The prototype writes the raw 1–5 values (with `null` for Not set) to the saved key, then deletes the draft key.
**Outcome:** View mode, the solid polygon, the status "Saved", and "Updated just now by you". A reload shows the same values.

Acceptance:
- [ ] Save is enabled whenever the draft differs from the saved record. The button reads "Saving…" for about 400ms (simulated) and can't be tapped twice in that time.
- [ ] After a full reload, the view-mode radar and values line exactly match the saved raw values, Not-set dimensions included.
- [ ] Partial saves keep their gaps. Example: save only Focus = 3, reload, and you see Focus 3 with the other four Not set.
- [ ] "Updated <relative time> by you" comes from `updatedAt`. Use "just now" for under a minute, then "N minutes/hours/days/weeks ago".
- [ ] A caption under the radar names the lowest **set** dimension, for example "Lowest right now: Task Completion." When fewer than 5 are set, it adds "(3 of 5 set)". **Ties name the first tied dimension in the fixed order (proposed, OQ-8).** With no dimension set, there's no caption. The caption is plain fact: no advice and no generated text.

### US-5: Come back later and update, without losing work on an iPhone

**Trigger:** Some days later (use the "Last saved: 2 days ago" control) Ms. Rivera reopens the profile. It shows "Updated 2 days ago by you". She taps Edit.
**Action:** She changes one value and saves.
**Outcome:** The new value replaces the old one and the time resets to "just now".

Acceptance:
- [ ] Edit opens with the saved values filled in.
- [ ] **Visible unsaved state:** while the draft differs from the saved record, the sticky bar shows an "Unsaved changes" chip (text plus a dot, not color alone), and the panel title reads "Weaver Wheel · editing".
- [ ] **Draft autosave, the iPhone-safe guard.** Every change writes the draft key right away. When the page loads with a draft present (from a reload, a closed tab, an iOS swipe-away, or a crash), a notice appears above the radar: "You have unsaved changes from <relative time>." It has two buttons, **Resume** (reopens edit mode with the draft) and **Discard** (deletes the draft key). No data is lost, even if the browser never fires an unload event.
- [ ] **In-page leave guard:** with unsaved changes, a native `confirm("Discard unsaved changes?")` appears on Cancel, Escape, and any in-page link that leaves the panel (the header's "← Room" placeholder link, "Start empty", and "Reset demo"). Confirm OK discards the draft and deletes the draft key. Cancel stays in edit mode.
- [ ] `beforeunload` may be added **as a desktop extra only**. No acceptance item depends on it.
- [ ] **History (proposed, OQ-6):** this prototype keeps only the latest values and `updatedAt`. It overwrites in place. **This is a proposed default. It doesn't settle WVR-37's "answers can be revised over time" requirement.** Whether old values need to be kept or shown as a trend is still open for Jah.

### US-6: Validation error

**Trigger:** She taps Save while every dimension is Not set. That happens when the wheel is empty and she taps Save before setting anything, or when she clears every row of a saved wheel.
**Outcome:** The save is blocked with an inline error.

Acceptance:
- [ ] Error text: "Set at least one dimension before saving." **(proposed copy, OQ-3)** It sits next to the Save button, and focus moves to the first dimension's control.
- [ ] Nothing is written to the saved key while the error shows. The saved polygon, if there is one, doesn't change. Clearing every row of a saved wheel and saving is **not** a way to delete the wheel in this prototype **(proposed, OQ-3)**.
- [ ] The error is announced with `aria-live="assertive"` and uses text plus a "!" icon, not red alone.
- [ ] Inputs are buttons, steppers, or segments only, with no free-text number fields, so an out-of-range value can't be typed. Out-of-range data can only come from storage, and US-7 covers that.

### US-7: Loading, and failing closed

**Trigger:** "Slow load", "Fail load", "Bad stored value", or "Fail next save" is turned on.
**Outcome:** The UI never shows numbers it hasn't actually loaded, and never says "Saved" when the save didn't happen.

Acceptance:
- [ ] **Loading:** a skeleton pentagon and "Loading Weaver Wheel…". No values, no polygon, no Edit button, and no draft notice until the load finishes.
- [ ] **Fail load hides local data:**
  - While "Fail load" is on, the loader **does not read** the saved or draft keys. The page goes straight from loading to the error and never paints a cached polygon, values line, timestamp, caption, or draft notice, even though the data is in `localStorage`.
  - It shows "Couldn't load the Weaver Wheel." and a Retry button. Editing is disabled because she must not overwrite data she can't see.
  - Retry keeps failing while the toggle is on. Turn it off, tap Retry, and the saved data loads normally.
- [ ] **Bad stored value:** any stored score that isn't null or a whole number 1–5, or any record that won't parse, puts the page in the same error state as Fail load, with "Couldn't load the Weaver Wheel." Never clamp, round, or show the bad value. "Reset demo" recovers.
- [ ] **Save failed:** edit mode stays open with the draft kept (in memory and in the draft key), and the message reads "Not saved. Check your connection and try again." The saved key keeps the previous values, the status never shows "Saved", and Retry sends the same draft again.
- [ ] All status changes go through one `aria-live="polite"` region: "Loading", "Saved", "Not saved".

### US-8: Teacher-authored only

**Outcome:** In every state, nothing suggests the values came from, or could come from, AI or the student.

Acceptance:
- [ ] No "Suggest", "Auto-fill", "AI estimate", "Explain", sparkle icon, or chat anywhere.
- [ ] No student or parent edit control, and no `/s/...` link in the panel.
- [ ] The provenance line "Set by you (teacher). Teacher observation, not a diagnosis." shows **in both view mode and edit mode**, under the radar. In the empty state, the empty-state copy covers it.
- [ ] The legend reads "Your view".

### US-9: Phone layout (Jah tests on his phone)

Acceptance:
- [ ] **The width floor is 360px.** Grade at 360px, 390px, and 430px. Ignore the 320px mentioned in the `checklist.md` template stub. There's no horizontal scroll.
- [ ] Stacking order: header (name, pseudonym tag, Proto controls pill), proposed-defaults banner, radar, values line, caption, provenance line, dimension rows or the v3 card, sticky bar.
- [ ] The radar is `min(100vw − 32px, 340px)` square in v2 and about 260px in v1 and v3, centered.
- [ ] In edit mode, the Save/Cancel bar is sticky at the bottom with `env(safe-area-inset-bottom)` padding. It holds the "Unsaved changes" chip, Cancel, and Save.
- [ ] Following layering rule 8, nothing covers the bar when the controls sheet is closed, and the controls pill sits in the header.
- [ ] Every tap target is at least 44×44px with at least 8px between neighbors. Dimension rows use the stacked layout. Never put the label and the control on one line at phone width.
- [ ] At 1024px and wider, the radar can sit on the left with the controls on the right. That's nice to have; phone comes first.
- [ ] Viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.

### US-10: Keyboard and screen reader

Acceptance:
- [ ] The whole flow works by keyboard. Tab moves in visual order: Proto controls pill, banner toggle, Edit, each dimension control, Clear, then Cancel and Save.
- [ ] **Segments (v1, and the v3 card):**
  - The segments are a `role="radiogroup"` labeled by the dimension name and hint, with roving tabindex.
  - Arrow keys change the value. Home and End jump to 1 and 5.
  - With nothing selected, the group's description reads "Not set". When something is selected, the checked radio's accessible name is "<n>, <label>", for example "4, Usually".
- [ ] **Steppers (v2):**
  - Each dimension is a `role="spinbutton"` with `aria-valuemin="1"` and `aria-valuemax="5"`. Set `aria-valuenow` only when a value is set.
  - **`aria-valuetext` is "Not set" when untouched**, and "<n>, <label>" (for example "4, Usually") once set.
  - Up and Down arrows change the value. The − and + buttons are labeled "Decrease Focus" and "Increase Focus".
  - Pressing + from Not set gives 1. Pressing − at 1 stays at 1; use Clear to get back to Not set.
- [ ] **Radar drag (v2):** each axis wedge has a focusable handle with the same spinbutton semantics. Dragging is never the only way to do anything.
- [ ] Focus is always visible: a ring at least 2px wide with 3:1 contrast. Text contrast is at least 4.5:1.
- [ ] Escape in edit mode works like Cancel, including the unsaved-changes confirm from US-5. Escape in the controls sheet closes the sheet only.

## Variations (build all three; only the input pattern changes, and all use 1–5)

Every variation meets US-1 to US-10, the ground rules, the row layout, and the radar rules.

### v1: Five stacked rows of 1–5 segments
The baseline. The radar is on top and the 5 stacked rows sit below it. It tests the fastest scoring by tap.

### v2: Drag the radar, with steppers as the reliable control
- **The radar is bigger:** `min(100vw − 32px, 340px)` square.
- **Hit areas are wedges, not dots.**
  - Each dimension owns the 72° sector around its axis, out to the outer ring plus 16px, so wedges never overlap and each is far larger than 44×44px.
  - A tap or drag anywhere in a wedge sets that dimension to the step nearest the touch's distance from the center: under 10% of the radius is ignored, then 1 at 20%, up to 5 at 100%.
  - The visible vertex handle is at least 44px across (an invisible circle of radius 22px).
  - The page doesn't scroll while a drag is in progress (`touch-action: none` on the SVG only).
- **Under the radar** is a stepper row for each dimension (stacked layout, with "− [value] +" full width, each button 44×44px). **The whole flow must be possible using the steppers alone.** Drag is extra.
- It tests whether direct manipulation feels more natural on a phone.

### v3: One dimension at a time (wizard)
It tests whether focusing on one dimension leads to more considered scores. The flow:

1. **Entry:** "Set Weaver Wheel" (empty) or "Edit" (saved) opens **card 1, Emotional Reg**. In edit mode, tapping a radar axis label (each label hit area at least 44×44px) jumps straight to that dimension's card.
2. **Card:** progress "2 of 5" in text, plus 5 dots for decoration only. Below that are the dimension name, hint, the full-width 1–5 segments, the end labels, and Clear.
   - Choosing a value **does not auto-advance (proposed, OQ-9)**.
   - The radar sits above the card (about 260px) and updates live per the radar rules.
   - The axis for the current card is highlighted with a thicker axis line and a bold label, not color alone.
3. **Navigation row** (inside the card, above the sticky bar): **Back** is disabled on card 1. The forward button reads **Next** when the card's dimension has a value and **Skip** when it's Not set. Skip leaves the dimension Not set and moves on. Both are at least 44px.
4. **After card 5,** the forward button reads **Review**. The review card lists all 5 with their values or "Not set". Each row is a 44px button that jumps back to its card.
5. **Saving a partial set:** the sticky bar has Cancel and Save on **every card**, not only on Review. Save works as in US-4, as soon as one dimension differs from the saved record. She can set Focus on card 2 and save at once, without going through Review. Validation is the same as US-6.
6. **Exit:**
   - **Save:** closes the wizard into view mode with the saved state.
   - **Cancel or Escape:** asks to confirm if anything is unsaved (US-5), then returns to view mode.
   - Moving between cards doesn't add browser history entries. Browser Back leaves the page, and the draft autosave (US-5) brings the work back on return.
   - Leaving mid-wizard and resuming the draft reopens at card 1 with the draft values.

## Product rules pulled from related issues

| Source | Rule | How it shows up here |
|---|---|---|
| WVR-235 (this issue) | 5 dimensions, set from the Student Profile, persisted under teacher RLS, update the radar immediately, teacher-authored only, fail-closed invariants preserved | US-2, US-3, US-4, US-7, US-8 |
| WVR-118 (decided 2026-08-29, canceled 2026-11-25) | "The stored placement is the teacher's, not the model's." It's teacher-authored to avoid automated profiling of minors. **WVR-118 also had the AI propose a placement with reasoning. WVR-235 drops that ("no AI inference") and replaces WVR-118, so these stories follow WVR-235.** | US-8; no AI anywhere |
| WVR-118 | Radar with the class average behind it | Not built. See OQ-4. |
| WVR-37 ICM-LOCK | "Teacher opinion, not diagnosis." "No chat in the prototype." WVR-52 must not feed generation prompts. | US-1 copy, the US-8 provenance line in both modes, no chat. Feeding generation prompts stays a rule for the real build. |
| WVR-37 | Items read as observable behaviors, not trait labels. Answers "can be revised over time." | US-2 hints. Revision over time is **only partly** addressed: overwrite in place is a proposed default (OQ-6), and history is still open. |
| WVR-37 comment (2026-08-29) | No candidate research-backed instrument yet | No question bank (OQ-2) |
| WVR-72 | Closed enum of dimensions; weights are teacher opinion; a misuse warning for each dimension | Fixed 5 (rule 2). No warnings for each dimension are written yet (OQ-5). |
| wvr `AGENTS.md` invariants 1 and 3; migration 005 RLS | First name only; no secrets in the browser; only the class's teacher reads or writes Wheel rows | Rules 4 and 5; no network calls |
| weaver-v0 `oneRoster.test.ts` `OLD_NAMES` / `OLD_IDS` | Old real first names must not come back | Pseudonym "Tobin" (rule 5) |
| weaver-v0 `docs/rebuild/screens/S3-student-profile.md` | Fixed axis order, 0–100 radar, a focus caption on the lowest dimension, an empty state, focusable axes | Radar rules, US-1, US-4, US-10 |

## Open questions (every default is PROPOSED, not decided; Jah hasn't answered)

| # | Question | Proposed default Proto should use | Why |
|---|---|---|---|
| OQ-1 | What score scale does the teacher enter? | **Proposed:** whole numbers 1–5, stored raw, plotted as × 20 at draw time only. 1 plots at 20%, and the center means Not set. All three variations use it this round. | Coarse steps fit "opinion, not diagnosis" and are fast on a phone. Testing the scale is left for a later round or a separate variation with its own complete rules. |
| OQ-2 | Does a question bank appear in this UI? (weaver-v0 rebuild Q6; no instrument chosen.) **Unanswered.** | **Proposed:** no question bank; one placeholder hint per dimension. | WVR-235 asks for direct entry of the 5 scores. Building items now would make up an instrument. |
| OQ-3 | Partial save, or all 5 required? | **Proposed:** partial save allowed (at least one dimension set). Not-set gaps are kept. Clearing every row isn't a delete. | Fits the 30-second, between-lessons job (red-team blocker 1). |
| OQ-4 | Show the class average behind the radar (WVR-118)? | **Proposed:** off. | It needs the whole class's data and raises comparison and privacy questions. |
| OQ-5 | Misuse warnings for each dimension (WVR-72) and "ceilings" (WVR-37)? | **Proposed:** none beyond the "not a diagnosis" line. | Neither has been written. Don't make them up. |
| OQ-6 | Keep a revision history or trend? | **Proposed:** latest value plus `updatedAt` only, overwritten in place. **This doesn't settle WVR-37's revise-over-time requirement.** | No history UI has been specified. Jah decides whether one is needed. |
| OQ-7 | Wording of the 1–5 anchor labels? | **Proposed:** Rarely / Sometimes / About half the time / Usually / Almost always | Describes how often she saw something, not a trait. |
| OQ-8 | Tie-break for the "Lowest right now" caption? | **Proposed:** the first tied dimension in the fixed order. | Predictable and easy to test. |
| OQ-9 | Should v3 auto-advance after a value is picked? | **Proposed:** no. | Avoids accidental skips. Jah can try it and say otherwise. |
| OQ-10 | Data contract with the existing `student_wheel_answers` table (it stores questionnaire options, and its comment says "No scores")? | **Proposed:** out of scope for Proto. Flagged for the build spec; the real build probably needs a new column or table for scores. | Migration 005 says the table holds no scores. |
| OQ-11 | Which student pseudonym should the prototypes use? | **Proposed:** "Tobin". It's an invented stand-in and is checked against `OLD_NAMES` / `OLD_IDS`. | Red-team blocker 6. Jah can pick another. |

## Acceptance checklist seeds (for Sequoia's `checklist.md`; this is not the checklist)

Grade at 360px, 390px, and 430px wide. The width floor is 360px.

1. The 5 dimensions appear in the exact order and spelling: Emotional Reg, Focus, Engagement, Task Completion, Social.
2. The empty state shows no polygon, no numbers, and no default scores.
3. Any change starts moving the radar on the same frame. The draft is dashed with the faint saved shape behind it, and view mode is solid. With reduced motion there's no tween.
4. A Not-set axis has its vertex at the center with a hollow ring and the label "Not set". A score of 1 plots at 20%, not the center.
5. **(proposed, OQ-3)** Saving only one dimension works. After a reload that dimension keeps its value and the other four show Not set.
6. **(proposed, OQ-3)** Save with all 5 Not set is blocked with "Set at least one dimension before saving.", focus moves to the first control, and nothing is written.
7. **(proposed, OQ-1)** In devtools, the saved key holds only `null` or whole numbers 1–5. There are no 20–100 values.
8. Cancel and Escape with unsaved changes ask to confirm. OK discards the draft and leaves the saved key unchanged.
9. Draft autosave: change a value, reload or close the tab, reopen, and the draft notice appears. Resume restores the draft and Discard deletes it. It works in iOS Safari with no `beforeunload`.
10. The "Unsaved changes" chip is visible whenever the draft differs from the saved record.
11. "Slow load" shows a skeleton with no values, no Edit button, and no draft notice until loaded.
12. "Fail load" with saved data in storage never paints a polygon, values, timestamp, caption, or draft notice. It shows the error and Retry, and editing is off. Turn the toggle off and Retry, and the data loads.
13. "Bad stored value" shows the load error, not a clamped or rounded value. Reset demo recovers.
14. "Fail next save" keeps the draft and shows "Not saved". The saved key keeps the old values and "Saved" never appears. Retry succeeds.
15. "Last saved: 2 days ago" makes the view show "Updated 2 days ago by you", and a new save shows "just now".
16. "Start empty" clears the saved and draft keys and keeps the toggles. "Reset demo" also resets the toggles. Neither touches another variation's keys.
17. No AI, suggest, autofill, sparkle, or chat control anywhere, no student edit control, and no `/s/` link.
18. The provenance line shows in both view mode and edit mode.
19. Only the first name "Tobin" appears, with the "Prototype pseudonym" tag. No last name, photo, or ID.
20. The proposed-defaults banner shows on every variation.
21. At 360–430px there's no horizontal scroll, every target is at least 44px with an 8px gap, and the rows are stacked: label and hint above, the control full width below.
22. With the controls sheet closed, nothing overlaps the sticky Save bar. The pill sits in the header. When the sheet is open it covers everything, and Close or Escape dismisses it.
23. Keyboard only: the whole flow works and focus is always visible. Radiogroup arrows, Home, and End work. Spinbutton Up and Down work.
24. Screen reader: an untouched dimension announces "Not set", a set one announces "<n>, <label>". The radar's `aria-label` matches the values line, and status changes are announced.
25. **(proposed, OQ-8)** The "Lowest right now" caption matches the lowest set value, names the first tied dimension on a tie, and adds "(k of 5 set)" when the set is partial.
26. **v2:** a tap anywhere in an axis wedge sets that dimension. Low values near the center can still be set without hitting a neighbor. The whole flow can be done with the steppers alone, and the page doesn't scroll during a drag.
27. **v3:** Back is disabled on card 1. The forward button reads Skip when the dimension is Not set and Next when it's set. Review comes after card 5, and its rows jump back to their cards. Save works from any card with a partial set. Cancel exits with a confirm. Radar labels jump to their cards. Picking a value doesn't auto-advance (proposed, OQ-9).
28. The file is self-contained: no network requests after the first load, and it works offline.

## Red-team response log (Petey Pablo, `0ea5566`)

| Finding | Fix in this revision |
|---|---|
| D1: OQ-3 baked in as decided | OQ-3 is now partial save **(proposed)**. US-4, US-6, and seeds 5 and 6 are rewritten and tagged. |
| D2: OQ-6 treated as covering WVR-37 | US-5, OQ-6, and the rules table now say overwrite in place **does not settle** revise-over-time. |
| D3: ground rule 3 didn't say raw 1–5 | Rule 3 now spells out raw 1–5 or null and forbids persisting × 20. Seed 7 checks it. |
| D4: no proposed banner on v1 and v2 | Rule 9 adds a banner on every variation. Seed 20 checks it. |
| B1: all 5 required | Partial save (US-4, US-6, OQ-3) |
| B2: raw storage | Rule 3, the radar rules, seed 7 |
| B3: no 0–100 in v3 | All variations use 1–5. The v3 scale test is removed. See OQ-1. |
| B4: controls vs Save bar | Rules 7 and 8: a pill in the header, a sheet from the top, a z-order, content padding. US-9, seed 22. |
| B5: `beforeunload` on iOS | US-5: visible unsaved chip, draft autosave with Resume/Discard, `confirm` on in-page exits; `beforeunload` is a desktop extra. Seeds 8–10. |
| B6: Maya | Now "Tobin", checked against `OLD_NAMES` and `OLD_IDS`, tagged as a pseudonym, used in every key (rule 5, OQ-11, seed 19) |
| B7: v2 hit targets | A bigger radar, 72° wedge hit areas, 44px handles, steppers as the reliable path (v2 section, seed 26) |
| B8: v3 flow | v3 section: entry, card, Next/Skip/Back, Review, saving from any card, exit and resume (seed 27) |
| B9: Fail load shows cache | US-7: the loader doesn't read the keys while it's on, and nothing cached is painted. Seed 12. |
| B10: segments and label on one line | The shared row layout stacks them, with full-width segments (US-9, seed 21) |
| N11: frame vs 150ms | One motion budget: start on the same frame, 150ms tween, none with reduced motion |
| N12: tie rule location | US-4 now has the tie rule, tagged proposed (OQ-8) |
| N13: relative time | The "Last saved" control (rule 7), US-5, seed 15 |
| N14: SR "Not set" | US-10: aria-valuetext or description "Not set", then "<n>, <label>". Seed 24. |
| N15: one minimum width | 360px floor, which overrides the template's 320px (US-9, seed header) |
| N16: provenance in edit mode | US-8: both modes. Seed 18. |
| N17: Start empty vs Reset demo | Rule 7 defines both, scoped to this variation's keys. Seed 16. |
| N18: banner on every variation | Rule 9 |
| N19: 1 plots at 20 | Radar rules and OQ-1 call it out. Seed 4. |
