# Leftover risk: WVR-252 round 1

Written by Proto Bot, 2026-11-27 (America/Denver), at the round 1 build.

## Process gaps

- **No second red-team pass.** Petey reviewed Revision 1 (verdict: not ready). WVR.dev's Revision 2 addressed the force-time timeline blocker, but nobody re-reviewed Revision 2 before this build.
- Leftover risks were listed in STATUS.md at handoff. This file restates them and adds build notes.

## Eye checks still needed

1. **Force-time timeline destination.** The force-time entry is "Student A · forced switch started. Student A will pick the new interest later." It does not name Ocean or any other destination. The chosen interest is logged only after the pick. Sequoia and Jah should still judge the teacher and student views after confirm, before the boundary, by eye (T-35, T-36).
2. **v2 look strip and v3 upcoming-pick card.** The v2 strip sits under the Travel button, labeled "Look preview only · not applied. You are still on Space." Current interest, Today's work, and the map current node stay Space. The strip is not shown during a force (no destination has been chosen). The v3 upcoming-pick card names no destination. At the boundary, picks are choice buttons and current is still labeled current. These still need an eye check for "already moved" or "the teacher picked" (T-42, T-43).
3. **The map still labels Ocean as Adjacent during a force.** That is geography (Ocean remains the adjacent node to Space), not a chosen destination. The credit-gate and status copy do not treat Ocean as picked. Flag if that map label reads as a teacher pick.

## Fixture choices (proposed, not decided)

- Student A, Teacher, Class (OQ-8).
- Current Space, adjacent Ocean (a shortening of W4's "Ocean animals"), visible non-adjacent Plants (OQ-8). The ring also shows Ballet and Digging up the past as context, with no Travel action on them.
- Fixture credit target 10, seeded at 4, labeled "Fixture amount, not a product rule. Not the target for every interest" (OQ-2).
- After a switch applies, credits carry over, with "Fixture: credits carried over, not a product rule" (OQ-10). All three variations take this side.
- Deny copy starts from locked v4: "Your teacher said not now. You are still on [current]. You can ask again." (OQ-9).
- Travel returns immediately after a deny, still adjacent-only and still credit-gated (OQ-9 timing).
- Stay is not offered at the pick step; the fixture line says so and that this is not a product rule (OQ-5). The pick set is every other ring interest.
- A deny is not logged on the timeline (OQ-11).
- "Today's work: [current] (fixture tone)" (OQ-6). Delay copy is stand-in wording; it never says "next session."
- No Trophy Bag or avatar is shown (T-41 n/a). Travel on the map is the student request entry.

## Still open for the app (easy to over-read)

No reason field on Force / Approve / Deny (OQ-4). Session vs block boundary, and no "switch now" (OQ-6). Force vs pending overlap untested by design (OQ-7). Names and interest labels (OQ-8). Re-request timing after deny (OQ-9).
