# User stories: WVR-252

Written by WVR.dev. **Revision 2, 2026-11-27 (America/Denver).** Status: revised after Petey's red team. Ready for Proto. Sequoia's checklist is in `checklist.md`.

> **Proposed defaults are not product rules.** Anything marked **[PROPOSED]** is a suggested default, not a decision. Do not bake those defaults into the stories or acceptance criteria as decided product rules. Items that record an earlier Jah decision are labeled as such.

## Issue

- Linear: [WVR-252, Credit-gated Galaxy traversal and teacher-forced switch (WVR-231 leftovers)](https://linear.app/weaver-edu/issue/WVR-252/credit-gated-galaxy-traversal-and-teacher-forced-switch-wvr-231)
- Status: Backlog. Priority: High. Project: Weavr Clean Rebuild. Team: Weaver. No cycle. Related to [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest). Filed 2026-11-27 (America/Denver).
- One-paragraph summary: This issue picks up the two pieces left out of the locked WVR-231 v4 pass. First, credit-gated traversal on a simplified student Galaxy map: an adjacent destination stays locked until the student has the required credit target, then Travel creates a pending switch request and does not move the student immediately. Second, the teacher can force a switch from a simplified Galaxy Homepage without choosing the destination; that change also does not apply immediately, and the student picks the new interest at a delayed boundary. A simple timeline records approved and forced switches. A force-time timeline entry names no destination; the chosen interest is logged only after the student picks at the boundary. WVR-231 v4 remains the locked baseline for the move-button skin and for "at most one equipped item per slot."

Related context, not work to revive or rebuild:

- [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest) (In Progress; v4 locked) already prototyped the Trophy Bag and the student-request Approve/Deny loop. Do not rebuild that pass. Keep a lean path so map-Travel can still go pending → teacher decision.
- [WVR-228](https://linear.app/weaver-edu/issue/WVR-228/rebuild-phase-3-screen-1-and-screen-2-3d-flip-room-shell-galaxy) (Done) is the Galaxy Homepage. This prototype uses a simplified desktop stand-in, not a rebuild of the 3D flip or calendar.
- [WVR-157](https://linear.app/weaver-edu/issue/WVR-157/credit-metered-galaxy-node-traversal-and-wearable-inventory) (Canceled) was an earlier credit-metered traversal ticket. Do not revive it.
- Phase 3/4 stories (US-36, US-39a, WP-G1) describe a credit `have/need` gate and a required reason on Allow/Block. WVR-231 treats the credit gate as Galaxy-map traversal and calls for one-tap Approve/Deny. Those conflicts stay in Open questions. Do not mix the Phase 3/4 rules into the acceptance criteria.
- C51 (personal credit bar vs bell-curve engine) has been open since 2026-11-17. It stays out of this prototype.

## Scope

**What this prototype tests:** two desktop loops, in one file: (1) a simplified student Galaxy map with a credit gate on adjacent Travel, where Travel creates a pending request and is not an immediate move; (2) a simplified teacher Galaxy Homepage where the teacher can force a switch, the change waits, and the student picks the new interest at a delayed boundary, with a timeline of approved and forced switches. The force-time log names no destination.

**Why this cut:** these are the two leftovers Jah asked to file and loop after v4 was locked. The memorable questions are "can I tell when travel is locked for credits vs just not adjacent, and does travel wait for the teacher?" and "can the teacher force a change without picking the destination, and does the student pick at the boundary?"

**Out of scope (do not build):**

- Rebuilding the locked v4 Trophy Bag, mnemonic copy, or the full Approve/Deny modal, except a lean pending → Approve/Deny path for map-Travel, and except honoring v4 bag rules if a bag or avatar is shown.
- Earning credits through a real lesson, packet, or hook; the bell-curve credit engine; and C51.
- W4's ChoiceScreen (the keep-or-switch moment when a credit goal is met). Credit-gated Travel on the map is not that goal moment. Do not sneak it in from the W4 write-up.
- A teacher "switch now" control that applies a change immediately.
- Teacher-suggested switch as an intervention (a different, already decided action), mid-unit overrides, and stuck/bored escape prompts.
- The full teacher 3D flip room, Pace Calendar, Student Insight, Weaver Wheel, check-ins, and intervention drawer.
- The student lesson mosaic, hook gate, `/s/[token]` path, login, and any real calendar generator.
- Phone, iPhone, or VoiceOver layouts. Desktop only.
- Any network call: no Neon, no API, no fetch, and no app source.
- Last names, photos, emails, IDs, or any name on the demo-name guard list.

## Ground rules for Proto (read first)

1. **Self-contained HTML.** One `index.html` per variation, inline CSS and JS, system fonts, no CDN, no build step, and nothing imported from the app. It must work as a static desktop page.
2. **Desktop only.** Grade at a desktop width (about 1280px, and no narrower than 1024px). Do not add a phone layout, a home-indicator offset, or a mobile breakpoint as a requirement.
3. **Two screens, one page.** A clearly labeled Student view and Teacher view, with a way to move between them without losing state, so both loops can be walked in one file. This is a prototype affordance, not a product role-switcher.
4. **No network.** Persist only on this device. A footer note may read "Prototype: saved on this device only."
5. **Student identity is first-name only, and it is a prototype pseudonym.**
   - The student label on screen is **"Student A"** until Jah picks a name (OQ-8). Put a small tag next to the name: "Prototype pseudonym".
   - If a teacher or class label is shown, use **"Teacher"** and **"Class"**. Do not use a personal teacher name or a room number while OQ-8 is open.
   - Do not use Maya, or any name that might be a former real student name. The known guard list includes Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, and Lila.
   - No last name, photo, email, or ID anywhere on screen.
   - Proposed names stay in OQ-8 only as **[PROPOSED]** fixtures. Do not bake them into the UI, ground rules, or acceptance criteria while OQ-8 is open.
6. **Visual tone.** Low fidelity, but in the app's dark palette: page `#0b1020`, panel `#111728`, text `#f6f1ea`, muted text `#8892b0`, accent `#58b6fa`, error `#ff7a7a`, borders `rgba(255,255,255,.1)`, panel radius 24px. Simple SVG or CSS shapes for map nodes and skins. No 3D, no asset pipeline.
7. **v4 consistency.** The destination skin fills the Travel / move button's background, so the preview is visible at the decision point. The button label stays readable on a dark chip or equivalent contrast treatment. If a Trophy Bag or avatar appears at all, it must follow the locked v4 rule: a slot can show multiple owned items, and at most one item is equipped per slot, with a clear "only one per slot is equipped at a time" cue. Do not add equip or unequip controls (OQ-4 on WVR-231 is still open). Do not rebuild the bag as a second request path; Travel on the map is the student request entry in this pass.
8. **Interest labels** on screen are first-class interest names, not subject names. The current interest, the adjacent destination, and the non-adjacent neighbor are fixture data. Proposed names live in Open questions. Do not present a shortened label as decided.
9. **Prototype controls** sit at the top of the page (a "Proto controls" control is fine). They must include: Reset demo (restore the seeded state); a way to set credits below the target; a way to set credits at or above the target; and a way to trigger the delayed boundary so US-3 and US-6 can be tested. They must not look like teacher or student product UI. Do not build a lesson that earns credits.
10. **Proposed-defaults banner** on every variation, under the header, muted, collapsible to one line, not removable. Text: **"Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app."**
11. **Demonstrate the two loops separately.** Start seeded below the credit target, with no pending request and no forced switch. Walk the credit-gate loop and the force loop from that clean state (Reset between them is fine). Do not invent a product rule for what happens if both are in flight (see OQ-7).
12. **Amounts stay in Open questions.** Do not present a credit target, a have/need number, or a per-interest target as a decided product rule. Fixture amounts, if shown, belong under OQ-2 and must not be treated as the product number for every interest.

## Persona

**Student A** is a grade 2–4 student in this class. They should be able to see where they are on a simple Galaxy map, tell when they cannot travel yet because of credits, tell when an adjacent destination is ready, and understand that a forced change does not apply immediately — they will pick the new interest at the boundary.

The **teacher** is on a desktop Galaxy Homepage. They should be able to force a switch without choosing the destination, decide a pending Travel request with a lean Approve/Deny path, and see approved and forced switches on a short timeline, without a force-time entry that names a destination the student has not picked yet.

## Stories

### US-1: See where I am on the Galaxy map

**As a** student, **I want** to see my current interest and the neighboring interests on a simple Galaxy map, **so that** I know where I am and what is next to me.

Acceptance:

- [ ] The Student view shows a simplified desktop Galaxy map (not the 3D flip room).
- [ ] The current interest is clearly marked as current.
- [ ] At least one adjacent interest is visible.
- [ ] At least one non-adjacent interest is visible and is not presented as available to travel to.
- [ ] Interest labels on screen are fixtures (see OQ-8). Do not treat a specific name, or a shortened name, as a decided product label.

### US-2: Adjacent travel stays locked below the credit target

**As a** student, **I want** adjacent travel to stay locked while I am below the credit target, and I want to see that this is a credit gate, **so that** I do not think the destination is unavailable for the same reason a non-adjacent one is.

Acceptance:

- [ ] In the seeded state, credits are below the target. The adjacent destination is locked. No Travel / move action is available for it.
- [ ] The Student view makes the credit reason visible and distinct from the non-adjacent / distant reason. The exact meter, have/need, or copy treatment is not decided (see OQ-3). Do not treat a specific target number as a product rule (see OQ-2).
- [ ] Using a prototype control to keep credits below the target leaves adjacent travel locked after a reload.

### US-3: Meeting the target unlocks Travel, which requests a move and does not apply it immediately

**As a** student, **I want** to Travel to an adjacent interest once I have the credit target, **so that** I can ask to move, and I want that change to wait for my teacher and not apply immediately.

Acceptance:

- [ ] A prototype control can set credits to at or above the target. The adjacent destination then becomes available to Travel. The non-adjacent interest stays unavailable.
- [ ] Travel is the student request entry in this pass. Submitting it creates one request in a `pending` state. The current interest does not change.
- [ ] After submit, the Student view shows that the request is waiting for the teacher. The student cannot submit a second Travel request while one is `pending`.
- [ ] The Teacher view can see that pending request and complete it with a lean Approve/Deny path (one activation each; no required reason field in this prototype only; see OQ-4). This is a stand-in for the locked v4 modal, not a rebuild of it.
- [ ] Approving moves the request out of `pending` and marks it as scheduled. The approved change does not apply immediately. The Student view still shows the current interest. A clear message says the approved change does not apply yet. Do not treat "next session" as decided product phrasing (see OQ-6). If a line about unfinished current work appears, treat "today's work" (or similar) as fixture tone, not product copy.
- [ ] When the delayed-boundary prototype control is triggered after an approval, the student's current interest becomes the approved destination, and the scheduled state clears.
- [ ] Denying clears the pending state, does not schedule a later move, and leaves the student on the current interest. A deny is not final (Jah, 2026-11-17 5:06 PM MT, America/Denver: "Decline doesn't use the cap; can ask again"). Whether the Travel control returns immediately or later is still open (see OQ-9). Do not lock the student out of ever requesting again.
- [ ] If deny copy is shown on the Student view, start from the locked v4 line, substituting the current interest's fixture label: "Your teacher said not now. You are still on [current]. You can ask again." Do not invent a third line. The W4 sentence "Your teacher says stay for now." is documentation only, not a new decision, and is not the required line. Exact wording is stand-in copy, not a product rule (see OQ-9).
- [ ] Reloading before the delayed transition keeps the student on the current interest, with the pending or scheduled state preserved.

### US-4: Non-adjacent destinations stay closed even when the credit target is met

**As a** student, **I want** a non-adjacent interest to stay unavailable even after I have enough credits, **so that** the credit gate is not confused with the adjacent-only rule.

Acceptance:

- [ ] With credits at or above the target, the non-adjacent interest remains visible and not submittable.
- [ ] There is no Travel / move action that can target the non-adjacent interest.
- [ ] The reason it is unavailable is distinguishable from "not enough credits."

### US-5: The destination skin is visible on the Travel button

**As a** student, **I want** the destination skin to fill the Travel / move button background once travel is available, **so that** I can preview the destination at the decision point, consistent with locked v4.

Acceptance:

- [ ] When adjacent Travel is available, the Travel / move button uses the destination interest's skin as its background. The label stays readable (a dark chip or equivalent contrast treatment is fine).
- [ ] The skin preview must not look like the student has already moved, and must not look like a change to what is equipped or worn.
- [ ] While Travel is locked or the request is pending or scheduled, that destination-skin button is not presented as a pressable Travel action. Pending or scheduled states may use a disabled status treatment (v4 used a flat disabled pill and dropped the destination skin on those states). Do not treat that exact v4 chrome as a new product rule, but do not leave a pressable destination-skin button on a locked, pending, or scheduled request.
- [ ] This story does not require a Trophy Bag. If a bag or avatar is shown, follow Ground rule 7: multiple owned items may appear in a slot, and at most one item is equipped per slot. No equip control.

### US-6: The teacher can force a switch; the student picks at the boundary

**As a** teacher, **I want** to force a switch without choosing the destination, **so that** I can start a change, and the student still picks the new interest at the delayed boundary.

Acceptance:

- [ ] The Teacher view is a simplified desktop Galaxy Homepage (class view with Student A visible). It is not the 3D flip room or the calendar.
- [ ] A clear Force switch control is associated with Student A. It is visually distinct, and it is not a default the teacher might hit by accident. A short confirm is allowed. This story does not require a reason field (see OQ-4).
- [ ] The teacher does not choose the destination. Jah, 2026-11-17 5:06 PM MT (America/Denver), verbatim as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md` and in the WVR-231 Decision section: "Forced switch: student picks at boundary."
- [ ] After the force is confirmed, the student's current interest does not change. The Student view shows that a change is coming and that the student will pick the new interest. It must not name or preview a destination as already chosen. Do not treat "next session" as decided product phrasing (see OQ-6). If a line about unfinished current work appears, treat "today's work" (or similar) as fixture tone, not product copy.
- [ ] When the delayed-boundary prototype control is triggered after a force, the Student view presents a pick step. The student can choose a new interest, and only then does the current interest change. The exact pick set (adjacent only, any interest, or also stay) is not decided (see OQ-5). The fixture must include at least one selectable destination that is not the current interest. If Stay is omitted, that is a prototype fixture only and does not close OQ-5; do not present a no-Stay list as the product rule. A small fixture cue (for example, that the choice set is proposed) is enough.
- [ ] Triggering the delayed-boundary control with no scheduled force and no scheduled approval does not change the current interest.
- [ ] Reloading after the force and before the boundary keeps the student on the current interest, with the forced change still scheduled.
- [ ] Closing or canceling the force control before confirming leaves no forced change scheduled.

### US-7: The timeline logs approved and forced switches

**As a** teacher, **I want** a simple timeline that records approved and forced switches, **so that** I can tell those two decisions apart, without a forced-switch entry that looks as if a destination were already chosen.

Acceptance:

- [ ] The Teacher view includes a simple timeline (a short list is enough).
- [ ] Approving a student Travel request adds an approved-switch entry. That entry may name the requested destination, because the student already picked it in the request (Jah, 2026-11-17 5:06 PM MT: "Student picks new interest in the request").
- [ ] Confirming a force adds a forced-switch entry at force time. That force-time entry may name Student A and that a force was started. It must not name a destination interest. Jah, 2026-11-17 5:06 PM MT, verbatim: "Forced switch: student picks at boundary."
- [ ] The chosen interest on a forced switch is logged only after the student picks at the boundary (a new timeline line, or an update to the existing force entry, is fine). Before that pick, no timeline line names a destination for that force.
- [ ] Approved-switch and forced-switch entries are visually distinguishable from each other, including after the destination is later logged on a force.
- [ ] A denied request does not appear as an approved or forced switch. **[PROPOSED] fixture for this pass:** a deny is not logged on the timeline at all. That is not the product rule (see OQ-11).
- [ ] Timeline entries use "Student A", not a personal name, and do not include last names, photos, emails, or IDs.
- [ ] This story requires a log entry. It does not require a reason to be typed in order to force or approve (see OQ-4).

### US-8: First-name-only desktop prototype, no product chrome beyond these loops

**As a** teacher and a student in this prototype, **I want** only a safe student label and the two leftover loop screens, **so that** the prototype stays safe to show and easy to judge on a desktop.

Acceptance:

- [ ] The only student name on screen is "Student A", with the "Prototype pseudonym" tag. No last name, photo, email, or ID. Do not show "Tobin", "Ms. Rivera", "Room 12", or any other personal name while OQ-8 is open.
- [ ] No name from the guard list in Ground rule 5 appears anywhere.
- [ ] Both screens are usable at a desktop width of about 1280px, with no horizontal scroll at 1024px or wider.
- [ ] Primary actions (Travel when unlocked, Force switch, Approve, Deny, student pick at the boundary, close, view switch) are visible and clickable on that desktop layout.
- [ ] There is no phone-only layout, and no copy that tells someone to test this on a phone.
- [ ] Reset demo restores the seeded map, credit state (below target), interests, and the absence of pending, scheduled, and timeline entries.

## Suggested variation directions (build these three)

All three variations must meet US-1 to US-8, including the required destination-skin Travel button (US-5) and the required student pick step at the boundary (US-6). They share the same seeded student, map, loops, deny copy fixture (OQ-9), credit-after-switch fixture (OQ-10), and timeline rules (US-7). What changes is the extra comparison surface, so Jah can see a real choice. Extras listed under a variation are experiments for that file only, not product requirements for every build, and not a substitute for the required ACs.

### v1: Gate-first

The map is the main Student surface. The credit state is a short, plain explanation of locked vs ready vs not adjacent. The teacher Force control is short. The required Travel skin and the required boundary pick are present but not visually dominant. This tests whether the two lock reasons, and the force action, are obvious in the fewest steps.

### v2: Decision-point preview

**v2-only extra, not required of v1 or v3, and not a product requirement:** in addition to the required destination-skin Travel button, show a current-vs-destination look strip at the Travel decision point, labeled as a look preview only and not applied. This tests whether a stronger destination preview makes the request clearer, without looking like the move has already happened or like a change to what is worn. Do not fail v1 or v3 for omitting this strip.

### v3: Upcoming pick

**v3-only extra, not required of v1 or v2, and not a product requirement:** in addition to the required pick step at the boundary, the Student view after a force and before the boundary shows an upcoming-pick card: a change is coming, the student will choose then, and no destination is named or highlighted as chosen. At the boundary, the pick step is the main student surface (current interest still labeled current; destinations clearly choices, not already applied). This tests that a forced switch is not an immediate move and that the student, not the teacher, chooses the destination. Do not fail v1 or v2 for omitting the upcoming-pick card.

## Open questions

Anything marked **[PROPOSED]** is a suggested default for later discussion, not a rule for this round's stories or acceptance criteria. Items that record an earlier Jah decision are labeled as such.

1. **Is a credit target required before any switch request, or only before map Travel?** Carried from WVR-231 OQ-1. WVR-231 lists a credit target as the gate for traversal on the Galaxy map. A W4 workflow write-up describes Travel on an unlocked node as the request that replaces immediate traversal; that is documentation, not a new Jah decision. The v4 bag had an ungated request button; that path is not rebuilt here. **[PROPOSED] for this prototype:** Travel on the map is the student request entry, and it is credit-gated. Confirm whether any other request path should stay ungated before the app build.

2. **What is the credit target, and how are credits earned?** WVR-231's issue text uses "e.g., 10 credits" as an example, not a decision. C51 (personal bar vs bell-curve engine) has been open since 2026-11-17. The W4 write-up already lists per-node targets (Space 10, Ballet 12, Plants 14, Digging up the past 14, Ocean animals 12); those amounts are documentation, not a Jah decision, and must not be presented as the product number for every interest. This prototype must not invent an earning loop. **[PROPOSED] fixture:** seed below one fixture target (10 is fine if it stays visibly a fixture), and use prototype controls to jump below or to at-or-above that target. Do not treat 10, or any other amount, as decided, and do not vary the target by interest in this pass.

3. **How should the credit gate be shown?** Phase 3/4 US-36 used a `have/need` display. The W4 write-up describes a ring meter and copy in the spirit of credits earned, ready to travel, or keep going. None of that is a Jah decision. US-2 only requires that the credit reason be distinct from the non-adjacent reason. **[PROPOSED] for v1:** a short below-target / ready line. Other treatments may appear only as variation extras.

4. **Does Force, Approve, or Deny need a written reason?** WVR-231 is one-tap Approve/Deny. On 2026-11-17 at 5:06 PM MT (America/Denver), Jah's words as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md` include "Decline reason optional" and "Timeline logs approved and forced switches." The same cut's D1 text adds that the teacher can force a switch "with a logged reason." That "logged reason" phrase is cut language, not in Jah's verbatim lines. **[PROPOSED] for this prototype only:** no required reason field on Force, Approve, or Deny; a timeline entry is enough. Confirm before the app build.

5. **After a force, what may the student pick at the boundary?** Jah, 2026-11-17 5:06 PM MT: "Forced switch: student picks at boundary." That decides who picks and when, not the choice set. **[PROPOSED] fixture:** the pick step includes at least one destination that is not the current interest. Whether the set is adjacent only, any interest, or also includes stay, stays open. A pick list that omits Stay does not close this question and must not be presented as the product rule.

6. **When does an approved or forced switch take effect: "next session" or "next block boundary"?** Carried from WVR-231 OQ-13. WVR-231's issue body uses `scheduled_for = 'next_session'` and "finishes today's packet." That is issue text, not a new Jah decision. On 2026-11-17 at 4:45 PM MT (America/Denver), Jah's words as recorded in the same cut: "Approve D2–D9, the 4-persona cast, and switch defaults 2–8 as proposed." Switch default 3 / D3 is: the switch waits for the **next block boundary** by default; the teacher can tap "switch now" to apply it immediately. This prototype must show that an approved or forced change does not apply immediately (US-3, US-6). It may use a prototype control as a stand-in for that delay. Do not treat "next session" as a fresh Jah call that closed the boundary-vs-session question, and do not build a "switch now" control in this round. If copy mentions unfinished current work, "today's work" is fixture tone, not product copy. **[PROPOSED] for the prototype only:** the stand-in boundary control. The product default (session vs block boundary, and whether "switch now" exists) stays open for the app build.

7. **If a student request is already pending, can the teacher force? If a force is scheduled, can the student still Travel?** Not decided. **[PROPOSED] for this prototype:** demonstrate the two loops from a clean seed (Reset between them). Do not build overlap-handling as a product rule.

8. **What names and interest labels should appear?** Stories and acceptance criteria use **Student A**, **Teacher**, and **Class** until Jah picks. **[PROPOSED] fixtures only — do not bake these into the UI while this question is open:** student first name "Tobin" (an invented stand-in used on earlier loops, not on the known guard list); teacher "Ms. Rivera" and class "Room 12" appeared in an earlier WVR-231 draft and have not been picked. Interest labels: "Space" (current), "Ocean" (adjacent), "Plants" (visible, disabled, non-adjacent). W4's ring uses "Space" and "Ocean animals," which are neighbors; "Ocean" is a shortening and is not decided. If a name is in doubt, keep Student A rather than guess.

9. **After a deny, does Travel return immediately, or only later, and what copy is shown?** Carried from WVR-231 OQ-8. Jah, 2026-11-17 5:06 PM MT: "Decline doesn't use the cap; can ask again." They can ask again; a deny is not final. The leftover question is timing. **[PROPOSED] for this prototype:** the Travel control can return after a deny, still limited to an adjacent destination and still credit-gated. Returning it immediately is a proposed fixture, not a timing decision. **[PROPOSED] deny copy:** start from locked v4, "Your teacher said not now. You are still on [current]. You can ask again." Do not invent a third line. The W4 line "Your teacher says stay for now." is documentation only.

10. **Do credits reset or carry over when a switch applies?** The W4 write-up says credits reset for the new unit. Cut D6, approved as part of D2–D9 on 2026-11-17, says the personal bar carries over and does not reset on a switch. Leave this unresolved as a product rule. **[PROPOSED] fixture for every variation in this pass:** after the boundary applies a switch, leave the credit state unchanged (carry over). Put a small on-screen fixture label on the Student view, in the spirit of "Fixture: credits carried over, not a product rule." Do not clear the meter in one variation and carry it in another. Do not present carry-over as the product rule.

11. **Does a denied request appear on the timeline at all?** US-7 already forbids logging a deny as an approved or forced switch. Whether a distinct deny line should exist is not decided. **[PROPOSED] fixture for this pass:** do not log a deny on the timeline. That is not the product rule.

## Decided, in scope for this build

**Teacher-forced switch.** On 2026-11-17 at 4:44 PM MT (America/Denver), Jah said, recorded as verbatim in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`: "Switch: student asks, teacher approves; teacher can also force." At 5:06 PM MT, also recorded there as verbatim: "Forced switch: student picks at boundary." And: "Timeline logs approved and forced switches." That capability is decided and is **in scope for this prototype**. Do not treat it as unanswered. The force-time timeline entry must not name a destination.

## Decided, still out of scope for this build

**"Switch now."** Switch default 3 / D3, approved as proposed on 2026-11-17 at 4:45 PM MT, includes an optional teacher "switch now" control. WVR-231 kept it out of the v4 pass, and it is not one of the two leftovers in this issue. Do not build it here. The product question stays in OQ-6.
