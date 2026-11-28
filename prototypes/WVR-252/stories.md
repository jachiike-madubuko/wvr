# User stories: WVR-252

Written by WVR.dev. **Revision 4, 2026-11-28 (America/Denver).** Status: nits from Petey's redteam-r2 applied. Ready for Proto. Sequoia's round-2 checklist is in `checklist-r2.md`.

> **Proposed defaults are not product rules.** Anything marked **[PROPOSED]** is a suggested default, not a decision. Do not bake those defaults into the stories or acceptance criteria as decided product rules. Items that record an earlier Jah decision are labeled as such.

Do not build from Revision 2 or from the rejected R1 v1–v3.

## Issue

- Linear: [WVR-252, Credit-gated interest switch (top five) and teacher-forced switch](https://linear.app/weaver-edu/issue/WVR-252/credit-gated-interest-switch-top-five-and-teacher-forced-switch)
- Status: Backlog (unchanged). Priority: High. Project: Weavr Clean Rebuild. Team: Weaver. No cycle. Related to [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest). Renamed 2026-11-28 (America/Denver) after Jah's decision.
- One-paragraph summary: Jah rejected the round-1 variations because an adjacency credit gate should not exist. Once the credit limit has been achieved, the student can switch to any of their top five interests. There is no Galaxy map in the student view. A switch still waits until the credit target is met, still goes to the teacher as a pending request, and still does not apply immediately. The teacher can force a switch without choosing the destination; a force-time timeline entry names no destination; the student picks at the boundary. The force pick set is a prototype fixture that follows the request set (see OQ-4); Jah's Nov 28 words cover switching after the credit target, not the force list. WVR-231 v4 remains the locked baseline for the move-button skin and for "at most one equipped item per slot."

Related context, not work to revive or rebuild:

- [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest) (In Progress; v4 locked) already prototyped the Trophy Bag and the student-request Approve/Deny loop. Do not rebuild that pass. Keep a lean path so a student switch request can still go pending → teacher decision.
- [WVR-228](https://linear.app/weaver-edu/issue/WVR-228/rebuild-phase-3-screen-1-and-screen-2-3d-flip-room-shell-galaxy) (Done) is the teacher's Galaxy Homepage. The teacher view may use a simplified desktop class stand-in. Do not put a Galaxy map in the student view.
- [WVR-157](https://linear.app/weaver-edu/issue/WVR-157/credit-metered-galaxy-node-traversal-and-wearable-inventory) (Canceled) was an earlier credit-metered traversal ticket. Do not revive it.
- C51 (personal credit bar vs bell-curve engine) has been open since 2026-11-17. It stays out of this prototype.
- Phase 3/4 `have/need` and required-reason rules stay in Open questions. Do not mix them into the acceptance criteria.

## Scope

**What this prototype tests:** two desktop loops, in one file, with no student Galaxy map: (1) a credit-gated interest switch among the student's top five — locked until the credit target is met, then a request to any of those five (other than the current interest, unless Stay is later decided) that waits for the teacher and does not apply immediately; (2) a teacher-forced switch, with no destination chosen by the teacher, a force-time log that names no destination, and a student pick at the delayed boundary from the same top five.

**Why this cut:** Jah, 2026-11-28 (America/Denver), verbatim: "These are all bad one of the main things that is missing is the credit gate for adjacent interest is something that needs to be removed it should not exist. It is a weird limit to put on kids trying to switch interest. They should be able to switch between any of their top five once the credit limit has been achieved. that would remove the galaxy map from the student view, so do another round of variations"

**Out of scope (do not build):**

- A Galaxy map, node ring, adjacency, or "adjacent" / "not next to" lock in the student view.
- Rebuilding the rejected R1 v1–v3, or the locked v4 Trophy Bag and full Approve/Deny modal, except a lean pending → Approve/Deny path and except honoring v4 bag rules if a bag or avatar is shown.
- Earning credits through a real lesson, packet, or hook; the bell-curve credit engine; and C51.
- W4's ChoiceScreen (an immediate keep-or-switch at a credit goal that skips the teacher). Reaching the credit limit unlocks a request among the top five; it does not apply a switch on the spot.
- A teacher "switch now" control that applies a change immediately.
- Teacher-suggested switch as an intervention, mid-unit overrides, and stuck/bored escape prompts.
- The full teacher 3D flip room, Pace Calendar, Student Insight, Weaver Wheel, check-ins, and intervention drawer.
- The student lesson mosaic, hook gate, `/s/[token]` path, login, and any real calendar generator.
- Phone, iPhone, or VoiceOver layouts. Desktop only.
- Any network call: no Neon, no API, no fetch, and no app source.
- Last names, photos, emails, IDs, or any name on the demo-name guard list.

## Ground rules for Proto (read first)

1. **Self-contained HTML.** One `index.html` per variation, inline CSS and JS, system fonts, no CDN, no build step, and nothing imported from the app. It must work as a static desktop page.
2. **Desktop only.** Grade at **1280×800**. Also confirm no horizontal scroll at 1024px or wider. Do not add a phone layout, a home-indicator offset, or a mobile breakpoint as a requirement.
3. **Two screens, one page.** A clearly labeled Student view and Teacher view, with a way to move between them without losing state. This is a prototype affordance, not a product role-switcher.
4. **No network.** Persist only on this device. A footer note may read "Prototype: saved on this device only."
5. **Student identity is first-name only, and it is a prototype pseudonym.**
   - The student label on screen is **"Student A"** until Jah picks a name (OQ-7). Put a small tag next to the name: "Prototype pseudonym".
   - If a teacher or class label is shown, use **"Teacher"** and **"Class"**.
   - Do not use Maya, or any name that might be a former real student name. The known guard list includes Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, and Lila.
   - No last name, photo, email, or ID anywhere on screen.
   - Proposed names stay in OQ-7 only as **[PROPOSED]** fixtures. Do not bake them into the UI, ground rules, or acceptance criteria while OQ-7 is open.
6. **Visual tone.** Low fidelity, but in the app's dark palette: page `#0b1020`, panel `#111728`, text `#f6f1ea`, muted text `#8892b0`, accent `#58b6fa`, error `#ff7a7a`, borders `rgba(255,255,255,.1)`, panel radius 24px. Simple SVG or CSS shapes for skins. No 3D, no asset pipeline, no map.
7. **v4 consistency.** The destination skin fills the request / move button background for the interest being asked, so the preview is visible at the decision point. The button label stays readable on a dark chip or equivalent contrast treatment. If a Trophy Bag or avatar appears at all, it must follow the locked v4 rule: a slot can show multiple owned items, and at most one item is equipped per slot, with a clear "only one per slot is equipped at a time" cue. Do not add equip or unequip controls. Do not rebuild the bag as a second request path.
8. **Top five, not adjacency.** Interest labels on screen are first-class interest names, not subject names, and are fixtures (see OQ-7). Show five interests, one of them current. Once the credit target is met, any of the other interests in that set can be requested. Do not present a shortened label as decided. Do not label any interest "Adjacent."
9. **No student Galaxy map, and no adjacency or Travel wording in the student view.** Do not draw a map, a node ring, or neighbors. The student view must not contain the strings "Adjacent", "adjacent", "non-adjacent", "not next to", "Galaxy map", "galaxy map", "Travel", or "Ready to travel", in any state.
10. **Decision surface stays above the fold.** At 1280×800, the decision surface — credit gate or status, and the switch request / pick / pending / scheduled / force-coming control — stays visible without scrolling in every state listed in US-7.
11. **Prototype controls** sit at the top of the page and must not look like teacher or student product UI. They must include: Reset demo; a way to set credits below the target; a way to set credits at or above the target; and a way to trigger the delayed boundary. Do not build a lesson that earns credits.
12. **Proposed-defaults banner** on every variation, under the header, muted, collapsible to one line, not removable. Text: **"Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app."**
13. **Demonstrate the two loops separately.** Start seeded below the credit target, with no pending request and no forced switch. Reset between the request loop and the force loop. Do not invent a product rule for overlap (see OQ-6).
14. **Amounts stay in Open questions.** Do not present a credit target or a have/need number as a decided product rule. Fixture amounts, if shown, belong under OQ-1.
15. **Build notes (adopted R1 improvements).** Sequoia records this round in `results-r2.md`; do not edit that file. Use the shared `check.cjs` on the proto scaffold branch, and add only this issue's checks. Before the build starts, Proto runs a GitHub access check (`gh auth status` and `git ls-remote`) and, if needed, asks Jah for a token while building. This stories file does not authorize any GitHub work by WVR.dev.

## Persona

**Student A** is a grade 2–4 student in this class. They should be able to see their current interest and their top five, tell when they cannot switch yet because of credits, and request a switch to any of the other interests in that set once the credit limit is met. A forced change does not apply immediately — they will pick the new interest at the boundary. The prototype fixture uses the same top-five set as the request (see OQ-4).

The **teacher** is on a desktop class view. They should be able to force a switch without choosing the destination, decide a pending request with a lean Approve/Deny path, and see approved and forced switches on a short timeline, without a force-time entry that names a destination the student has not picked yet.

## Stories

### US-1: See my current interest and my top five

**As a** student, **I want** to see my current interest and the other interests in my top five, without a map, **so that** I know where I am and what I can switch to once I have enough credits.

Acceptance:

- [ ] The Student view shows the current interest, clearly marked as current, and five interests in total (the current one plus four others).
- [ ] There is no Galaxy map, node ring, or neighbor layout in the student view.
- [ ] The student view does not use adjacency as a concept or a label. It must not contain "Adjacent", "adjacent", "non-adjacent", "not next to", "Galaxy map", "galaxy map", "Travel", or "Ready to travel".
- [ ] Interest labels on screen are fixtures (see OQ-7). Do not treat a specific name, or a shortened name, as a decided product label.

### US-2: Below the credit limit, I cannot switch yet

**As a** student, **I want** switch requests to stay locked while I am below the credit target, **so that** I can tell this is a credit limit, not a limit on which interests I may choose.

Acceptance:

- [ ] In the seeded state, credits are below the target. No switch request can be submitted to any of the top five.
- [ ] The Student view makes the credit reason visible. The exact meter, have/need, or copy treatment is not decided (see OQ-2). Do not treat a specific target number as a product rule (see OQ-1).
- [ ] The lock reason is a credit reason only. It must not say that an interest is locked because it is or is not adjacent.
- [ ] Using a prototype control to keep credits below the target leaves switch requests locked after a reload.

### US-3: Once the limit is met, I can request a switch to any of my other top-five interests

**As a** student, **I want** to request a switch to any of the other interests in my top five once I have the credit target, **so that** I can ask to move, and I want that change to wait for my teacher and not apply immediately.

Acceptance:

- [ ] A prototype control can set credits to at or above the target. Each of the other interests in the top five then becomes available to request. The current interest stays marked current and is not submitted as a destination unless Stay is later decided (see OQ-4).
- [ ] Submitting a request to any one of those interests creates one request in a `pending` state. The current interest does not change.
- [ ] After submit, the Student view shows that the request is waiting for the teacher. The student cannot submit a second request while one is `pending`.
- [ ] The Teacher view can see that pending request and complete it with a lean Approve/Deny path (one activation each; no required reason field in this prototype only; see OQ-3). This is a stand-in for the locked v4 modal, not a rebuild of it.
- [ ] Approving moves the request out of `pending` and marks it as scheduled. The approved change does not apply immediately. The Student view still shows the current interest. A clear message says the approved change does not apply yet. Do not treat "next session" as decided product phrasing (see OQ-5). If a line about unfinished current work appears, treat "today's work" (or similar) as fixture tone, not product copy.
- [ ] When the delayed-boundary prototype control is triggered after an approval, the student's current interest becomes the approved destination, and the scheduled state clears.
- [ ] Denying clears the pending state, does not schedule a later move, and leaves the student on the current interest. A deny is not final (Jah, 2026-11-17 5:06 PM MT, America/Denver: "Decline doesn't use the cap; can ask again"). Whether the request control returns immediately or later is still open (see OQ-8). Do not lock the student out of ever requesting again. If the control returns, it is still credit-gated, and any of the other top-five interests can be requested.
- [ ] If deny copy is shown on the Student view, start from the locked v4 line, substituting the current interest's fixture label: "Your teacher said not now. You are still on [current]. You can ask again." Do not invent a third line. The W4 sentence "Your teacher says stay for now." is documentation only, not a new decision, and is not the required line. Exact wording is stand-in copy, not a product rule (see OQ-8).
- [ ] Reloading before the delayed transition keeps the student on the current interest, with the pending or scheduled state preserved.

### US-4: The destination skin is visible on the request control

**As a** student, **I want** the destination skin to fill the request / move button background for the interest I am asking to switch to, **so that** I can preview the destination at the decision point, consistent with locked v4.

Acceptance:

- [ ] When a switch request is available, the request / move control for a destination uses that interest's skin as its background. The label stays readable (a dark chip or equivalent contrast treatment is fine).
- [ ] The skin preview must not look like the student has already moved, and must not look like a change to what is equipped or worn.
- [ ] While requests are locked, or a request is pending or scheduled, that destination-skin control is not presented as a pressable request action. Pending or scheduled states may use a disabled status treatment (v4 used a flat disabled pill and dropped the destination skin on those states). Do not leave a pressable destination-skin button on a locked, pending, or scheduled request.
- [ ] This story does not require a Trophy Bag. If a bag or avatar is shown, follow Ground rule 7: multiple owned items may appear in a slot, and at most one item is equipped per slot. No equip control.

### US-5: The teacher can force a switch; the student picks at the boundary

**As a** teacher, **I want** to force a switch without choosing the destination, **so that** I can start a change, and the student still picks the new interest at the delayed boundary.

Acceptance:

- [ ] The Teacher view is a simplified desktop class view with Student A visible. It is not the 3D flip room or the calendar, and it is not a student Galaxy map.
- [ ] A clear Force switch control is associated with Student A. It is visually distinct, and it is not a default the teacher might hit by accident. A short confirm is allowed. This story does not require a reason field (see OQ-3).
- [ ] The teacher does not choose the destination. Jah, 2026-11-17 5:06 PM MT (America/Denver), verbatim: "Forced switch: student picks at boundary."
- [ ] After the force is confirmed, the student's current interest does not change. The Student view shows that a change is coming and that the student will pick the new interest. It must not name or preview a destination as already chosen, and it must not label any interest "Adjacent" (including a leftover R1 label). Do not treat "next session" as decided product phrasing (see OQ-5). If a line about unfinished current work appears, treat "today's work" (or similar) as fixture tone, not product copy.
- [ ] When the delayed-boundary prototype control is triggered after a force, the Student view presents a pick step. The student can choose a new interest, and only then does the current interest change. **[PROPOSED] fixture:** the force pick set follows the student-request set (the other interests in the top five). Jah's Nov 28 words cover switching after the credit target, not the force pick set. "Forced switch: student picks at boundary" (Nov 17) still holds, and the force-time UI must not name a destination (US-6). Whether the force pick set is the top five, and whether Stay is also offered, stays in OQ-4. If Stay is omitted, or if the force list matches the request set, that is a prototype fixture only and does not close OQ-4; do not present either as the product rule.
- [ ] Triggering the delayed-boundary control with no scheduled force and no scheduled approval does not change the current interest.
- [ ] Reloading after the force and before the boundary keeps the student on the current interest, with the forced change still scheduled.
- [ ] Closing or canceling the force control before confirming leaves no forced change scheduled.

### US-6: The timeline logs approved and forced switches

**As a** teacher, **I want** a simple timeline that records approved and forced switches, **so that** I can tell those two decisions apart, without a forced-switch entry that looks as if a destination were already chosen.

Acceptance:

- [ ] The Teacher view includes a simple timeline (a short list is enough).
- [ ] Approving a student request adds an approved-switch entry. That entry may name the requested destination, because the student already picked it in the request (Jah, 2026-11-17 5:06 PM MT: "Student picks new interest in the request").
- [ ] Confirming a force adds a forced-switch entry at force time. That force-time entry may name Student A and that a force was started. It must not name a destination interest. Jah, 2026-11-17 5:06 PM MT, verbatim: "Forced switch: student picks at boundary."
- [ ] The chosen interest on a forced switch is logged only after the student picks at the boundary (a new timeline line, or an update to the existing force entry, is fine). Before that pick, no timeline line names a destination for that force.
- [ ] Approved-switch and forced-switch entries are visually distinguishable from each other, including after the destination is later logged on a force.
- [ ] A denied request does not appear as an approved or forced switch. **[PROPOSED] fixture for this pass:** a deny is not logged on the timeline at all. That is not the product rule (see OQ-10).
- [ ] Timeline entries use "Student A", not a personal name, and do not include last names, photos, emails, or IDs.
- [ ] This story requires a log entry. It does not require a reason to be typed in order to force or approve (see OQ-3).

### US-7: First-name-only desktop prototype, decision surface above the fold, no leftover map chrome

**As a** teacher and a student in this prototype, **I want** only a safe student label and the two leftover loop screens, with the decision surface visible at a desktop size, **so that** the prototype stays safe to show and easy to judge.

Acceptance:

- [ ] The only student name on screen is "Student A", with the "Prototype pseudonym" tag. No last name, photo, email, or ID. Do not show "Tobin", "Ms. Rivera", "Room 12", or any other personal name while OQ-7 is open.
- [ ] No name from the guard list in Ground rule 5 appears anywhere.
- [ ] Both screens are usable at 1280×800, with no horizontal scroll at 1024px or wider.
- [ ] At 1280×800, the decision surface stays above the fold (top edge less than 800px, visible without scrolling) in every of these states: seeded / below target; credits met, request available; request pending; request approved and scheduled; after a deny; force confirmed, before the pick; boundary pick; after a switch has applied.
- [ ] Primary actions (request when unlocked, Force switch, Approve, Deny, student pick at the boundary, close) are visible and clickable on that desktop layout.
- [ ] There is no phone-only layout, and no copy that tells someone to test this on a phone.
- [ ] Reset demo restores the seeded top five, credit state (below target), current interest, and the absence of pending, scheduled, and timeline entries.
- [ ] In every student-view state above, a screenshot shows no adjacency wording and no Galaxy map (see US-1 and the must-NOT-say list in `checklist-r2.md`).

## Suggested variation directions (build these three)

All three variations must meet US-1 to US-7. They share the same seeded student, the same top-five set, the same deny-copy fixture (OQ-8), the same credit-after-switch fixture (OQ-9), and the same timeline rules (US-6). They must not use a student Galaxy map or an adjacency limit. What changes is how the top five and the request are presented, so Jah can compare. Extras listed under a variation are experiments for that file only, not product requirements for every build. Do not reuse the rejected R1 map layouts.

### v1: List-first

A plain list of the top five, with the current interest marked. Below the credit target, the list is visible but no request can be submitted, and a short credit reason is shown. Once the target is met, any of the other four can be requested from the list. This tests whether the top-five set and the credit limit are obvious without a map and without extra preview chrome.

### v2: Skin chips

**v2-only extra, not required of v1 or v3, and not a product requirement:** each of the top five is a chip or button whose background is that interest's skin (the required US-4 treatment, applied to the set). The current interest is marked and is not a pressable request. Below the target, the chips are visible but not pressable. Once the target is met, any of the other four can be requested from its own skinned control. This tests destination preview at the decision point without a map and without a single "Travel to [one neighbor]" button. Do not fail v1 or v3 for omitting a full set of skinned chips if their request control still meets US-4 for the interest being asked.

### v3: One picker

**v3-only extra, not required of v1 or v2, and not a product requirement:** a single "Ask to switch" control sits on the Student view. It is disabled below the credit target, with the credit reason next to it. Once unlocked, it opens a top-five picker; the student chooses any of the other four, then submits. After a force, the boundary pick uses the same picker, with the current interest still labeled current and no destination pre-selected. This tests a compact decision surface that can stay above the fold in every state. Do not fail v1 or v2 for omitting the single-control picker.

## Closed questions (do not reopen in this pass)

- **Adjacency limit.** Removed. Jah, 2026-11-28, verbatim: "the credit gate for adjacent interest is something that needs to be removed it should not exist." Do not lock, label, or disable an interest because it is or is not adjacent. Do not call Ocean, or any fixture, "Adjacent."
- **Student Galaxy map.** Removed. Same decision: "that would remove the galaxy map from the student view." Do not build a map, node ring, or neighbor layout in the student view.
- **Eligible set after the credit limit.** Decided for the student-initiated switch: "They should be able to switch between any of their top five once the credit limit has been achieved." That does not, by itself, decide the force-boundary pick set. The leftover questions for the force list, and whether Stay is offered, are in OQ-4.
- **Credit still gates switching.** The adjacency gate is gone; the credit limit remains. Switching waits until the target is met. The amount and how credits are earned stay open (OQ-1).

## Open questions

Anything marked **[PROPOSED]** is a suggested default for later discussion, not a rule for this round's stories or acceptance criteria. Items that record an earlier Jah decision are labeled as such.

1. **What is the credit target, and how are credits earned?** WVR-231's issue text uses "e.g., 10 credits" as an example, not a decision. C51 (personal bar vs bell-curve engine) has been open since 2026-11-17. The W4 write-up's per-node amounts are documentation, not a Jah decision, and must not be presented as the product number for every interest. This prototype must not invent an earning loop. **[PROPOSED] fixture:** seed below one fixture target (10 is fine if it stays visibly a fixture), and use prototype controls to jump below or to at-or-above that target. Do not treat 10, or any other amount, as decided.

2. **How should the credit gate be shown?** Meter, have/need, or copy only is not decided. US-2 only requires that the reason is a credit reason. **[PROPOSED] for v1:** a short below-target / ready line. Other treatments may appear only as variation extras.

3. **Does Force, Approve, or Deny need a written reason?** WVR-231 is one-tap Approve/Deny. On 2026-11-17 at 5:06 PM MT (America/Denver), Jah's words as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md` include "Decline reason optional" and "Timeline logs approved and forced switches." The same cut's D1 text adds that the teacher can force a switch "with a logged reason." That "logged reason" phrase is cut language, not in Jah's verbatim lines. **[PROPOSED] for this prototype only:** no required reason field on Force, Approve, or Deny; a timeline entry is enough. Confirm before the app build.

4. **What may the student pick at the force boundary, and is Stay offered?** Jah's Nov 28 words cover kids switching after the credit target ("any of their top five once the credit limit has been achieved"), not the force pick set. On 2026-11-17 at 5:06 PM MT: "Forced switch: student picks at boundary." That decides who picks and when, not the list. **[PROPOSED] fixture:** the force pick set follows the student-request set (the other interests in the top five), and Stay is omitted, with a small fixture cue that this is not the product rule.

5. **When does an approved or forced switch take effect: "next session" or "next block boundary"?** Carried from WVR-231 OQ-13. WVR-231's issue body uses `scheduled_for = 'next_session'`. On 2026-11-17 at 4:45 PM MT, Jah's words as recorded in the cut: "Approve D2–D9, the 4-persona cast, and switch defaults 2–8 as proposed." Switch default 3 / D3 waits for the next block boundary by default, with optional "switch now." This prototype must show that an approved or forced change does not apply immediately. It may use a prototype control as a stand-in. Do not treat "next session" as a fresh Jah call, and do not build a "switch now" control in this round. If copy mentions unfinished current work, "today's work" is fixture tone, not product copy. **[PROPOSED] for the prototype only:** the stand-in boundary control.

6. **If a student request is already pending, can the teacher force? If a force is scheduled, can the student still request?** Not decided. **[PROPOSED] for this prototype:** demonstrate the two loops from a clean seed (Reset between them). Do not build overlap-handling as a product rule.

7. **What names and interest labels should appear, and how is the top five chosen?** Stories and acceptance criteria use **Student A**, **Teacher**, and **Class** until Jah picks. How the top five are selected (teacher-set, a ranking, or something else) is not decided. **[PROPOSED] fixtures only — do not bake these into the UI as product names:** student first name "Tobin" (an invented stand-in used on earlier loops, not on the known guard list); teacher "Ms. Rivera" and class "Room 12" appeared in an earlier WVR-231 draft and have not been picked. Interest set of five, one current: "Space" (current), "Ocean", "Plants", "Ballet", "Digging up the past" (labels from the W4 write-up; "Ocean" shortens "Ocean animals" and is not decided). If a name is in doubt, keep Student A rather than guess.

8. **After a deny, does the request control return immediately, or only later, and what copy is shown?** Jah, 2026-11-17 5:06 PM MT: "Decline doesn't use the cap; can ask again." They can ask again; a deny is not final. The leftover question is timing. **[PROPOSED] for this prototype:** the request control can return after a deny, still credit-gated, and still among the other top-five interests. Returning it immediately is a proposed fixture, not a timing decision. **[PROPOSED] deny copy:** start from locked v4, "Your teacher said not now. You are still on [current]. You can ask again." Do not invent a third line. The W4 line "Your teacher says stay for now." is documentation only.

9. **Do credits reset or carry over when a switch applies?** The W4 write-up says credits reset for the new unit. Cut D6, approved as part of D2–D9 on 2026-11-17, says the personal bar carries over. Leave this unresolved as a product rule. **[PROPOSED] fixture for every variation in this pass:** after the boundary applies a switch, leave the credit state unchanged (carry over). Put a small on-screen fixture label on the Student view, in the spirit of "Fixture: credits carried over, not a product rule." Do not clear the meter in one variation and carry it in another. Do not present carry-over as the product rule.

10. **Does a denied request appear on the timeline at all?** US-6 already forbids logging a deny as an approved or forced switch. Whether a distinct deny line should exist is not decided. **[PROPOSED] fixture for this pass:** do not log a deny on the timeline. That is not the product rule.

## Decided, in scope for this build

**Teacher-forced switch.** On 2026-11-17 at 4:44 PM MT (America/Denver), Jah said, recorded as verbatim in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`: "Switch: student asks, teacher approves; teacher can also force." At 5:06 PM MT: "Forced switch: student picks at boundary." And: "Timeline logs approved and forced switches." That capability is decided and is **in scope**. The force-time timeline entry must not name a destination. The student picks at the boundary. The force pick set is a fixture that follows the request set (OQ-4), not a Nov 28 decision.

**Top-five switch after the credit limit, with no adjacency gate and no student Galaxy map.** Jah, 2026-11-28, in the verbatim block in Scope above. R1 v1–v3 are rejected.

## Decided, still out of scope for this build

**"Switch now."** Switch default 3 / D3, approved as proposed on 2026-11-17 at 4:45 PM MT, includes an optional teacher "switch now" control. It is not part of this round. Do not build it here. The product question stays in OQ-5.
