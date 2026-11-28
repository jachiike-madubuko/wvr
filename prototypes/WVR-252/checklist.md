# Test checklist: WVR-252

Written by WVR.dev on 2026-11-27 (America/Denver) from `stories.md` Revision 2. Sequoia runs it against every variation and records the outcomes in `results.md`.

Desktop only. Do not run phone, iPhone, or VoiceOver checks, and do not fail a variation for missing a phone layout.

Grade at the commit. Put a **Must-fix** list and a **Polish** list at the top of `results.md`. A must-fix fail blocks the variation for this round. Polish does not, by itself, block. Proposed-fixture fails are build issues against the fixture, not product decisions; note them, and do not treat the fixture as required product behavior.

## Must-fix vs polish

**Must-fix:** T-01–T-13, T-16–T-22, T-24 (fail only if a deny is treated as permanently final), T-25–T-33, T-35–T-37, T-39, T-44, and T-08. T-41 is must-fix when a bag or avatar is shown; otherwise n/a. These are the required loops: identity, desktop layout, credit gate, Travel that waits, force without a teacher-picked destination, student pick at the boundary, timeline timing (no destination at force time), reset, and out-of-scope controls that must not ship in this pass.

**Polish (not blocking):** fold position of secondary chrome (timeline, meter, or an optional avatar) once primary actions are visible and clickable at 1280×800; contrast of the destination-skin label beyond "readable"; typography and spacing; the v2 look strip or v3 upcoming-pick card if present but messy (T-42, T-43). Fixture-tone copy such as "today's work" is not a fail if the change has not already applied.

**Proposed fixtures (not product rules):** T-14, T-15, T-23, T-34, T-38, T-40. A fail there is a build issue against the proposed fixture. Note in `results.md` if the fixture itself felt wrong.

## Setup

- **Builds under test:** v1 (gate-first), v2 (decision-point preview), v3 (upcoming pick). Open each variation's `index.html` as a static desktop page.
- **Viewport:** grade at **1280×800**. Also confirm no horizontal scroll at **1024px** or wider. Ignore phone widths.
- **Before each variation, and before any retry after a fail:**
  1. Open Proto controls and tap **Reset demo**.
  2. Confirm the seeded map, credit state (below target), interests, and the absence of pending, scheduled, and timeline entries.
- **Walk the two loops separately.** Reset between the Travel/approve-or-deny loop and the force loop. Do not fail a variation for omitting overlap handling (OQ-7).
- **Out of scope; don't fail for these:**
  - Phone, iPhone, or VoiceOver behavior.
  - A rebuilt Trophy Bag, a real lesson that earns credits, the bell-curve engine, W4's ChoiceScreen (keep or switch at a credit goal), or a teacher "switch now" control. Those must stay out; fail only if they were built (see T-43).
  - Exact proposed fixture strings (interest labels, deny copy, "today's work" tone, a fixture credit amount, Travel returning immediately after deny, omitting Stay). Those are tagged **(proposed, OQ-n)** and are not required product rules.
  - There is no real backend. "Prototype: saved on this device only" is expected.
- **Tags:** items marked **(proposed, OQ-n)** check a proposed fixture, not a decided product rule. A fail there is a build issue against the proposed fixture, not a product decision. Note in `results.md` if the fixture itself felt wrong. Do not treat a proposed default as required product behavior.
- **Marking:** use `pass`, `fail`, or `n/a` in each variation column. Use `n/a` only where the item says "v2 only", "v3 only", or "if shown". Give each fail a one-line reason in `results.md`. For T-24, record which re-request behavior you saw, even on a pass.

## Checks

### A. Identity, desktop layout, banner, and reset

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-01 | US-8 | After Reset demo, the only student name on either view is **Student A**, with a visible "Prototype pseudonym" tag. No last name, photo, email, or ID. **Tobin**, **Ms. Rivera**, and **Room 12** do not appear. If a teacher or class label is shown, it is **Teacher** and **Class**. | | | | |
| T-02 | US-8 | No name from the Ground rule 5 guard list appears anywhere (Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, Lila). | | | | |
| T-03 | US-8 | At 1280×800, both the Student view and the Teacher view are usable. At 1024px and wider there is no horizontal scroll. Primary actions (Travel when unlocked, Force switch, Approve, Deny, student pick at the boundary, close, view switch, Reset demo, credit controls, delayed-boundary control) are visible and clickable. | | | | |
| T-04 | US-8 | There is no phone-only layout, no mobile breakpoint required to use the loops, and no copy that tells someone to test this on a phone. | | | | |
| T-05 | US-8, GR-10 | Under the header, a muted proposed-defaults banner is present, collapsible to one line, and not removable. It reads: "Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app." | | | | |
| T-06 | US-8, GR-3 | The page has a clearly labeled Student view and Teacher view, with a way to move between them without losing state. | | | | |
| T-07 | GR-9 | Proto controls sit at the top, look like prototype controls (not teacher or student product UI), and include **Reset demo**, a control to set credits below the target, a control to set credits at or above the target, and a control that triggers the delayed boundary for US-3 and US-6. | | | | |
| T-08 | US-8 | Dirty the state (unlock Travel, submit a request, approve or deny, or force a switch). Tap **Reset demo**. The seeded map, credit state (below target), and interests are restored, and there is no leftover pending, scheduled, or timeline entry. | | | | |

### B. Galaxy map and credit gate

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-09 | US-1 | The Student view shows a simplified desktop Galaxy map (not the 3D flip room). The current interest is clearly marked as current. At least one adjacent interest is visible. At least one non-adjacent interest is visible and is not presented as available to travel to. | | | | |
| T-10 | US-2 | After Reset demo, credits are below the target. The adjacent destination is locked. No Travel / move action is available for it. | | | | |
| T-11 | US-2 | The credit lock reason is visible and distinguishable from the non-adjacent / distant reason. Do not fail for meter vs have/need vs copy (OQ-3). Do not treat a specific target number as a product rule (OQ-2). | | | | |
| T-12 | US-2 | Use the below-target prototype control (or remain at seed), then reload. Adjacent travel stays locked. | | | | |
| T-13 | US-3, US-4 | Set credits at or above the target. The adjacent destination becomes available to Travel. The non-adjacent interest stays visible and not submittable, with no Travel / move action that can target it. Its unavailable reason is distinguishable from "not enough credits." | | | | |
| T-14 | US-1, OQ-8 | Interest labels are fixtures. If the proposed set was used, current is "Space", adjacent is "Ocean" (a shortening of W4's "Ocean animals"), and the visible non-adjacent is "Plants". Do not fail for equivalent fixture labels; note what was used. Do not treat a shortened label as a decided product name in the results write-up. | (proposed, OQ-8) | | | |
| T-15 | US-2, OQ-2 | If a credit amount is shown, it is visibly a fixture, not a decided product number, and not presented as the product target for every interest. Do not fail for using a single fixture target; note the amount you saw. Fail if the amount is presented as the decided product rule. | (proposed, OQ-2) | | | |

### C. Travel request, delay, deny, and button skin

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-16 | US-3 | With Travel available, submit one request. It creates a single `pending` request. The current interest does not change. The Student view shows that the request is waiting for the teacher. | | | | |
| T-17 | US-3 | While the request is `pending`, the student cannot submit a second Travel request. | | | | |
| T-18 | US-3, OQ-4 | The Teacher view can see the pending request and complete it with a lean Approve/Deny path. Each action completes in one activation. There is no required reason field in this prototype. This is prototype-only, not the product rule. | (prototype only, OQ-4) | | | |
| T-19 | US-3, OQ-6 | Approve the pending request. It moves out of `pending` and is marked scheduled. The approved change does not apply immediately. On the Student view the current interest is unchanged, and a clear message says the approved change does not apply yet. Fail if the student already appears to have moved. Do not fail for "next session" vs "next block" wording; either delay phrase is stand-in copy. "Today's work" tone, if present, is fixture tone, not a fail. | | | | |
| T-20 | US-3 | Before triggering the delayed boundary, reload. The student is still on the current interest, and the change is still scheduled. | | | | |
| T-21 | US-3 | Trigger the delayed-boundary prototype control after an approval. The student's current interest becomes the approved destination, and the scheduled state clears. | | | | |
| T-22 | US-3 | Reset, unlock Travel, submit, and **Deny**. The `pending` state clears. It is not scheduled. The current interest does not change. Trigger the delayed-boundary control: it still does not change. The Student view no longer says the request is waiting. | | | | |
| T-23 | US-3, OQ-9 | If deny copy is shown, it starts from the locked v4 line (substituting the current interest label): "Your teacher said not now. You are still on [current]. You can ask again." Do not fail for small wording drift around that line; fail if a third invented line is used as if it were decided, or if the W4 documentation line "Your teacher says stay for now." is treated as a new product decision. Exact wording is stand-in copy. | (proposed, OQ-9) | | | |
| T-24 | US-3, OQ-9 | After a deny, record whether the student can Travel again immediately, later, or not at all. **Fail** if a deny is treated as permanently final, or if the student is locked out of ever requesting again. **Pass** if they can ask again now or later; immediately returning the control is a proposed fixture, not a required timing rule. If the control returns, it is still limited to an adjacent destination and still credit-gated. | (proposed timing, OQ-9) | | | |
| T-25 | US-5 | With adjacent Travel available, the Travel / move button uses the destination interest's skin as its background. The label is readable. The preview must not look like the student has already moved, and must not look like a change to what is equipped or worn. | | | | |
| T-26 | US-5 | While Travel is locked, or the request is pending or scheduled, there is no pressable destination-skin Travel button. A disabled status treatment is allowed. | | | | |

### D. Teacher-forced switch and boundary pick

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-27 | US-6 | The Teacher view is a simplified desktop Galaxy Homepage (class view with Student A visible). It is not the 3D flip room or the calendar. A Force switch control is associated with Student A, is visually distinct, and is not a default the teacher might hit by accident. | | | | |
| T-28 | US-6, OQ-4 | The teacher does not choose a destination when forcing. A short confirm is allowed. There is no required reason field in this prototype. | (prototype only, OQ-4) | | | |
| T-29 | US-6, OQ-6 | After the force is confirmed, the student's current interest does not change. The Student view shows that a change is coming and that the student will pick the new interest. It must not name or preview a destination as already chosen. Do not fail for stand-in delay wording. "Today's work" tone, if present, is fixture tone, not a fail. | | | | |
| T-30 | US-6 | Open Force switch and close or cancel before confirming. No forced change is scheduled. The current interest is unchanged. | | | | |
| T-31 | US-6 | After a confirmed force and before the boundary, reload. The student is still on the current interest, and the forced change is still scheduled. | | | | |
| T-32 | US-6, OQ-5 | Trigger the delayed-boundary control after a force. The Student view presents a pick step. The student can choose a destination that is not the current interest, and only then does the current interest change. Fail if the destination was already applied before the pick, or if the teacher chose it. | | | | |
| T-33 | US-6 | After Reset demo, with no scheduled force and no scheduled approval, trigger the delayed-boundary control. The current interest does not change. | | | | |
| T-34 | US-6, OQ-5 | At the pick step, record whether Stay is offered. **Pass** either way. If Stay is omitted, that is a prototype fixture and must not be written up as the product rule. Note in `results.md` which set you saw. | (proposed, OQ-5) | | | |

### E. Timeline

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-35 | US-7 | Confirm a force. A forced-switch timeline entry appears at force time. It may name Student A and that a force was started. **Fail** if that force-time entry names a destination interest. | | | | |
| T-36 | US-7 | After the student picks at the boundary, the chosen interest may appear on the timeline (a new line or an update is fine). **Fail** if the chosen interest was logged before that pick. | | | | |
| T-37 | US-7 | Approve a Travel request. An approved-switch entry appears and is visually distinguishable from a forced-switch entry. This entry may name the requested destination (the student already picked it in the request). | | | | |
| T-38 | US-7, OQ-11 | Deny a Travel request. It does not appear as an approved or forced switch. **[PROPOSED] fixture:** it is not logged on the timeline at all. Do not fail if a distinct deny line exists, but note it, and do not treat either behavior as the product rule. Fail only if a deny is logged as approved or forced. | (proposed, OQ-11) | | | |
| T-39 | US-7 | Timeline entries use "Student A" only. No last name, photo, email, or ID. | | | | |

### F. Credit fixture after a switch, and optional bag

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-40 | OQ-10 | After a switch applies at the boundary (approved Travel or forced pick), the credit state is unchanged (carry over). A small on-screen fixture label states that credits carried over and that this is not a product rule. All three variations must take this same side. Fail if a variation clears the meter instead, or if carry-over is presented as the decided product rule. | (proposed, OQ-10) | | | |
| T-41 | US-5, GR-7 | **If shown.** If a Trophy Bag or avatar appears, a slot may show multiple owned items, at most one item is equipped per slot, the one-equipped-at-a-time cue is visible, and there is no equip or unequip control. Mark **n/a** if no bag or avatar is shown. Do not fail a variation for omitting the bag. | if shown | | | |

### G. Variation extras (not required of every build)

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-42 | v2 extra | **v2 only.** In addition to the required destination-skin Travel button, v2 shows a current-vs-destination look strip at the Travel decision point, labeled as a look preview only and not applied. It must not look like the student has already moved, and must not look like a change to what is worn. Mark **n/a** for v1 and v3. Do not fail v1 or v3 for omitting this strip. | v2 only | | | |
| T-43 | v3 extra | **v3 only.** After a force and before the boundary, the Student view shows an upcoming-pick card: a change is coming, the student will choose then, and no destination is named or highlighted as chosen. At the boundary, the pick step is the main student surface; the current interest is still labeled current, and destinations are clearly choices, not already applied. Mark **n/a** for v1 and v2. Do not fail v1 or v2 for omitting the upcoming-pick card. | v3 only | | | |

### H. Out of scope (fail only if built)

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-44 | Scope | There is no immediate map traversal (Travel always goes pending, never moves the student on the spot), no teacher "switch now" control that applies an approved or forced change immediately, no W4 ChoiceScreen (keep or switch when a credit goal is met), no lesson that earns credits, and no required phone layout. Desktop only. | | | | |
