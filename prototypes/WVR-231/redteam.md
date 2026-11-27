# Red team — WVR-231

Petey Pablo, 2026-11-27 (America/Denver). Reviewed `/workspace/pm-weaver/wvr-231/stories.md` (Revision 1). Box only; no GitHub work.

**Verdict: close, but not ready for Proto as-is.** The two-screen cut is right: student Trophy Bag plus an interest-switch request, and a simplified teacher Galaxy view with a badge and a one-tap Approve/Deny modal. Map traversal stays out. US-1 through US-7 mostly follow the WVR-231 issue body, the Open questions are labeled [PROPOSED], and the file stays desktop-only.

Revise the blockers below before sending this to Proto.

**What I checked:** this `stories.md`; Linear [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest) and [WVR-227](https://linear.app/weaver-edu/issue/WVR-227/rebuild-phase-2-security-gates-pace-math-and-collectibles-engine); the W4 workflow doc at `/workspace/wv-rebuild/docs/rebuild/workflows/W4-collectibles-and-switch.md`; Jah's Nov 17 switch answers as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`. I did not re-verify the WVR-226 schema, the exact Phase 3/4 US-36 / WP-G1 wording, or whether "Ms. Rivera" is a real name. I also did not treat the Linear issue body as a spoken quote from Jah. It was created under his account on Nov 21, but I don't have a separate confirmation that he wrote or signed every line.

## Blockers

1. **Tobin, Ms. Rivera, and Room 12 are baked into the rules and US-9 while OQ-12 is still open.**
   - Ground rule 5 and US-9 require the name "Tobin" and the "Prototype pseudonym" tag. The persona also names "Ms. Rivera" and "Room 12," which are not even in OQ-12.
   - Tobin is not on the guard list, which is good, but Jah has not picked this name. The same thing happened on WVR-235, when Maya was swapped for Tobin without his pick.
   - Keep OQ-12 open. Use the student name only as a [PROPOSED] fixture, or switch the label to "Student A" until he picks. If a teacher name is needed, add it to OQ-12, and don't use it if there's any chance it's a real person.

2. **US-8's so-that line treats a deny as final, which fights OQ-8 and Jah's earlier answer.**
   - US-8 says "so that a no is final and visible to both of us."
   - OQ-8 is still marked unanswered, with a proposed "yes, they can request again."
   - On Nov 17 at 5:06 PM MT, Jah said, word for word: "Decline doesn't use the cap; can ask again." He also said "Decline reason optional."
   - The acceptance criteria correctly leave re-request open. The so-that line does not. Soften "final." And don't list OQ-8 as unanswered without noting that answer. The only leftover is timing (immediately vs later in the unit), not whether they can ask again.

3. **OQ-11 undersells a decision Jah already made, even though force-switch should stay out of this build.**
   - The stories say "Older tickets said yes, with a reason. It is not in WVR-231's deliverables."
   - On Nov 17 at 4:44 PM MT Jah said: "Switch: student asks, teacher approves; teacher can also force." At 5:06 PM: "Forced switch: student picks at boundary."
   - Leave teacher-forced switches out of this prototype. The cut is the student request plus the Approve/Deny modal. Just don't describe that as an unanswered question, or as something only older tickets claimed.

4. **"Next session" vs Jah's Nov 17 "next block boundary" is not called out.**
   - US-7 and the issue body use `scheduled_for = 'next_session'` and "finishes today's packet."
   - On Nov 17, switch default 3 (approved as proposed) was: the switch waits for the next block boundary by default; the teacher can tap "switch now."
   - I am not saying the rebuild must use block boundary. The WVR-231 issue may be a later cut. But the stories present "next session" as settled issue text and never mention the earlier wording. Add an open question, and don't let Proto treat "next session" as a fresh Jah call that closed the boundary-vs-session question.

## Nits

5. **OQ-3's "no reason field" is in the US-6 acceptance criteria.** It's labeled "see OQ-3" and "in this prototype," and it matches the issue's one-tap wording plus Jah's "Decline reason optional." That's a light leak, not a blocker. Keep the "prototype only / confirm before the app build" warning visible so it doesn't read as the product rule.

6. **OQ-6 fixture copy rewrites catalog mnemonics that already exist in the W4 workflow doc.** The two US-1 examples match the WVR-231 issue exactly ("Mastered 10s addition", "Comeback: solved after 2 misses"). Good. But OQ-6 then invents "Named the inner planets in order" (W4 has "Matched the planets to their names") and "Finished three days in a row" (W4 has "Answered 3 in a row on the first try") for Planet Badge and Streak Boots. If those lines are only proposed fixtures, say they differ from the W4 catalog, or start from the catalog lines.

7. **US-3 requires that a non-adjacent move cannot be submitted, but OQ-2 seeds only one adjacent destination.** With a single destination, that criterion is true by default and can't be demonstrated. Either add a visible, disabled non-adjacent option, or drop that proof from this round.

8. **v2 adds a destination-skin preview and a pre-submit "starts next session" message** that are not in US-3 or the issue (the delay is specified after approval). Fine as a variation experiment if it's labeled as extra, not as a product requirement for every build.

9. **v3's "select an item to show it on the avatar as a preview"** can look like equip/unequip, which OQ-4 left open and US-2 does not require. Say the equipped set does not change, or drop the on-avatar swap from this variation.

10. **US-4's required "today's work" line is the OQ-9 default.** It's close to the issue's "today's active packet," so I wouldn't block on it. Just keep that wording marked as fixture copy.

11. **Space / Ocean:** the W4 demo ring uses "Space" and "Ocean animals," which are actually neighbors. "Ocean" is a shortening. Keep it in OQ-2 as proposed, and don't present the shortened label as decided.

12. Catalog names in ground rule 7 match WVR-227. I did not re-verify the WVR-226 column names, the exact Phase 3/4 US-36 / WP-G1 text, or the hex palette in ground rule 6 (described as "the app's dark palette").

## Scope that's in good shape

Credit-gated map traversal, the credit-goal / ChoiceScreen travel moment, earning new items during the prototype, and teacher-forced switches are all kept out of the build. Desktop-only is consistent, and I didn't raise phone or iPhone risks. The proposed-defaults banner and the "don't bake OQ into ACs" header are the right rule; the slips above are where the file doesn't quite meet it.
