# Test checklist: WVR-231

Written by WVR.dev on 2026-11-27 (America/Denver) from `stories.md` Revision 2. Sequoia runs it against every variation and records the outcomes in `results.md`.

Desktop only. Do not run phone, iPhone, or VoiceOver checks, and do not fail a variation for missing a phone layout.

## Setup

- **Builds under test:** v1 (loop-first), v2 (destination preview), v3 (mnemonic-first bag). Open each variation's `index.html` as a static desktop page.
- **Viewport:** grade at about **1280px** wide. Also confirm no horizontal scroll at **1024px** or wider. Ignore phone widths.
- **Before each variation, and before any retry after a fail:**
  1. Open Proto controls and tap **Reset demo**.
  2. Confirm the seeded bag, avatar, interests, and request state are back.
- **Out of scope; don't fail for these:**
  - Phone, iPhone, or VoiceOver behavior.
  - Credit-gated Galaxy-map traversal, a credit meter, earning a new item, a "switch now" control, or a teacher force-switch control. Those must stay out; fail only if they were built (see T-42).
  - Exact proposed fixture strings (interest labels, "Today's work" wording, mnemonic sentences, a request control returning immediately after deny). Those are tagged **(proposed, OQ-n)** and are not required product rules.
  - There is no real backend. "Prototype: saved on this device only" is expected.
- **Tags:** items marked **(proposed, OQ-n)** check a proposed fixture, not a decided product rule. A fail there is a build issue against the proposed fixture, not a product decision. Note in `results.md` if the fixture itself felt wrong. Do not treat a proposed default as required product behavior.
- **Marking:** use `pass`, `fail`, or `n/a` in each variation column. Use `n/a` only where the item says "v2 only" or "v3 only." Give each fail a one-line reason in `results.md`. For T-39, record which re-request behavior you saw, even on a pass.

## Checks

### A. Identity, desktop layout, banner, and reset

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-01 | US-9 | After Reset demo, the only student name on either view is **Student A**, with a visible "Prototype pseudonym" tag. No last name, photo, email, or ID. **Tobin**, **Ms. Rivera**, and **Room 12** do not appear. If a teacher or class label is shown, it is **Teacher** and **Class**. | | | | |
| T-02 | US-9 | No name from the Ground rule 5 guard list appears anywhere (Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, Nico, Andre, Lila). | | | | |
| T-03 | US-9 | At about 1280px, both the Student view and the Teacher view are usable. At 1024px and wider there is no horizontal scroll. Primary actions (request, Approve, Deny, close, view switch, Reset demo, delayed-transition control) are visible and clickable. | | | | |
| T-04 | US-9 | There is no phone-only layout, no mobile breakpoint required to use the loop, and no copy that tells someone to test this on a phone. | | | | |
| T-05 | US-9, GR-10 | Under the header, a muted proposed-defaults banner is present, collapsible to one line, and not removable. It reads: "Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app." | | | | |
| T-06 | US-9, GR-3 | The page has a clearly labeled Student view and Teacher view, with a way to move between them without losing state. | | | | |
| T-07 | GR-9 | Proto controls sit at the top, look like prototype controls (not teacher or student product UI), and include **Reset demo** plus a control that triggers the delayed transition for US-7. | | | | |
| T-08 | US-9 | Dirty the state (submit a request, or approve or deny one). Tap **Reset demo**. The seeded bag, avatar, interests, and request state are restored, and there is no leftover pending or scheduled request. | | | | |

### B. Trophy Bag and avatar

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-09 | US-1 | The Student view shows a Trophy Bag grid of unlocked collectibles. | | | | |
| T-10 | US-1 | Each unlocked item has a visible catalog name and a short mnemonic learning line, readable in the grid or on a simple inspect, without leaving the Student view. An empty or missing mnemonic on an unlocked item is a fail. | | | | |
| T-11 | US-1 | Names in the grid match the WVR-227 catalog for the unlocked items: Number Helmet, Word Gloves, Planet Badge, Social Cape, Art Brush, Streak Boots, Comeback Visor, Traveler Star. No made-up catalog names. | | | | |
| T-12 | US-2 | The Student view includes an avatar equipment preview on the same screen as the bag. Currently equipped items are visible on the avatar (a simple composed figure is enough), and an equipped item is recognizable in both the preview and the grid. | | | | |
| T-13 | US-2, OQ-4 | Walking the required loop (open the bag, request, approve or deny) does not change what is equipped. There are no required equip or unequip controls. | | | | |
| T-14 | US-1, OQ-6 | The four seeded unlocked items, if the proposed set was used, show W4-starting fixture lines: Number Helmet — "Mastered 10s addition"; Comeback Visor — "Kept going after 3 misses"; Planet Badge — "Matched the planets to their names"; Streak Boots — "Answered 3 in a row on the first try." Do not fail a variation for using the issue's Comeback example instead; note which line you saw. Fail if Revision 1 invented lines appear ("Named the inner planets in order", "Finished three days in a row") and you are grading the proposed fixture. | (proposed, OQ-6) | | | |

### C. Request and pending state

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-15 | US-3 | The Student view has a clear control to request a move to an adjacent interest. The student can see the current interest and the destination before submitting. | | | | |
| T-16 | US-3 | At least one non-adjacent interest is visible and disabled. It cannot be submitted. Only an adjacent destination can be submitted. This is fixture UI, not a map. | | | | |
| T-17 | US-3 | Submit one request. It creates a single `pending` request. The Teacher view can then see that pending request (US-5). No credit meter or credit check is required. | | | | |
| T-18 | US-3, OQ-2 | Interest labels are fixtures. If the proposed pair was used, current is "Space" and adjacent is "Ocean" (a shortening of W4's "Ocean animals"). Do not fail for equivalent fixture labels; note what was used. Do not treat a shortened label as a decided product name in the results write-up. | (proposed, OQ-2) | | | |
| T-19 | US-4 | After submit, the Student view shows that the request is waiting for the teacher. The current interest does not change. | | | | |
| T-20 | US-4, OQ-9 | A short line about today's work still names the **current** interest, not the requested one. Exact "Today's work" wording is fixture copy, not required. Fail if today's work appears to be on the requested interest. | | | | |
| T-21 | US-4 | While the request is `pending`, the student cannot submit a second request. | | | | |
| T-22 | US-4 | With a pending request, reload the page. The pending state and the current interest are unchanged. | | | | |

### D. Teacher badge and Approve/Deny modal

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-23 | US-5 | The Teacher view is a simplified desktop Galaxy Homepage (class view with Student A visible). It is not the 3D flip room or the calendar. | | | | |
| T-24 | US-5 | When a request is `pending`, an alert badge is visible on this homepage and is associated with Student A, not a generic unexplained mark. | | | | |
| T-25 | US-5 | After Reset demo, with no request pending, that badge is not shown as an active pending-request alert. | | | | |
| T-26 | US-5, US-6 | The badge (or a direct control on it) opens the approval modal. | | | | |
| T-27 | US-6 | The modal shows the student's first name (Student A), the current interest, and the requested adjacent interest. | | | | |
| T-28 | US-6, OQ-3 | The modal has two primary actions, Approve and Deny. Each completes in one activation. There is no required reason field in this prototype. This is prototype-only, not the product rule. | (prototype only, OQ-3) | | | |
| T-29 | US-6 | After Approve or Deny, the modal closes and the teacher is back on the Galaxy Homepage. | | | | |
| T-30 | US-6 | Approve and Deny are visually distinct, and neither looks like a default the teacher might hit by accident. | | | | |
| T-31 | US-6, OQ-7 | With a pending request, open the modal and close it without choosing (clear close or Escape). The request stays `pending`. The badge is still there. | | | | |

### E. Approved change stays off today's work

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-32 | US-7 | Approve a pending request. It moves out of `pending` and is marked scheduled. The approved change does not apply immediately. | | | | |
| T-33 | US-7 | Immediately after approval, on the Student view, today's work and the current interest are unchanged. A clear message says the approved change does not apply yet. Fail if the student already appears to have moved. Do not fail for "next session" vs "next block" wording; either delay phrase is stand-in copy (OQ-13). | | | | |
| T-34 | US-7 | On the Teacher view, the pending-request badge is gone. A scheduled-change hint is allowed. It must not look like the switch has already happened. | | | | |
| T-35 | US-7 | Before triggering the delayed transition, reload. The student is still on the current interest, and the change is still scheduled. | | | | |
| T-36 | US-7 | Trigger the delayed-transition prototype control. The student's current interest and skin become the approved destination, and the scheduled state clears. | | | | |

### F. Deny, and today's interest stays put

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-37 | US-8 | Deny a pending request. The `pending` state clears. It is not scheduled. | | | | |
| T-38 | US-8 | After a deny, the student's current interest does not change. Trigger the delayed-transition control: it still does not change. The pending-request badge is gone, and the Student view no longer says the request is waiting. | | | | |
| T-39 | US-8, OQ-8 | After a deny, record whether the student can request again immediately, later, or not at all. **Fail** if a deny is treated as permanently final, or if the student is locked out of ever requesting again. **Pass** if they can ask again now or later; immediately returning the control is a proposed fixture, not a required timing rule. If the control returns, it is still limited to an adjacent destination. | (proposed timing, OQ-8) | | | |

### G. Variation extras (not required of every build)

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-40 | v2 extra | **v2 only.** If v2 shows a destination-look preview or a pre-submit "does not apply immediately" message, that preview must not look like the student has already moved, and must not look like equipping a new skin or changing what is worn. Delay copy is stand-in wording, not a decided product phrase. Mark **n/a** for v1 and v3. Do not fail v1 or v3 for omitting these extras. | v2 only | | | |
| T-41 | v3 extra, OQ-4 | **v3 only.** If selecting an item highlights its memory and shows it on the avatar, that is a temporary preview only. The equipped set does not change. Leaving the selection, or selecting a different item, leaves the equipped preview as it was. It must not look like equip or unequip. Mark **n/a** for v1 and v2. Do not fail v1 or v2 for omitting this extra. | v3 only | | | |

### H. Out of scope (fail only if built)

| ID | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| T-42 | Scope | There is no credit-gated Galaxy-map traversal, no teacher force-switch control, and no "switch now" control that applies an approved or forced change immediately. Desktop only; no phone layout was added as a requirement. | | | | |
