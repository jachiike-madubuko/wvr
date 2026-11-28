# Red team — WVR-252

Petey Pablo, 2026-11-27 (America/Denver). Reviewed `/workspace/pm-weaver/wvr-252/stories.md` (Revision 1). Box only; no GitHub work and no Linear writes.

**Verdict: close, but not ready for Proto as-is.** The two-loop cut is right: a simplified student Galaxy map with a credit gate on adjacent Travel, where Travel opens a pending request and does not move the student immediately; and a simplified teacher Galaxy Homepage where the teacher can force a switch without picking the destination, the student picks at a delayed boundary, and a timeline records approved vs forced switches. Immediate map traversal stays out. "Switch now" stays out. Names stay on Student A, Teacher, and Class. The Nov 17 verbatim lines are quoted as decisions, not stuffed back into the Open questions.

Revise the blocker below before sending this to Proto.

**What I checked:** this `stories.md`; Linear [WVR-252](https://linear.app/weaver-edu/issue/WVR-252/credit-gated-galaxy-traversal-and-teacher-forced-switch-wvr-231) (read-only) and [WVR-231](https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest); the locked WVR-231 v4 stories (Revision 2), `STATUS.md`, `results.md`, `results-r2.md`, and `/workspace/pm-weaver/wvr-231-r1/repo/prototypes/WVR-231/leftover-risk.md`; the W4 workflow doc at `/workspace/wv-rebuild/docs/rebuild/workflows/W4-collectibles-and-switch.md`; Jah's Nov 17 switch answers as recorded in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`. I did not re-verify the WVR-226 schema, the exact Phase 3/4 US-36 / US-39a / WP-G1 wording, or the hex palette in ground rule 6. I also did not treat either Linear issue body as a spoken quote from Jah. WVR-252 was created under his account on Nov 27 at 5:38 PM MST (America/Denver); the body quotes a card answer to file the leftovers and loop them, but I don't have a separate confirmation that he wrote or signed every line.

## Blockers

1. **US-7 can log a forced switch as if a destination were already chosen, which fights "student picks at boundary."**
   - US-7 says forcing a switch adds a forced-switch entry, but not when that entry is written, or what it may name.
   - At force time there is no new interest yet. US-6 and Jah, 2026-11-17 5:06 PM MT (America/Denver), verbatim: "Forced switch: student picks at boundary."
   - If the timeline reads "forced switch to Ocean" (or any destination) when the teacher confirms, it looks like the teacher picked.
   - Say the force-time entry must not name a destination. If the chosen interest is logged, that happens only after the student picks at the boundary.

## Nits

2. **Deny copy is unspecified, and two existing lines already disagree.** W4 says the student UI after deny is "Your teacher says stay for now." Locked v4 used "Your teacher said not now. You are still on Space. You can ask again." Neither is a Jah quote. Don't invent a third line, and don't treat the W4 sentence as a new decision. If copy is needed, start from locked v4 or mark W4's line as documentation fixture only.

3. **OQ-10 lets Proto either leave the meter or clear it after the boundary, with no required on-screen fixture label.** W4 says credits reset; cut D6, approved as proposed with D2–D9, says the personal bar carries over. The warning not to present either as the product rule is right. Pick one fixture, label it, and don't let the three variations silently take opposite sides.

4. **v2 and v3 "extras" are mostly already required by US-5 and US-6.** All three variations must meet US-1 to US-8, so the destination-skin button and the boundary pick step are already in every file. The extras are emphasis only. That's fine if labeled, but Jah may not see a real choice between the three.

5. **W4's ChoiceScreen (keep or switch when the credit goal is met) is correctly out of this cut.** It is not one of the two leftovers. Add a one-line "do not build" so it doesn't sneak in from the W4 write-up.

6. **W4 already has per-node targets** (Space 10, Ballet 12, Plants 14, Digging up the past 14, Ocean animals 12). A fixture target of 10 is fine if it stays in OQ-2 and is not presented as the product number for every interest.

7. **The persona and US-3's so-that still say "today's work,"** which leans toward the issue's session/packet language. OQ-6 is otherwise careful about "next session" vs "next block boundary." Keep "today's work" as fixture tone, not product copy.

8. **US-6 requires a selectable destination that is not the current interest, which is right for a demo, but a pick list with no Stay must not close OQ-5.**

9. **Whether a denied request appears on the timeline at all is unstated.** US-7 only says it must not appear as an approved or forced switch. Either way is fine for this pass if it isn't treated as the product rule.

## Scope that's in good shape

The two leftovers match WVR-231 v4's out-of-scope list and the WVR-252 issue body. Credit-gated Travel waits for the teacher; the teacher can force without choosing the destination; the student picks at the boundary; "switch now" stays out. "10 credits" and "next session" stay in Open questions, not in the ACs. A deny is not final (OQ-9's only leftover is timing). "With a logged reason" is correctly flagged as cut D1 language, not Jah's verbatim. Names stay on Student A, and Tobin / Ms. Rivera / Room 12 are forbidden in the UI while OQ-8 is open. A visible non-adjacent neighbor makes US-4 testable. Space's other W4 neighbor is Ballet, and only Ocean is offered, same fixture as locked v4 (OQ-8). Desktop-only is consistent, and I didn't raise phone or iPhone risks. The eight stories are a full plate for one low-fi round, but they all serve these two loops plus v4 consistency (move-button skin, one equipped item per slot), and the lean Approve/Deny path is a stand-in, not a rebuild of the v4 modal.
