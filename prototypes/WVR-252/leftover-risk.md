# Leftover risk: WVR-252 round 2 (final)

Written by Proto Bot, 2026-11-28 (America/Denver), at the round 2 build of `v4` (list-first), `v5` (skin chips) and `v6` (one picker). Built from `stories.md` Revision 4 and `checklist-r2.md`. R1 `v1`–`v3` are the rejected map builds. They are kept byte-identical and are not graded.

## Fixture list (each stand-in and the open question it covers)

Every item is a stand-in, not a product rule. All three variations take the same side on each.

| Stand-in on screen | Covers | Notes |
|---|---|---|
| Student A + "Prototype pseudonym"; Teacher; Class | OQ-7 | No other personal name appears. |
| Top five: Space (current), Ocean, Plants, Ballet, Digging up the past | OQ-7 | "Ocean" shortens "Ocean animals". The list is labeled "Fixture set. How the top five are chosen is not decided." No ranking or teacher-set order is implied. |
| Credit target 10, seeded at 4, labeled "Fixture amount, not a product rule (OQ-1)" | OQ-1, OQ-2 | Meter plus a "4 of 10" line plus a credit reason. Treatment is copy plus a thin bar. No earning loop is built. |
| After any switch applies, credits stay at 10, labeled "Fixture: credits carried over after the switch. Not a product rule (OQ-9)" | OQ-9 | Same side in all three. |
| Student request set = the other four in the top five | Jah Nov 28 (decided) | No adjacency, no map, no "Travel". |
| Force-boundary pick set = the same other four, Stay not offered. The pick step says: "Fixture: this choice set follows the request set... Stay is not offered in this prototype. Not a product rule (OQ-4)." | OQ-4 | Jah's Nov 28 words cover the request set, not the force list. |
| Deny copy: "Your teacher said not now. You are still on [current]. You can ask again." | OQ-8 | Locked v4 line, no third line. |
| Request control returns immediately after a deny, still credit-gated | OQ-8 | Timing is a fixture. |
| A deny is not logged on the timeline | OQ-10 | |
| No reason field on Force, Approve or Deny (modal notes say "this prototype only (OQ-3)") | OQ-3 | One tap each, plus a short confirm on Force. |
| Delayed boundary is a Proto control ("Trigger delayed boundary (stand-in)"). Student copy says "does not apply yet" or "stand-in wording". It never says "next session" or "switch now". | OQ-5 | "Today's work: [current] (fixture tone)" is fixture tone. |
| Demo shown from a clean seed, Reset between the request loop and the force loop | OQ-6 | No overlap handling. |
| No Trophy Bag or avatar | T-47 | n/a. |
| Teacher view is a simple class list with Student A, not the 3D room, calendar or a map | US-5 | |

## Remaining risks

1. **A literal text search for "Ocean", "Plants", "Ballet" or "Digging up the past" hits the Student view at force time (T-45).** The plain top-five list is always on screen, because US-1 wants five interests visible. At force time the list shows labels only, with no "Requested", "Approved", or "Chosen" tag, no pressable control and no skinned control. The teacher view, the timeline entry, the "A change is coming" note and the "Today's work" chip name no destination. v6 shows the same five as a plain strip. Sequoia should grade T-45 as "no destination named as chosen or scheduled", not as "no label on screen". If a stricter reading is wanted, the list could be hidden during a force; that was not done because it removes the top five in the one state where the student is about to pick from it.
2. **State-dependent labels (T-51).** Handled and scripted, but still an eye check:
   - Locked controls read "Locked · credits" (v4), "[Interest] · locked (credits)" on a dimmed chip (v5), or a disabled "Ask to switch" with the credit reason beside it (v6). None reads "switch to X".
   - Pending, scheduled and force-coming controls are flat status pills or flat chips. In v5 the chips lose their skin in those states.
   - After a deny, nothing is tagged "Requested", "Approved" or "Chosen".
   - The row selection (v4, v6 picker) is not pre-selected, is cleared on view switch, cancel, deny, delay and reset, and is not saved on reload. At the boundary the same picker opens with nothing selected.
3. **v5 below target keeps each chip's skin visible but dimmed and disabled.** That is a destination preview behind a lock. If it reads as "pressable" at a glance, it is a polish issue (T-29, T-48), not a logic one.
4. **"Today's work: [current]" stays Space until the change applies.** This is deliberate (T-22, T-32), so a student who just asked can read "still on Space" in two places.
5. **Fold margin is thin.** The decision surface is above the fold at 1280×800 in all eight states, and every Student-view control has its bottom edge at 800px or less (scripted). In v6 at the boundary pick the picker panel's bottom border sits right at the fold. Any added copy will push controls down.
6. **The force pick set follows the request set (OQ-4).** Not a Nov 28 decision. Do not carry the four-option list or the missing Stay into the app.
7. **No adjacency and no map anywhere in the Student view.** The page source is also scanned for "adjacent", "Galaxy map", "Travel", "not next to", "next session" and "switch now".
8. **Shared `check.cjs`.** `proto-loop/scaffold` (666a5cf) has no `check.cjs`, only the `_template`, `memory` and `scripts/status.sh`, so there was no shared copy to merge. The per-issue copy stays. The generic part (server, layout, scroll jump) is marked `[LIB]` at the top of `check.cjs`, and the WVR-252 walk is marked `[WVR-252]`, so the library can be lifted into a shared file later. The R1 script is kept as `check-r1.cjs` so `v1`–`v3` still pass unchanged. `check.cjs` runs it and also confirms `v1`–`v3` are byte-identical to the R1 commit. Pushing a new file to `proto-loop/scaffold` was not done: the push hook only allows `proto/*`.

## Still open for the app (easy to over-read)

The credit amount and how credits are earned (OQ-1), how the credit gate is shown (OQ-2), reasons on Force / Approve / Deny (OQ-3), the force pick set and Stay (OQ-4), when a change applies (OQ-5), overlap of a pending request and a force (OQ-6), names, interest labels and how the top five is chosen (OQ-7), deny copy and timing (OQ-8), credits after a switch (OQ-9), whether a deny is logged (OQ-10).
