# Test checklist: WVR-252, round 2

Written by WVR.dev on 2026-11-28 (America/Denver) from `stories.md` Revision 3, including the eight adopted improvements from `improvements.md`. Sequoia runs it against every variation and records the outcomes in **`results-r2.md`**. Proto must not edit `results-r2.md`.

Desktop only. Do not run phone, iPhone, or VoiceOver checks, and do not fail a variation for missing a phone layout.

Grade at the commit. Put a **Must-fix** list and a **Polish** list at the top of `results-r2.md`. A must-fix fail blocks the variation for this round. Polish does not, by itself, block. Proposed-fixture fails are build issues against the fixture, not product decisions; note them, and do not treat the fixture as required product behavior.

Do not grade the rejected R1 v1–v3. This checklist is only for the round-2 variations built from Revision 3.

## Fixtures and n/a (do not re-flag as polish)

These stand in for open questions. Record what you saw. Do not treat them as product rules, and do not list them under Polish just for being fixtures.

| Fixture or n/a | Stands in for | How to treat |
|---|---|---|
| Student A, Teacher, Class; "Prototype pseudonym" tag | OQ-7 | Required labels in this pass. Other personal names are a must-fix fail. |
| Top-five interest labels, if the proposed set was used: Space (current), Ocean, Plants, Ballet, Digging up the past | OQ-7 | Note the labels. "Ocean" shortens W4's "Ocean animals" and is not decided. Do not fail for equivalent fixture labels. |
| How the top five were chosen is not shown as a product rule | OQ-7 | Note if the UI implies a ranking or a teacher-set list. |
| A single fixture credit target (10 is fine if visibly a fixture) | OQ-1 | Note the amount. Fail only if it is presented as the decided product number. |
| Credit-gate treatment (copy vs have/need vs meter) | OQ-2 | Do not fail for the chosen treatment. |
| Stay omitted from the request set and from the force-boundary pick, with a fixture cue | OQ-4 | Pass either way; if omitted, do not write it up as the product rule. |
| Deny copy starting from locked v4: "Your teacher said not now. You are still on [current]. You can ask again." | OQ-8 | Proposed copy. Fail if a third invented line, or the W4 "stay for now" line, is treated as a product decision. |
| Request control returning immediately after a deny, still credit-gated, still among the other top five | OQ-8 | Record timing. Fail only if a deny is treated as permanently final. |
| Credits carried over after the boundary, with an on-screen fixture label | OQ-9 | Required fixture for every variation. Fail if a variation clears the meter, or if carry-over is presented as the product rule. |
| A deny is not logged on the timeline | OQ-10 | Proposed. Fail only if a deny is logged as approved or forced. |
| No reason field on Force, Approve, or Deny | OQ-3 | Prototype only, not the product rule. |
| Delay wording that avoids "next session"; "today's work" as fixture tone | OQ-5 | Stand-in copy. Fail if the change already applied, not for session vs block phrasing, unless "next session" appears (must-NOT-say). |
| Trophy Bag / avatar omitted | US-4 | n/a on T-47 if not shown. Do not fail a variation for omitting the bag. |
| v2 skin-chip set, v3 single picker | variation extras | n/a on the other variations. |
| Force-boundary pick set follows the student-request set (other interests in the top five); Stay omitted | OQ-4 | Fixture only. Jah's Nov 28 words cover switching after the credit target, not the force list. |

## State-dependent label risks (watch in every state)

These are pre-build risks (improvement 4). T-12 already covers an interest staying "Adjacent" during a force, and T-12 also fails leftover **Travel** or **Ready to travel** copy. Also check, and fail under T-51 if present:

- A locked or pending control that still reads as a pressable "switch to X".
- A v3 picker that stays pre-selected after cancel, or in the force-coming state (before the boundary pick).
- Stale "requested", "scheduled", or "chosen" tags after a deny, or before the boundary pick, that make a destination look already picked or already applied.

## Must-fix vs polish

**Must-fix:** T-01–T-09, T-11–T-17, T-19–T-25, T-27 (fail only if a deny is treated as permanently final), T-28–T-35 (T-35: fail if there is no pick, if only a neighbor-style set is offered, if the destination was already applied, or if the teacher chose it; the top-five force list itself is a fixture), T-37–T-40, T-42–T-45, T-50, T-51, and T-47 when a bag or avatar is shown. These are the required loops: identity, desktop layout, above-the-fold decision surface, top five with no map and no adjacency, credit limit then any of the other top five, request that waits, force without a teacher-picked destination, student pick at the boundary, timeline timing, must-NOT-say exact copy, state-dependent labels, reset, and out-of-scope controls.

**Polish (not blocking):** typography and spacing; contrast of a destination-skin label beyond "readable"; the v2 chip set or v3 picker if present but slightly messy (T-48, T-49). Fixture-tone copy such as "today's work" is not a fail if the change has not already applied.

**Proposed fixtures (not product rules):** T-10, T-18, T-26, T-35 (force pick set follows the request set), T-36, T-41, T-46. A fail there is a build issue against the proposed fixture.

## Setup

- **Builds under test:** v1 (list-first), v2 (skin chips), v3 (one picker). Open each variation's `index.html` as a static desktop page. Do not grade rejected R1 files.
- **Viewport:** grade at **1280×800**. Also confirm no horizontal scroll at **1024px** or wider. Ignore phone widths.
- **Before each variation, and before any retry after a fail:**
  1. Open Proto controls and tap **Reset demo**.
  2. Confirm the seeded top five, credit state (below target), current interest, and the absence of pending, scheduled, and timeline entries.
- **Walk the two loops separately.** Reset between the request / approve-or-deny loop and the force loop. Do not fail a variation for omitting overlap handling (OQ-6).
- **States** used by fold and must-NOT-say checks: (a) seeded / below target; (b) credits met, request available; (c) request pending; (d) request approved and scheduled; (e) after a deny; (f) force confirmed, before the pick; (g) boundary pick; (h) after a switch has applied.
- **Out of scope; don't fail for these:**
  - Phone, iPhone, or VoiceOver behavior.
  - A rebuilt Trophy Bag, a real lesson that earns credits, the bell-curve engine, W4's ChoiceScreen (immediate keep or switch that skips the teacher), or a teacher "switch now" control. Those must stay out; fail only if they were built (see T-50).
  - Exact proposed fixture strings except where a must-NOT-say or fixture-tag check says otherwise.
  - There is no real backend. "Prototype: saved on this device only" is expected.
- **Tags:** items marked **(proposed, OQ-n)** check a proposed fixture, not a decided product rule. Items marked **(must-NOT-say)** need exact-copy inspection and a screenshot (or a set of state screenshots) in `results-r2.md` evidence.
- **Marking:** use `pass`, `fail`, or `n/a` in each variation column. Use `n/a` only where the item says "v2 only", "v3 only", or "if shown". Give each fail a one-line reason in `results-r2.md`. For T-27, record which re-request behavior you saw, even on a pass.

## Checks

### A. Identity, desktop layout, banner, reset, and above-the-fold

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-01 | US-7 | After Reset demo, the only student name on either view is **Student A**, with a visible "Prototype pseudonym" tag. No last name, photo, email, or ID. **Tobin**, **Ms. Rivera**, and **Room 12** do not appear. If a teacher or class label is shown, it is **Teacher** and **Class**. Save its own exact-copy screenshot of the seeded Student view and the Teacher view (do not reuse the T-02 guard-list shots as the only evidence). | (must-NOT-say) | | | |
| T-02 | US-7 | No name from the Ground rule 5 guard list appears anywhere (Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, Lila). Search visible copy. Save a screenshot of the seeded Student view and the Teacher view. | (must-NOT-say) | | | |
| T-03 | US-7 | At 1280×800, both views are usable. At 1024px and wider there is no horizontal scroll. Primary actions (request when unlocked, Force switch, Approve, Deny, student pick at the boundary, close, Reset demo, credit controls, delayed-boundary control) are visible and clickable. | | | | |
| T-04 | US-7 | At 1280×800, the decision surface (credit gate or status, plus the switch request / pick / pending / scheduled / force-coming control) stays above the fold — top edge less than 800px, visible without scrolling — in every state (a)–(h). Capture a 1280×800 screenshot of each state. Fail if the decision surface starts at 800px or below, or requires scrolling, in any state. | | | | |
| T-05 | US-7 | There is no phone-only layout, no mobile breakpoint required to use the loops, and no copy that tells someone to test this on a phone. | | | | |
| T-06 | US-7, GR-12 | Under the header, a muted proposed-defaults banner is present, collapsible to one line, and not removable. It reads: "Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app." | | | | |
| T-07 | US-7, GR-3 | The page has a clearly labeled Student view and Teacher view, with a way to move between them without losing state. | | | | |
| T-08 | GR-11 | Proto controls sit at the top, look like prototype controls (not teacher or student product UI), and include **Reset demo**, a control to set credits below the target, a control to set credits at or above the target, and a control that triggers the delayed boundary. | | | | |
| T-09 | US-7 | Dirty the state (unlock a request, submit, approve or deny, or force a switch). Tap **Reset demo**. The seeded top five, credit state (below target), and current interest are restored, and there is no leftover pending, scheduled, or timeline entry. | | | | |

### B. Top five, no map, no adjacency

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-10 | US-1, OQ-7 | The Student view shows the current interest, clearly marked as current, and five interests in total. Interest labels are fixtures. If the proposed set was used, current is "Space" and the others are "Ocean", "Plants", "Ballet", and "Digging up the past". Do not fail for equivalent fixture labels; note what was used. Do not treat a shortened label as a decided product name. | (proposed, OQ-7) | | | |
| T-11 | US-1, US-7 | In every state (a)–(h), the Student view has no Galaxy map, node ring, or neighbor layout. Save a screenshot of each state. | (must-NOT-say) | | | |
| T-12 | US-1, US-7 | In every state (a)–(h), the Student view text does not contain **Adjacent**, **adjacent**, **non-adjacent**, **not next to**, **Galaxy map**, **galaxy map**, **Travel**, or **Ready to travel**. Search visible copy (and source text if needed). Save a screenshot of any hit, or of states (b), (d), and (f) if clean. This includes leftover R1 labels such as an interest staying "Adjacent" during a force, and leftover Travel or "Ready to travel" copy. | (must-NOT-say) | | | |

### C. Credit limit, then any of the other top five

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-13 | US-2 | After Reset demo, credits are below the target. No switch request can be submitted to any of the top five. | | | | |
| T-14 | US-2 | The lock reason is visible and is a credit reason only. It must not say an interest is locked because it is or is not adjacent. Do not fail for meter vs have/need vs copy (OQ-2). Do not treat a specific target number as a product rule (OQ-1). | | | | |
| T-15 | US-2 | Use the below-target prototype control (or remain at seed), then reload. Switch requests stay locked. | | | | |
| T-16 | US-3 | Set credits at or above the target. Each of the other interests in the top five becomes available to request. The current interest stays marked current and is not submitted as a destination (unless Stay is offered as a labeled fixture; see T-36). | | | | |
| T-17 | US-3 | With credits met, submit a request to one non-current interest, then Reset, raise credits, and submit a request to a different non-current interest in the top five. Both succeed. Fail if only one destination can ever be requested. | | | | |
| T-18 | US-3, OQ-1 | If a credit amount is shown, it is visibly a fixture, not a decided product number. Note the amount. Fail if the amount is presented as the decided product rule. | (proposed, OQ-1) | | | |

### D. Request, delay, deny, and button skin

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-19 | US-3 | With a request available, submit one request. It creates a single `pending` request. The current interest does not change. The Student view shows that the request is waiting for the teacher. | | | | |
| T-20 | US-3 | While the request is `pending`, the student cannot submit a second request. | | | | |
| T-21 | US-3, OQ-3 | The Teacher view can see the pending request and complete it with a lean Approve/Deny path. Each action completes in one activation. There is no required reason field in this prototype. This is prototype-only, not the product rule. | (prototype only, OQ-3) | | | |
| T-22 | US-3, OQ-5 | Approve the pending request. It moves out of `pending` and is marked scheduled. The approved change does not apply immediately. On the Student view the current interest is unchanged, and a clear message says the approved change does not apply yet. Fail if the student already appears to have moved. "Today's work" tone, if present, is fixture tone, not a fail. | | | | |
| T-23 | US-3 | Before triggering the delayed boundary, reload. The student is still on the current interest, and the change is still scheduled. | | | | |
| T-24 | US-3 | Trigger the delayed-boundary prototype control after an approval. The student's current interest becomes the approved destination, and the scheduled state clears. | | | | |
| T-25 | US-3 | Reset, raise credits, submit, and **Deny**. The `pending` state clears. It is not scheduled. The current interest does not change. Trigger the delayed-boundary control: it still does not change. The Student view no longer says the request is waiting. | | | | |
| T-26 | US-3, OQ-8 | If deny copy is shown, it starts from the locked v4 line (substituting the current interest label): "Your teacher said not now. You are still on [current]. You can ask again." Save a screenshot of the deny copy. Fail if a third invented line is used as if it were decided, or if the W4 documentation line "Your teacher says stay for now." is treated as a new product decision. | (proposed, OQ-8) (must-NOT-say) | | | |
| T-27 | US-3, OQ-8 | After a deny, record whether the student can request again immediately, later, or not at all. **Fail** if a deny is treated as permanently final, or if the student is locked out of ever requesting again. **Pass** if they can ask again now or later; immediately returning the control is a proposed fixture, not a required timing rule. If the control returns, it is still credit-gated, and any of the other top-five interests can be requested. | (proposed timing, OQ-8) | | | |
| T-28 | US-4 | With a request available, the request / move control for the destination being asked uses that interest's skin as its background. The label is readable. The preview must not look like the student has already moved, and must not look like a change to what is equipped or worn. Save a screenshot of the skinned control. | | | | |
| T-29 | US-4 | While requests are locked, or a request is pending or scheduled, there is no pressable destination-skin request button. A disabled status treatment is allowed. | | | | |

### E. Teacher-forced switch and boundary pick

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-30 | US-5 | The Teacher view is a simplified desktop class view with Student A visible. It is not the 3D flip room or the calendar, and it is not a student Galaxy map. A Force switch control is associated with Student A, is visually distinct, and is not a default the teacher might hit by accident. | | | | |
| T-31 | US-5, OQ-3 | The teacher does not choose a destination when forcing. A short confirm is allowed. There is no required reason field in this prototype. | (prototype only, OQ-3) | | | |
| T-32 | US-5, OQ-5 | After the force is confirmed, the student's current interest does not change. The Student view shows that a change is coming and that the student will pick the new interest. It must not name or preview a destination as already chosen. Save a screenshot of the Student view and the Teacher view at force time. "Today's work" tone, if present, is fixture tone, not a fail. | | | | |
| T-33 | US-5 | Open Force switch and close or cancel before confirming. No forced change is scheduled. The current interest is unchanged. | | | | |
| T-34 | US-5 | After a confirmed force and before the boundary, reload. The student is still on the current interest, and the forced change is still scheduled. | | | | |
| T-35 | US-5, OQ-4 | Trigger the delayed-boundary control after a force. The Student view presents a pick step. The student can choose a new interest, and only then does the current interest change. **[PROPOSED] fixture:** the force pick set follows the request set (the other interests in the top five). That is not a Nov 28 decision. Fail if only one neighbor-style destination is offered, if the destination was already applied before the pick, or if the teacher chose it. Do not write the force list up as the product rule. Save a screenshot of the pick step. | (proposed, OQ-4) | | | |
| T-36 | US-5, OQ-4 | At the pick step, record whether Stay is offered. **Pass** either way. If Stay is omitted, that is a prototype fixture and must not be written up as the product rule. Note in `results-r2.md` which set you saw. | (proposed, OQ-4) | | | |
| T-37 | US-5 | After Reset demo, with no scheduled force and no scheduled approval, trigger the delayed-boundary control. The current interest does not change. | | | | |

### F. Timeline

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-38 | US-6 | Confirm a force. A forced-switch timeline entry appears at force time. It may name Student A and that a force was started. **Fail** if that force-time entry names a destination interest. Save a screenshot of the timeline at force time. | (must-NOT-say) | | | |
| T-39 | US-6 | After the student picks at the boundary, the chosen interest may appear on the timeline (a new line or an update is fine). **Fail** if the chosen interest was logged before that pick. Save a screenshot after the pick. | | | | |
| T-40 | US-6 | Approve a request. An approved-switch entry appears and is visually distinguishable from a forced-switch entry. This entry may name the requested destination (the student already picked it in the request). | | | | |
| T-41 | US-6, OQ-10 | Deny a request. It does not appear as an approved or forced switch. **[PROPOSED] fixture:** it is not logged on the timeline at all. Do not fail if a distinct deny line exists, but note it, and do not treat either behavior as the product rule. Fail only if a deny is logged as approved or forced. | (proposed, OQ-10) | | | |
| T-42 | US-6 | Timeline entries use "Student A" only. No last name, photo, email, or ID. | | | | |

### G. More must-NOT-say exact-copy checks

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-43 | US-3, US-5, OQ-5 | Search visible copy on both views, in states (a)–(h). The product UI must not say **next session**. Proto-control labels may say the delay is a stand-in, but must not present "next session" as the product rule. Save a screenshot of any hit, or note the search as clean. | (must-NOT-say) | | | |
| T-44 | Scope, OQ-5 | There is no product **Switch now** or **switch now** control that applies an approved or forced change immediately. The delayed-boundary control must sit in Proto controls, not in teacher or student product UI. Save a screenshot of any hit, or of the Teacher view if clean. | (must-NOT-say) | | | |
| T-45 | US-5, US-6 | At force time, before the boundary pick, search the Student view, the Teacher view (excluding the later pick), and the timeline. No destination interest (for the proposed set: Ocean, Plants, Ballet, Digging up the past, or any other non-current fixture) is named as the chosen or scheduled destination. The current interest may appear as still current. Save screenshots of the force-time Student view, Teacher view, and timeline. | (must-NOT-say) | | | |

### H. Credit fixture, optional bag, variation extras, and out of scope

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-46 | OQ-9 | After a switch applies at the boundary (approved request or forced pick), the credit state is unchanged (carry over). A small on-screen fixture label states that credits carried over and that this is not a product rule. All three variations must take this same side. Fail if a variation clears the meter instead, or if carry-over is presented as the decided product rule. | (proposed, OQ-9) | | | |
| T-47 | US-4, GR-7 | **If shown.** If a Trophy Bag or avatar appears, a slot may show multiple owned items, at most one item is equipped per slot, the one-equipped-at-a-time cue is visible, and there is no equip or unequip control. Mark **n/a** if no bag or avatar is shown. Do not fail a variation for omitting the bag. | if shown | | | |
| T-48 | v2 extra | **v2 only.** In addition to the required US-4 skin on the request control for the interest being asked, v2 shows each of the top five as a chip or button with that interest's skin. The current interest is marked and is not a pressable request. Below the target, the chips are visible but not pressable. Once the target is met, any of the other four can be requested from its own skinned control. The preview must not look like the student has already moved, or like a change to what is worn. Mark **n/a** for v1 and v3. Do not fail v1 or v3 for omitting a full set of skinned chips if their request control still meets T-28. | v2 only | | | |
| T-49 | v3 extra | **v3 only.** A single "Ask to switch" control sits on the Student view. It is disabled below the credit target, with the credit reason next to it. Once unlocked, it opens a top-five picker; the student chooses any of the other four, then submits. After a force, the boundary pick uses the same picker, with the current interest still labeled current and no destination pre-selected. Mark **n/a** for v1 and v2. Do not fail v1 or v2 for omitting the single-control picker. | v3 only | | | |
| T-50 | Scope | There is no immediate apply on a student request (a request always goes pending, never moves the student on the spot), no teacher "switch now" product control, no W4 ChoiceScreen (an immediate keep or switch when a credit goal is met that skips the teacher), no lesson that earns credits, no required phone layout, and no Galaxy map in the student view. Desktop only. | | | | |
| T-51 | US-4, US-5, v3 | **State-dependent labels.** Walk states (a), (c), (e), and (f). Fail if a locked or pending control still reads as a pressable "switch to X". Fail if, after a deny or in the force-coming state (before the pick), a stale "requested", "scheduled", or "chosen" tag makes a destination look already picked or already applied. **v3 only extra, n/a if v3 has no picker:** fail if the picker stays pre-selected after cancel, or is pre-selected in the force-coming state. Save screenshots of the locked or pending control, the post-deny Student view, the force-coming Student view, and (v3) the picker after cancel. | state-dependent labels | | | |

