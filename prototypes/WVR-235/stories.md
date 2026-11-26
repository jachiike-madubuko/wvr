# User stories: WVR-235

Written by WVR.dev on 2026-11-26 (America/Denver) for round 0. **Status: draft, waiting on Petey Pablo's red team.** Proto builds only from the version revised after `redteam.md`.

## Issue

- Linear: [WVR-235, Weaver Wheel Teacher Input UI](https://linear.app/weaver-edu/issue/WVR-235/weaver-wheel-teacher-input-ui) (Backlog, project Weavr Clean Rebuild, created by Jah)
- Replaces WVR-37, WVR-72, and WVR-118 (all three were canceled on 2026-11-25).
- **What this prototype tests:** how a teacher on a Student Profile can set and update a student's 5 Weaver Wheel scores quickly on a phone, and see the radar change right away. The radar should read as the teacher's own view and never as an AI judgment.
- **Out of scope (do not build):**
  - A questionnaire or question bank. Q6 is still open; see OQ-2.
  - Any AI suggestion, autofill, "explain", or chat.
  - Check-ins, the mastery chart, the intervention drawer, and the student path (`/s/[token]`).
  - Login, roles, and the class roster. The prototype is one teacher looking at one student.
  - Any network call. There is no Neon, no API, and no fetch to anything except the file itself.

## Ground rules for Proto (read first)

1. **Self-contained HTML.** One `index.html` per variation with inline CSS and JS, system fonts, no CDN, no build step, and nothing imported from `src/`. It has to work when opened from `html-preview.github.io` on a phone.
2. **The 5 dimensions are fixed, in this order and spelled exactly like this:** `Emotional Reg`, `Focus`, `Engagement`, `Task Completion`, `Social`. Don't add a sixth, rename one, or reorder them. This list is the closed enum, the job WVR-72 was meant to do.
3. **Persistence in the prototype is `localStorage` only.** Use the key `wvr235:<variation>:student:maya`, for example `wvr235:v1:student:maya`. Store `{ scores: {<dimension>: number|null}, updatedAt: ISO string, updatedBy: "teacher" }`. Reloading the page must bring back the saved values. Give each variation a small "Reset demo" link that clears its key.
4. **Neon Postgres and teacher RLS are the eventual contract, not something Proto calls.** In the real app the values go to Neon under teacher RLS, where only the teacher of the student's class can read or write them (the same policy as `student_wheel_answers` today). Show this in the prototype only as a footer note: "Prototype: saved on this device only."
5. **Student identity.** Use first name only: "Maya", class "Room 12". No last names, photos, emails, or IDs anywhere on screen. This is fail-closed invariant 1.
6. **Visual tone.** Low fidelity is fine, but use the app's dark palette so it feels real: page `#0b1020`, panel `#111728`, text `#f6f1ea`, muted text `#8892b0`, accent and polygon `#58b6fa`, error `#ff7a7a`, borders `rgba(255,255,255,.1)`, panel radius 24px. The radar is a hand-drawn SVG pentagon (no chart library) on a 0–100 radius scale, matching today's `ProfileRadar` domain.
7. **Simulated states.** Add a small collapsible "Prototype controls" drawer, closed by default and at the bottom of the page, so Jah and Sequoia can force each state:
   - "Slow load" adds a 1.5 s loading delay.
   - "Fail next save" makes the next save fail.
   - "Start empty" clears the data.
   - "Fail load" makes the profile fail to load.

## Persona

**Ms. Rivera**, a grade 2–4 classroom teacher, is on Maya's Student Profile, often on her phone between lessons. She knows Maya well from watching her in class. She wants to record what she sees in about 30 seconds and get back to teaching. She is not a clinician and doesn't want the tool to sound like a diagnosis.

## Stories

### US-1: See the empty wheel and start scoring

**Trigger:** Ms. Rivera opens Maya's profile for the first time, so no scores exist yet.
**Action:** She sees the Weaver Wheel panel and taps "Set Weaver Wheel" (or the variation's equivalent).
**Outcome:** The panel switches to edit mode with all 5 dimensions marked "Not set".

Acceptance:
- [ ] With no saved scores, the panel shows the title "Weaver Wheel", an empty pentagon grid with the 5 labels, and the text "No scores yet. These are your observations, not a diagnosis."
- [ ] The empty state shows no number, polygon, or made-up default score. The old code fell back to defaults like 72 and 76 when data was missing. **Do not copy that.**
- [ ] One clear primary action starts editing. It is at least 44 px tall.

### US-2: Set a score for each dimension

**Trigger:** Ms. Rivera is in edit mode.
**Action:** She sets a value for each of the 5 dimensions using the variation's control, such as a segmented 1–5 control, a stepper, or dragging the radar point.
**Outcome:** Each value shows next to its dimension name, and the radar redraws on every change.

Acceptance:
- [ ] All 5 dimensions are editable in the fixed order.
- [ ] The scale follows the proposed default in OQ-1: **1–5 whole numbers, plotted on the radar at value × 20** (1 = 20, 5 = 100). Each step has a short anchor label: 1 "Rarely", 2 "Sometimes", 3 "About half the time", 4 "Usually", 5 "Almost always". These labels are proposed, not decided.
- [ ] Each dimension has a one-line hint describing an observable behavior, phrased as something you'd see in class rather than a trait. Use these placeholder hints and mark them proposed:
  - Emotional Reg: "Recovers after a mistake or frustration"
  - Focus: "Stays on a task with normal room noise"
  - Engagement: "Joins in when something new starts"
  - Task Completion: "Finishes work once it gets hard"
  - Social: "Works well with a partner"

  These come from the five old item IDs (`mistake`, `noise`, `newact`, `hard`, `partner`) and are copy only. They are **not** the Q6 question bank.
- [ ] "Not set" stays a separate state from 1. A dimension that hasn't been touched must never quietly read as 1.

### US-3: The radar updates immediately while she edits

**Trigger:** She changes any one value.
**Action:** None beyond the change itself.
**Outcome:** The radar polygon moves to the new value within one frame, with no Save needed to see it.

Acceptance:
- [ ] While the edit has unsaved changes, the draft polygon is drawn **dashed or outlined**. Saved values are drawn **solid and filled**, so she can tell a preview from a saved state without relying on color.
- [ ] Under the chart, a text line names the current values, for example "Emotional Reg 4 · Focus 3 · Engagement 5 · Task Completion 2 · Social 4". It updates live and also serves as the screen-reader equivalent.
- [ ] An unset dimension's point is not drawn at 0, which would look like a low score. Show a hollow marker or a gap at that axis, labeled "Not set".
- [ ] When reduced motion is off, the polygon may tween in 150 ms or less. When `prefers-reduced-motion` is set, it changes with no animation.

### US-4: Save and see it stick after a reload

**Trigger:** All 5 are set and she taps Save.
**Action:** The prototype writes the values to `localStorage`.
**Outcome:** The panel returns to view mode with the solid polygon, the status "Saved", and "Updated just now by you". Reloading the page shows the same values.

Acceptance:
- [ ] Save shows a "Saving…" state on the button for about 400 ms, simulated, and the button can't be tapped twice in that time.
- [ ] After saving, the view-mode radar matches the saved values exactly, including after a full page reload.
- [ ] The "Updated <relative time> by you" line comes from the saved `updatedAt`.
- [ ] The caption under the radar names the lowest-scored dimension, for example "Lowest right now: Task Completion." This matches the focus caption in rebuild doc S3. It is plain fact with no advice and no AI-generated text.

### US-5: Update existing scores later

**Trigger:** Days later, Ms. Rivera has seen Maya improve and reopens the profile. Saved scores exist.
**Action:** She taps "Edit", changes one or two values, and saves.
**Outcome:** The new values replace the old ones, and the timestamp updates.

Acceptance:
- [ ] Edit mode opens with the saved values already filled in.
- [ ] Cancel throws away the draft, puts the solid saved polygon back, and changes nothing in storage.
- [ ] Leaving or reloading with unsaved changes triggers the browser's native "unsaved changes" prompt (`beforeunload`). A custom modal isn't needed.
- [ ] Revision history is out of scope. Only the latest values and the `updatedAt` time are kept. WVR-37 said answers "can be revised over time", and this covers that.

### US-6: Validation error

**Trigger:** She taps Save with one or more dimensions still "Not set", or, in a variation with a number field, enters a value outside 1–5.
**Action:** The prototype blocks the save.
**Outcome:** An inline error appears and focus moves to the first problem.

Acceptance:
- [ ] The error text is "Set all 5 before saving" plus the list of missing dimensions, for example "Missing: Focus, Social". It appears next to the Save button and next to each missing row.
- [ ] Out-of-range or non-whole input shows "Use a whole number from 1 to 5" on that row.
- [ ] Nothing is written to storage while there's an error, and the saved polygon doesn't change.
- [ ] The error is announced through `aria-live="assertive"` and focus moves to the first invalid control.
- [ ] Errors use text and an icon such as "!", not red alone.

(Requiring all 5 is a **proposed** rule. See OQ-3.)

### US-7: Loading, and failing closed

**Trigger:** The profile is loading slowly ("Slow load"), the load fails ("Fail load"), or a save fails ("Fail next save").
**Outcome:** The UI never shows numbers it doesn't actually have, and never says "Saved" when the save didn't happen.

Acceptance:
- [ ] **Loading:** a skeleton pentagon with the text "Loading Weaver Wheel…". No values and no Edit button until the load finishes.
- [ ] **Load failed:** "Couldn't load the Weaver Wheel." plus a Retry button. No radar polygon, no fallback scores, and editing is disabled. A teacher must not be able to overwrite data she can't see.
- [ ] **Save failed:** edit mode stays open with the draft intact, and the message is "Not saved. Check your connection and try again." Storage stays on the previous values, the status never shows "Saved", and Retry resends the same draft.
- [ ] Every status change goes through one `aria-live="polite"` region: "Loading", "Saved", "Not saved".

### US-8: Teacher-authored only

**Trigger:** Any state.
**Outcome:** Nothing on screen suggests the values came from, or could come from, AI or the student.

Acceptance:
- [ ] No "Suggest", "Auto-fill", "AI estimate", "Explain", sparkle icon, or chat anywhere in this UI.
- [ ] There's no control or link that lets a student or parent edit, and no link to `/s/...` in the Wheel panel.
- [ ] The view mode always shows the provenance line "Set by you (teacher). Teacher observation, not a diagnosis." WVR-37's ICM-LOCK requires it be shown as teacher opinion, not diagnosis.
- [ ] The radar's legend is "Your view", not "Estimate" or "Score".

### US-9: Phone layout (Jah tests on his phone)

Acceptance:
- [ ] It works at 360–430 px wide with no horizontal scroll. The panel stacks: title, then the radar (about 260 px square, centered), then the values line, then the 5 controls, then the action bar.
- [ ] In edit mode the Save and Cancel bar is **sticky at the bottom**, respects `env(safe-area-inset-bottom)`, and stays reachable with the thumb.
- [ ] Every tap target is at least 44 × 44 px with at least 8 px between neighboring targets. In a segmented 1–5 control, each segment is at least 44 px wide.
- [ ] Radar labels don't get clipped at 360 px. Abbreviate in the chart only if you have to ("Emo Reg", "Task Comp"), and keep the full name in the rows and the values line.
- [ ] At 1024 px and wider, the radar sits on the left and the controls on the right. This is nice to have; phone comes first.
- [ ] Include `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.

### US-10: Keyboard and screen reader

Acceptance:
- [ ] The whole flow works by keyboard: Tab reaches Edit, each dimension control, Save, and Cancel in visual order.
- [ ] A 1–5 segmented control is a `role="radiogroup"` with roving tabindex. Arrow keys change the value, and Home and End jump to 1 and 5. A slider variation uses `<input type="range" min="1" max="5" step="1">` with `aria-valuetext` like "4, Usually".
- [ ] In a drag-the-radar variation, every point is also keyboard-operable (focus the point, arrows change it) **and** there is a non-drag control for each dimension.
- [ ] Each control is labeled with the dimension name and hint. The radar SVG has `role="img"` and an `aria-label` that matches the values line.
- [ ] Focus is always visible (a ring 2 px or thicker with 3:1 contrast). Text contrast is at least 4.5:1.
- [ ] Escape in edit mode works like Cancel. If there are unsaved changes, it asks first with a native `confirm`.

## Suggested variations (Proto chooses 2–3)

Every variation must meet US-1 to US-10. Only the input pattern changes between them.

| Var | Input pattern | What it tests |
|---|---|---|
| v1 | **Five rows of segmented 1–5 buttons** under the radar | Fastest scoring by tap; the baseline |
| v2 | **Drag the radar points**, plus a compact stepper row for each dimension | Whether direct manipulation feels more natural on a phone |
| v3 | **One dimension at a time** (card stepper: hint, then 1–5, then Next), with the radar always visible above | Whether focusing on one dimension gives more considered scores than a dense form |

If Proto wants to test the scale question (OQ-1), v3 may use 0–100 in steps of 10 instead. In that case its top banner must say "Scale test: 0–100". All other variations stay on the proposed 1–5.

## Product rules pulled from related issues

| Source | Rule | How it shows up here |
|---|---|---|
| WVR-235 (this issue) | 5 dimensions, set from the Student Profile, persisted under teacher RLS, update the radar immediately, teacher-authored only, fail-closed invariants preserved | US-2, US-3, US-4, US-7, US-8 |
| WVR-118 (decided 2026-08-29, canceled 2026-11-25) | "The stored placement is the teacher's, not the model's." Teacher-authored, to avoid automated profiling of minors. **WVR-118 also had the AI propose a placement with reasoning. WVR-235 drops that ("no AI inference") and replaces WVR-118, so these stories follow WVR-235.** | US-8; no AI anywhere |
| WVR-118 | Radar with the **class average behind it** | Not built. See OQ-4. |
| WVR-37 ICM-LOCK | "Spectrum is a proposed weight vector with ceilings, shown as **teacher opinion, not diagnosis**." "**No chat in the prototype.**" WVR-52 output "must not write into generation prompts." | US-1 copy, US-8 provenance line, no chat. Feeding generation prompts is out of scope here and remains a rule for the real build. |
| WVR-37 | Items read as **observable behaviors, not trait labels**. The teacher can **revise as she gets to know the student**. | US-2 hints, US-5 |
| WVR-37 comment (2026-08-29) | The "research-backed questionnaire" has **no candidate instrument** | Matches Q6. No question bank in this UI (OQ-2). |
| WVR-72 | Closed enum of dimensions; weights are teacher opinion, not diagnosis; a misuse warning for each dimension | Fixed 5 (rule 2). A misuse warning for each dimension is not written yet (OQ-5). |
| wvr `AGENTS.md` invariants 1 and 3; migration 005 RLS | First name only; no secrets in the browser; only the class's teacher reads or writes Wheel rows | Rules 4 and 5; no network calls |
| weaver-v0 `docs/rebuild/screens/S3-student-profile.md` | 5 axes in fixed order, 0–100 radar, a lowest-dimension focus caption, the empty state, and a focusable axis label for each dimension | US-1, US-3, US-4, US-10 |

## Open questions (all defaults are PROPOSED, not decided; Jah hasn't answered)

| # | Question | Proposed default Proto should use | Why |
|---|---|---|---|
| OQ-1 | **What score scale does the teacher enter?** The current radar draws 0–100, and old rebuild doc Q6 suggested 1–5 Likert scaled to 0–100. | **1–5 whole numbers, plotted as × 20.** Store the raw 1–5. | Coarse steps fit "opinion, not diagnosis" better than fake precision like 73, and they're faster on a phone. |
| OQ-2 | **Does a question bank appear in this UI?** This is weaver-v0 rebuild Q6. The item list for the five zones was never defined, and WVR-37 says no research-backed instrument has been picked. **Still unanswered. Not decided.** | **No question bank.** The teacher sets the 5 scores directly, and each dimension gets one placeholder observable-behavior hint (US-2). | WVR-235 asks for the 5 scores to be entered directly, and building items now would make up an instrument. |
| OQ-3 | Can a teacher save some dimensions and leave others unset? | **No. All 5 are required before saving** (US-6). | It avoids a radar that looks lopsided because of missing data, and it's simpler to fail closed. |
| OQ-4 | Show the class average behind the radar, as WVR-118 asked? | **Off** in this prototype. | It needs the whole class's data and raises comparison and privacy questions. Decide separately. |
| OQ-5 | Misuse warnings for each dimension (WVR-72) and "ceilings" (WVR-37): what are they? | **None shown** beyond the single "not a diagnosis" line. | Neither has been written. Don't make them up. |
| OQ-6 | Keep a revision history or trend over time? | **Latest value only**, plus `updatedAt`. | `revised_at` exists in the schema, but no history UI has been specified. |
| OQ-7 | How should the 1–5 anchor labels be worded? | Rarely / Sometimes / About half the time / Usually / Almost always | Frequency wording describes what the teacher saw, not a trait. |
| OQ-8 | What's the data contract with the existing `student_wheel_answers` table, which stores questionnaire options and "No scores"? | Out of scope for Proto. Flag it for the build spec: the real build probably needs a new column or table for scores. | The migration 005 comment says the table holds no scores. |

## Acceptance checklist seeds (for Sequoia's `checklist.md`; not the checklist itself)

1. The 5 dimensions appear in this exact order and spelling: Emotional Reg, Focus, Engagement, Task Completion, Social.
2. The empty state shows no polygon, no numbers, and no default scores.
3. Changing any value redraws the radar right away. The draft is dashed and the saved state is solid.
4. Save with all 5 set shows "Saved", and a reload shows the identical values (`localStorage`).
5. Cancel and Escape throw away the draft, and storage stays unchanged.
6. Saving with any dimension "Not set" is blocked, the missing dimensions are named, focus moves to the first one, and nothing is written.
7. Out-of-range input (if the variation has a number field) is rejected with an inline message.
8. "Slow load" shows a skeleton with no values and no Edit button until loaded.
9. "Fail load" shows the error and Retry, with no polygon and editing disabled.
10. "Fail next save" keeps the draft and shows "Not saved", storage still has the previous values, and "Saved" never appears.
11. No AI, suggest, autofill, sparkle, or chat control appears anywhere. There's no student edit control and no `/s/` link.
12. The provenance line "Set by you (teacher). Teacher observation, not a diagnosis." is visible in view mode.
13. Only the first name "Maya" appears. No last name, photo, or ID.
14. At 360 px wide there's no horizontal scroll, all tap targets are 44 px or larger, and the Save bar is sticky and clear of the safe area.
15. The whole flow works by keyboard only, focus is always visible, and the radiogroup or slider arrow keys work.
16. A screen reader hears each control's label and value, the radar's `aria-label` matches the values line, and status changes are announced.
17. With `prefers-reduced-motion`, nothing animates.
18. The file is self-contained: the network panel shows no requests after the first load, and the page works offline.
19. The "Lowest right now: …" caption matches the lowest saved value. In a tie, it names the first tied dimension in the fixed order (proposed).
20. "Reset demo" clears this variation's key only.
