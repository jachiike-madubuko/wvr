# User stories: WVR-231

Written by WVR.dev. **Revision 2, 2026-11-27 (America/Denver).** Status: revised after Petey's red team. Ready for Proto. Sequoia's checklist is in `checklist.md`.

> **Proposed defaults are not product rules.** Anything marked **[PROPOSED]** is a suggested default, not a decision. Do not bake those defaults into the stories or acceptance criteria as decided product rules. A few items below record earlier Jah decisions from 2026-11-17; those are labeled as such and do not expand this prototype's scope.

## Issue

- Linear: [WVR-231, Rebuild Phase 6 — Workflow 4: Mnemonic Trophy Bag, Avatar Rig & Interest-Switch Approval Loop](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest)
- Status: Backlog. Priority: High. Project: Weavr Clean Rebuild. Team: Weaver. No cycle. No comments and no linked issues as of 2026-11-27.
- One-paragraph summary: This issue is Core Workflow 4 in the clean rebuild: the student Trophy Bag shows unlocked collectibles with short mnemonic learning copy and an avatar equipment preview, and the student can request a move to an adjacent galaxy interest. That request is stored as `pending` on `student_group_switch_requests`. A badge on the teacher's Galaxy Homepage opens a one-tap Approve/Deny modal. The issue body schedules an approved request for the next session so the student finishes today's packet before the new interest skin applies. Whether "next session" or "next block boundary" is the product default is still an open question (OQ-13); this prototype must show that an approved change does not apply immediately, without treating the issue's "next session" wording as a new Jah decision. A second deliverable, credit-gated traversal on the Galaxy map, is part of the issue but is not the core of this prototype (see Scope).

Related context, not work for this loop:

- [WVR-226](https://linear.app/weaver-edu/issue/WVR-226/rebuild-phase-1-core-database-schema-and-multi-tenant-rls-security) (Done) already defines `student_group_switch_requests` with `status` and `scheduled_for`, plus `student_wearable_inventory`.
- [WVR-227](https://linear.app/weaver-edu/issue/WVR-227/rebuild-phase-2-security-gates-pace-math-and-collectibles-engine) (Done) already names the 8-item catalog this bag should display: Number Helmet, Word Gloves, Planet Badge, Social Cape, Art Brush, Streak Boots, Comeback Visor, Traveler Star.
- [WVR-228](https://linear.app/weaver-edu/issue/WVR-228/rebuild-phase-3-screen-1-and-screen-2-3d-flip-room-shell-galaxy) (Done) is the Galaxy Homepage the teacher badge lives on. This prototype uses a simplified desktop stand-in, not a rebuild of the 3D flip or calendar.
- [WVR-229](https://linear.app/weaver-edu/issue/WVR-229/rebuild-phase-4-screen-4-student-capability-path-stoken-and-sequential) (Done) is the student path. Do not rebuild the mosaic or hook gate.
- [WVR-157](https://linear.app/weaver-edu/issue/WVR-157/credit-metered-galaxy-node-traversal-and-wearable-inventory) (Canceled) was an earlier credit-metered traversal and inventory ticket. Do not revive it.
- Phase 3/4 stories (US-36, US-39a, WP-G1) describe a credit `have/need` gate and a required reason on Allow/Block. WVR-231 itself calls for one-tap Approve/Deny and treats the credit gate as Galaxy-map traversal. Those conflicts stay in Open questions. Do not mix the Phase 3/4 rules into the acceptance criteria.

## Scope

**What this prototype tests:** two desktop screens that walk the core loop end to end: (1) the student Trophy Bag, with mnemonic copy and an avatar equipment preview, plus a request to move to an adjacent interest; (2) a simplified teacher Galaxy Homepage with an alert badge that opens a one-tap Approve/Deny modal, including that an approved change does not apply immediately.

**Why this cut:** the memorable product loop in WVR-231 is "student asks to change interest, teacher decides in one tap, the change does not apply immediately," and the Trophy Bag is the student surface that loop lives on. Credit-gated Galaxy-map traversal is a third, map-heavy mechanic and is not needed to test that loop.

**Out of scope (do not build):**

- Credit-gated traversal on a Galaxy map, credit meters as a leaderboard, and the bell-curve credit engine.
- The full teacher 3D flip room, Pace Calendar, Student Insight / profile, Weaver Wheel, check-ins, and intervention drawer.
- The student lesson mosaic, hook gate, `/s/[token]` path, login, and any real packet or calendar generator.
- Earning or unlocking a new collectible during the prototype (the bag is pre-seeded).
- Teacher-forced switches (decided as a product capability, but out of this build; see Decided, out of scope), mid-unit overrides, stuck/bored escape prompts, and interest-lock nudges from older tickets.
- Phone, iPhone, or VoiceOver layouts. Desktop only.
- Any network call: no Neon, no API, no fetch, and no app source.
- Last names, photos, emails, IDs, or any name on the demo-name guard list.

## Ground rules for Proto (read first)

1. **Self-contained HTML.** One `index.html` per variation, inline CSS and JS, system fonts, no CDN, no build step, and nothing imported from the app. It must work as a static desktop page.
2. **Desktop only.** Grade at a desktop width (about 1280px, and no narrower than 1024px). Do not add a phone layout, a home-indicator offset, or a mobile breakpoint as a requirement.
3. **Two screens, one page.** A clearly labeled Student view and Teacher view, with a way to move between them without losing state, so the loop can be walked in one file. This is a prototype affordance, not a product role-switcher.
4. **No network.** Persist only on this device. A footer note may read "Prototype: saved on this device only."
5. **Student identity is first-name only, and it is a prototype pseudonym.**
   - The student label on screen is **"Student A"** until Jah picks a name (OQ-12). Put a small tag next to the name: "Prototype pseudonym".
   - If a teacher or class label is shown, use **"Teacher"** and **"Class"**. Do not use a personal teacher name or a room number while OQ-12 is open.
   - Do not use Maya, or any name that might be a former real student name. The known guard list includes Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, and Lila.
   - No last name, photo, email, or ID anywhere on screen.
   - Proposed names (Tobin, and any teacher or room labels) stay in OQ-12 only as **[PROPOSED]** fixtures. Do not bake them into the UI, ground rules, or acceptance criteria while OQ-12 is open.
6. **Visual tone.** Low fidelity, but in the app's dark palette: page `#0b1020`, panel `#111728`, text `#f6f1ea`, muted text `#8892b0`, accent `#58b6fa`, error `#ff7a7a`, borders `rgba(255,255,255,.1)`, panel radius 24px. Simple SVG or CSS shapes for items and the avatar. No 3D, no asset pipeline.
7. **Catalog names are fixed** (from WVR-227): Number Helmet, Word Gloves, Planet Badge, Social Cape, Art Brush, Streak Boots, Comeback Visor, Traveler Star. Don't rename them. Seed which ones start unlocked, and the mnemonic sentences on those items, as fixture data. Proposed fixture copy lives in Open questions, not in the acceptance criteria.
8. **Interest labels** on screen are first-class interest names, not subject names. The current interest and the adjacent destination are fixture data. Proposed names live in Open questions. Do not present a shortened label as decided.
9. **Prototype controls** sit at the top of the page (a "Proto controls" control is fine). They must include Reset demo (restore the seeded state) and a way to trigger the delayed transition so US-7 can be tested (a stand-in control is fine; see OQ-13). They must not look like teacher or student product UI.
10. **Proposed-defaults banner** on every variation, under the header, muted, collapsible to one line, not removable. Text: **"Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app."**

## Persona

**Student A** is a grade 2–4 student in this class. They can open their Trophy Bag, look at what they have unlocked, and ask to move to an adjacent interest. They should understand that a change does not happen in the middle of today's work.

The **teacher** is on a desktop Galaxy Homepage. When a switch request comes in, they should notice a badge, open a short modal, and approve or deny in one tap, then get back to the class view.

## Stories

### US-1: See the Trophy Bag and its memories

**As a** student, **I want** to open my Trophy Bag and see the collectibles I have unlocked, each with a short mnemonic line about what I learned, **so that** the bag helps me remember the work, not just count prizes.

Acceptance:

- [ ] The Student view shows a Trophy Bag grid of unlocked collectibles.
- [ ] Each unlocked item has a visible name and a short mnemonic learning line (for example, copy in the spirit of "Mastered 10s addition" or "Comeback: solved after 2 misses").
- [ ] The mnemonic line is readable in the grid or on a simple inspect of the item, without leaving the Student view.
- [ ] Names in the grid match the WVR-227 catalog names for the unlocked items. No made-up catalog names.
- [ ] An empty or missing mnemonic is not acceptable on an unlocked item. Locked or unearned items are not required by this story (see OQ-5).

### US-2: See the avatar wearing what is already equipped

**As a** student, **I want** to see a preview of my avatar wearing the items I already have equipped, **so that** the bag feels like my character and not a disconnected list.

Acceptance:

- [ ] The Student view includes an avatar equipment preview on the same screen as the bag.
- [ ] Currently equipped items are visible on the avatar (a simple composed figure is enough).
- [ ] The preview and the grid agree: an equipped item is recognizable in both places.
- [ ] This story does not require the student to change what is equipped (see OQ-4). The equipped set does not change unless a later decision adds equip controls.

### US-3: Request a move to an adjacent interest

**As a** student, **I want** to request a move to an adjacent interest, **so that** a change of group is something I ask for and my teacher decides.

Acceptance:

- [ ] The Student view has a clear control to request a move to an adjacent interest.
- [ ] The student can see the current interest and the destination before submitting.
- [ ] Only an adjacent destination can be submitted. Show at least one non-adjacent interest as visible and disabled (not submittable), so the adjacent-only rule can be demonstrated. That disabled option is fixture UI, not a map, and this is not map traversal.
- [ ] Submitting creates one request in a `pending` state. After submit, the Teacher view can see that pending request (US-5).
- [ ] This story does not require a credit meter or a credit check (see OQ-1). Seed the student so a request can be submitted.
- [ ] Interest labels on screen are fixtures (see OQ-2 and OQ-12). Do not treat a specific pair, or a shortened name, as a decided product label.

### US-4: Stay on today's work while a request is pending

**As a** student, **I want** to see that my request is waiting and that today's work is still on my current interest, **so that** I am not pulled out of today's packet.

Acceptance:

- [ ] After submit, the Student view shows that the request is waiting for the teacher. The current interest does not change.
- [ ] A short line about today's work (fixture copy is fine; see OQ-9) still names the current interest, not the requested one.
- [ ] While a request is `pending`, the student cannot submit a second request.
- [ ] Reloading the page keeps the pending state and the current interest.

### US-5: Notice a pending request from the Galaxy Homepage

**As a** teacher, **I want** an alert badge on the Galaxy Homepage when a switch request is pending, **so that** I can see it without hunting through profiles.

Acceptance:

- [ ] The Teacher view is a simplified desktop Galaxy Homepage (class view with the student visible). It is not the 3D flip room or the calendar.
- [ ] When a request is `pending`, an alert badge is visible on this homepage.
- [ ] The badge is associated with the requesting student (Student A) and is not a generic unexplained mark.
- [ ] When no request is pending, that badge is not shown as an active pending-request alert.
- [ ] The badge (or a direct control on it) is the way into the approval modal in US-6.

### US-6: Approve or deny in one tap

**As a** teacher, **I want** a short modal that lets me approve or deny the request in one tap, **so that** I can decide quickly and return to the class view.

Acceptance:

- [ ] Opening the badge presents a modal with the student's first name, the current interest, and the requested adjacent interest.
- [ ] The modal has two primary actions, Approve and Deny. Each completes in one activation. There is no required reason field in this prototype only (see OQ-3). That is not the product rule; confirm before the app build.
- [ ] After either action, the modal closes and the teacher is back on the Galaxy Homepage.
- [ ] Approve and Deny are visually distinct, and neither looks like a default the teacher might hit by accident.
- [ ] Closing the modal without choosing (a clear close or Escape) leaves the request `pending`.

### US-7: An approved switch does not apply immediately

**As a** teacher, **I want** an approved request not to take effect immediately, **so that** the student can finish today's work before the new interest skin applies.

Acceptance:

- [ ] Approving the request moves it out of `pending` and marks it as scheduled. The approved change does not apply immediately. The prototype may use a delayed-transition control as a stand-in; the exact product boundary (next session vs next block boundary) is not decided here (see OQ-13).
- [ ] On the Student view, today's work and the current interest are unchanged immediately after approval. A clear message says the approved change does not apply yet. Do not treat "next session" as decided product phrasing.
- [ ] The Teacher view no longer shows a pending-request badge for that request. It may show that a change is scheduled, but it must not look like the switch has already happened.
- [ ] When the delayed transition is triggered (prototype control is fine), the student's current interest and skin become the approved destination, and the scheduled state clears.
- [ ] Reloading before that transition keeps the student on the current interest, with the change still scheduled.

### US-8: A denied request leaves the student where they are

**As a** teacher, **I want** a denied request to leave the student on their current interest and clear the pending state, **so that** the student stays put and both of us can see the decision.

Acceptance:

- [ ] Denying the request clears the `pending` state. It is not scheduled for a later transition.
- [ ] The student's current interest does not change, then or after a delayed-transition control is triggered.
- [ ] The pending-request badge is gone. The Student view no longer says the request is waiting.
- [ ] A deny is not one-and-done or "final." Whether the student can request again immediately, or only later, is still open (see OQ-8). Do not lock the student out of ever requesting again, and do not treat a returning request control as a product decision in this round.

### US-9: First-name-only desktop prototype, no product chrome beyond the loop

**As a** teacher and a student in this prototype, **I want** only a safe student label and the two loop screens, **so that** the prototype stays safe to show and easy to judge on a desktop.

Acceptance:

- [ ] The only student name on screen is "Student A", with the "Prototype pseudonym" tag. No last name, photo, email, or ID. Do not show "Tobin", "Ms. Rivera", "Room 12", or any other personal name while OQ-12 is open.
- [ ] No name from the guard list in Ground rule 5 appears anywhere.
- [ ] Both screens are usable at a desktop width of about 1280px, with no horizontal scroll at 1024px or wider.
- [ ] Primary actions (request, Approve, Deny, close, view switch) are visible and clickable on that desktop layout.
- [ ] There is no phone-only layout, and no copy that tells someone to test this on a phone.
- [ ] Reset demo restores the seeded bag, avatar, interests, and request state.

## Suggested variation directions (build these three)

All three variations must meet US-1 to US-9. They share the same seeded student, catalog, and loop. What changes is how the bag and the request are laid out, so Jah can compare. Extras listed under a variation are experiments for that file only, not product requirements for every build.

### v1: Loop-first

The Trophy Bag grid, avatar preview, and request panel share one Student screen. The teacher badge opens a short Approve/Deny modal. This tests whether the request-to-approval loop is obvious in the fewest steps.

### v2: Destination preview

**v2-only extras, not required of v1 or v3, and not product requirements:** before submitting, the student may see a preview of the adjacent interest's look, and may be told that an approved change will not apply immediately. The teacher modal may show current vs requested side by side. This tests whether seeing the destination and the delay reduces confusion about what is being asked and when it starts. The destination preview must not look like the student has already moved, and must not look like equipping a new skin or changing what is worn. Any delay copy is stand-in wording (see OQ-13), not a decided "next session" product phrase.

### v3: Mnemonic-first bag

Item tiles are larger, and the mnemonic line is the primary text on each unlocked item (the name is secondary). The request panel is present but visually secondary. This tests whether the bag reads as a memory aid, not just a collection.

**v3-only extra, not required of v1 or v2:** selecting an item may highlight its memory and may show it on the avatar as a temporary preview only. The equipped set does not change. This must not look like equip or unequip (equip is out of scope; see OQ-4). Leaving the selection, or selecting a different item, must leave the equipped preview as it was.

## Open questions

Anything marked **[PROPOSED]** is a suggested default for later discussion, not a rule for this round's stories or acceptance criteria. Items that record an earlier Jah decision are labeled as such.

1. **Is a credit target required before the student can request a switch, or only before Galaxy-map traversal?** WVR-231 lists a credit target (example: 10 credits) as the gate for traversal on the Galaxy map, which is out of scope here. Phase 3/4 US-36 gates the request itself on a credit minimum and shows `have/need`. **[PROPOSED]:** this prototype seeds the student as able to request, with no credit meter. Decide the real gate before the app build.
2. **What counts as an "adjacent" destination, and how many can be offered?** The issue says the student requests a move to an adjacent galaxy node. **[PROPOSED] fixture:** one current interest and one adjacent destination, labeled in the prototype as "Space" (current) and "Ocean" (adjacent), plus at least one visible, disabled non-adjacent option so US-3 can be demonstrated. More nodes, and the map itself, stay out of scope. The W4 demo ring uses "Space" and "Ocean animals," which are neighbors; "Ocean" is a shortening of that label and is not decided.
3. **Does Deny or Approve need a written reason?** WVR-231 says one-tap Approve/Deny. Phase 4 WP-G1 requires a reason of at least 3 characters on Allow and Block. On 2026-11-17 at 5:06 PM MT (America/Denver), Jah's words as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md` include "Decline reason optional." **[PROPOSED] for this prototype only:** no reason field, matching the issue's one-tap wording. Confirm before the app build, because a logged reason may still be required in product. The prototype choice is not the product rule.
4. **Can the student change what is equipped from the bag?** The issue asks for an avatar equipment preview, which can be read-only. An older wearables spec allowed one equipped item per slot. **[PROPOSED]:** preview only in this round; no equip/unequip controls. If Jah wants equip, that can be a later revision. v3's select-to-preview, if built, must not change the equipped set.
5. **Are locked or unearned catalog items visible in the grid?** **[PROPOSED]:** show locked items as empty, disabled slots with the catalog name and no mnemonic, so the bag's size is visible. Not required to pass US-1.
6. **What mnemonic copy should each unlocked item use?** The WVR-231 issue gives two examples only: Number Helmet — "Mastered 10s addition"; Comeback Visor — "Comeback: solved after 2 misses." Those examples are not a full catalog, and this question does not rewrite the W4 catalog as decided copy. **[PROPOSED] fixture copy,** starting from the W4 workflow catalog at `/workspace/wv-rebuild/docs/rebuild/workflows/W4-collectibles-and-switch.md`, for a seeded unlocked set of four: Number Helmet — "Mastered 10s addition" (same as the issue example); Comeback Visor — "Kept going after 3 misses" (W4; the issue example is different); Planet Badge — "Matched the planets to their names" (W4; do not use the Revision 1 invented line "Named the inner planets in order"); Streak Boots — "Answered 3 in a row on the first try" (W4; do not use the Revision 1 invented line "Finished three days in a row"). The other four catalog items stay locked unless OQ-5 is decided otherwise. Seed Number Helmet and Planet Badge as already equipped for the US-2 preview.
7. **Can a pending or scheduled request be cancelled, by the student or the teacher?** **[PROPOSED]:** no cancel in this prototype. Closing the teacher modal leaves it pending. Reset demo is the only way back to the start.
8. **After a deny, can the student request again immediately, or only later?** On 2026-11-17 at 5:06 PM MT (America/Denver), Jah's words as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md` include: "Decline doesn't use the cap; can ask again." They can ask again; a deny is not final. The leftover question is timing: immediately vs later in the unit. **[PROPOSED] for this prototype:** the request control returns after a deny, still limited to an adjacent destination. Do not implement a one-and-done deny. Returning the control immediately is a proposed fixture, not a timing decision.
9. **How should the delayed transition be simulated in the prototype, and what does "today's packet" look like?** See also OQ-13 for the product boundary. **[PROPOSED]:** a one-line "Today's work" label on the current interest (fixture copy, not required wording), plus a Proto control that triggers the delayed transition. No real calendar generator. The control is a stand-in for the delay, not a decision that the product uses "next session."
10. **If two students have pending requests, is the badge a count and a list, or one modal at a time?** This prototype has one student. **[PROPOSED]:** keep one requester (Student A). A class inbox can wait.
11. *(Moved.)* Teacher force-switch is a decided product capability and is out of scope for this build. It is not an unanswered question. See **Decided, out of scope** below.
12. **Is "Tobin" the right prototype name, what teacher and class labels should appear, and are "Space" / "Ocean" the right interest labels?** Stories and acceptance criteria use **Student A**, **Teacher**, and **Class** until Jah picks. **[PROPOSED] fixtures only — do not bake these into the UI while this question is open:** student first name "Tobin" (an invented stand-in used on the WVR-235 loop, not on the known guard list); teacher "Ms. Rivera" and class "Room 12" appeared in Revision 1 and have not been picked. Do not use a teacher personal name if there is any chance it is a real person. Interest labels: "Space" (current) and "Ocean" (adjacent). W4's ring uses "Space" and "Ocean animals," which are neighbors; "Ocean" is a shortening and is not decided. If a name is in doubt, keep Student A rather than guess.
13. **When does an approved switch take effect: "next session" or "next block boundary"?** WVR-231's issue body uses `scheduled_for = 'next_session'` and "finishes today's packet." That is issue text, not a new Jah decision in this loop. On 2026-11-17 at 4:45 PM MT (America/Denver), Jah approved switch defaults 2–8 as proposed, recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`. Switch default 3 / D3 is: the switch waits for the **next block boundary** by default; the teacher can tap "switch now" to apply it immediately. This prototype must show that an approved change does not apply immediately (US-7). It may use a prototype control as a stand-in for that delay. Do not treat "next session" as a fresh Jah call that closed the boundary-vs-session question, and do not build a "switch now" control in this round. **[PROPOSED] for the prototype only:** the stand-in control plus the "Today's work" fixture in OQ-9. The product default (session vs block boundary, and whether "switch now" exists) stays open for the app build.

## Decided, out of scope for this build

**Teacher-forced switch.** On 2026-11-17 at 4:44 PM MT (America/Denver), Jah said, recorded as verbatim in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`: "Switch: student asks, teacher approves; teacher can also force." At 5:06 PM MT, also recorded there as verbatim: "Forced switch: student picks at boundary." Cut v3 D1, approved that day, adds that the teacher can force a switch with a logged reason. That capability is decided. It is **out of scope for this prototype**, which tests only the student request plus the Approve/Deny modal. Do not build a force-switch control. Do not treat this as unanswered, and do not describe it as something only older tickets claimed.
