# Red team — WVR-235

Petey Pablo, 2026-11-26 (America/Denver). Reviewed `stories.md` on `proto/WVR-235` at `b0ccbe6` (file SHA `9400ba269a6aed76a11864809f55c254076fee1a`).

**Verdict: not ready for Proto.** WVR.dev should revise the stories from the blockers below, keep every proposed default labeled as proposed, and only then send work to Proto.

OQ-1 through OQ-8 are treated as proposed defaults, not Jah's calls, as WVR.dev said. This pass flags where the stories still slip and treat a default as decided.

## Defaults passed off as decided

1. **OQ-3 (all 5 required) is baked into the happy path and the checklist seeds.** US-6 has a footnote, but US-4's trigger is "All 5 are set and she taps Save," US-6's error copy is written as final, and checklist seed 6 has no "proposed" tag. Proto will build this as the product rule.
2. **OQ-6 (latest value only) is treated as already covering a decided requirement.** US-5 says WVR-37's "can be revised over time" is covered by overwrite-in-place. That is a proposed default, not a decision that history is out of scope.
3. **OQ-1 (store raw 1–5) is clear in the OQ table, but ground rule 3 is not.** The storage shape is `{ scores: {<dimension>: number|null} }` with no rule that `number` is the raw 1–5, never the plotted 0–100 (`value × 20`). Easy to implement wrong, and a reload would then look like a different scale.
4. **v1 and v2 have no "proposed" banner.** Only the optional v3 0–100 path is required to say "Scale test: 0–100." On v1 and v2, the 1–5 scale and the Rarely–Almost always labels will read as the product.

## Round 1

### Blockers

1. **All 5 required fights the 30-second, between-lessons job.**
   - Severity: blocker (OQ-3)
   - The persona is a teacher who wants to record what she just saw and get back to class. If she only noticed Focus today, US-6 blocks the save. That is not a small validation detail. Either allow a partial save and define how the radar shows gaps (US-3 already has a "Not set" hollow marker), or drop the 30-second claim and say this screen is a complete snapshot. Do not let Proto ship "Set all 5 before saving" as if the open question were closed.

2. **Say in ground rule 3: store raw 1–5, never the plotted value.**
   - Severity: blocker (OQ-1)
   - Persistence must be `{ scores: {<dimension>: 1|2|3|4|5|null}, ... }`. The radar multiplies by 20 only when drawing. If this stays implicit, variations will disagree after reload, and Sequoia cannot grade them.

3. **Do not mix a 0–100 scale into v3 in this round.**
   - Severity: blocker
   - The point of the three variations is the input pattern (segments vs drag vs one-at-a-time), not the scale. A v3 on 0–100 is missing validation copy, labels, what 0 means vs "Not set," and the storage contract. Keep every variation on the same proposed 1–5. If Jah wants a scale test, that is a separate variation with its own complete rules, or a later round.

4. **Prototype controls will cover the sticky Save bar on a phone.**
   - Severity: blocker
   - US-9 pins Save and Cancel to the bottom, including `safe-area-inset-bottom`. Ground rule 7 puts a "Prototype controls" drawer at the bottom too. Sequoia has already failed a proto bar for being unreachable at 390px. Specify that the drawer sits above the sticky bar, that the bar stays fully tappable at 360–430px, and the z-index order. Do not leave this to Proto.

5. **`beforeunload` will not protect Jah on his phone.**
   - Severity: blocker
   - US-5 makes the browser's native unsaved prompt the only guard. iOS Safari often swallows `beforeunload`. This prototype is phone-first. Add a visible unsaved state, and a native `confirm` on Cancel, Escape, and in-page leave. Treat `beforeunload` as a desktop extra, not the acceptance criterion.

6. **Do not use the first name Maya.**
   - Severity: blocker
   - Ground rule 5 is fail-closed: first name only. In weaver-v0, `Maya` was on the `OLD_NAMES` guard as a former real first name. Do not reuse it here. Pick a clearly invented first name that is not on that list (the list included Maya, Jordan, Avery, Riley, Casey, Quinn, Morgan, Jamie, Taylor, Drew, Skyler, Parker, Cameron, Rowan, and Nico). Update the `localStorage` key to match. This needs Jah's pick, or a stand-in that is obviously a pseudonym and not on that list.

7. **v2 radar hit targets are underspecified for a 260px pentagon.**
   - Severity: blocker
   - US-9 requires 44×44px targets with 8px gaps. Five vertices on a ~260px radar will overlap or fall short, especially toward the center. Require a 44px hit area around each vertex, and say the stepper row is the reliable control on a phone. Drag is extra, not the only way.

8. **v3's wizard flow is incomplete.**
   - Severity: blocker
   - "One dimension at a time" needs Back, Next, whether she can jump from a radar label, where Save lives (disabled until all 5, or only on the last card), and what happens if she leaves mid-wizard (Cancel). Without that, each build will invent a different flow and Sequoia cannot grade one checklist.

9. ** "Fail load" has to hide local data, or the state is not testable.**
   - Severity: blocker
   - The prototype's source of truth is `localStorage`. If "Fail load" still reveals the saved polygon, the fail-closed path in US-7 cannot be demonstrated. Spell out that "Fail load" pretends the profile did not load: hide local values, show the error and Retry, and keep editing off until a successful load.

10. **A 1–5 segmented row cannot share a line with the dimension name at 360px.**
    - Severity: blocker
    - Five 44px segments plus four 8px gaps is already 252px. Put the name and hint on their own line, and the segments full width underneath. If Proto puts them on one row, US-9 fails.

### Nits

11. **US-3 disagrees with itself on timing.** "Within one frame" and "tween in 150 ms" cannot both be required. Keep the reduced-motion rule, and pick one motion budget for the rest.

12. **The lowest-caption tie rule belongs in US-4, not only in checklist seed 19.** "First tied dimension in the fixed order" is the right rule; it is still proposed. Say so in the story.

13. **Add a prototype control for "updated a few days ago."** US-5 is a later revisit, but every load after save will read "just now." Relative time needs a way to show "2 days ago" or the story should only require "just now" after a save in this session.

14. **Screen readers need "Not set," not 0 or 1.** US-10 should require `aria-valuetext` of "Not set" for an untouched dimension, and "<n>, <label>" (for example "4, Usually") once set.

15. **Pick one minimum width.** US-9 and the seeds use 360px. The checklist stub says 320px. Use 360 as the floor unless you explicitly want 320.

16. **Keep the provenance line visible in edit mode too.** US-8 requires it in view mode only. Hiding it while she scores undercuts "teacher observation, not a diagnosis."

17. **Define "Start empty" vs "Reset demo."** Both clear data. Say whether they are the same, and that each clears only that variation's key.

18. **Put a small proposed-default banner on every variation,** not just a 0–100 v3: "Proposed defaults: 1–5 scale, all 5 required, latest value only, no class average." Jah should be able to see what is still open.

19. **Call out that a score of 1 plots at 20, not at the center.** Center is reserved for "Not set." That is fine if it is intentional, but Jah should see it, because "Rarely" will still look like a small polygon rather than an empty axis.

## Round 2

_Leave blank unless a second round happens._

## Stories ready for Proto?

- [ ] Stories revised from the findings above
- [ ] Out of scope is explicit
- [ ] Phone-viewport acceptance is written down
- [ ] Every proposed default still reads as proposed, including in acceptance and checklist seeds
