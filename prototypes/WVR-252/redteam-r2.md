# Red team — WVR-252, round 2

Petey Pablo, 2026-11-28 (America/Denver). Reviewed `/workspace/pm-weaver/wvr-252/stories.md` (Revision 3) and `checklist-r2.md` (T-01–T-50). Box only; no GitHub work and no Linear writes. Did not edit `stories.md`.

**Verdict: ready for Proto as-is.** No blockers. The Nov 28 cut is right: the adjacency gate is gone, a switch among the top five waits until the credit limit is met, there is no student Galaxy map, and a forced switch still waits for the student to pick at the boundary. The credit amount and how credits are earned stay in OQ-1. The three directions (list-first, skin chips, one picker) actually differ.

**What I checked:** Revision 3 and `checklist-r2.md`; Linear [WVR-252](https://linear.app/weaver-edu/issue/WVR-252/credit-gated-interest-switch-top-five-and-teacher-forced-switch) (read-only); locked WVR-231 v4 deny copy, button-skin, and one-equipped-per-slot rules; Jah's Nov 17 lines in `/workspace/pm-weaver/cut-2026-11-17-v3-demo-sprint.md`; `improvements.md`. I did not re-verify Phase 3/4 wording, the WVR-226 schema, or the palette hex. I did not treat the Linear body, or the Nov 28 comment, as spoken words beyond the quoted block.

Linear check: the issue was renamed to "Credit-gated interest switch (top five) and teacher-forced switch." The Decision (Jah, Nov 28) block quotes him verbatim; the stories quote matches, including "top five," "once the credit limit has been achieved," and "that would remove the galaxy map from the student view." The credit amount, and how credits are earned, are not in his words.

## Blockers

None.

## Nits

1. **The force-boundary pick set is slightly over-stated as decided.** Jah's Nov 28 words are about kids switching after the credit limit, not about the force pick set. "Forced switch: student picks at boundary" (Nov 17) still holds, and US-6 correctly forbids a force-time destination. Using the same top five at the force pick is a consistent fixture, not a fresh Jah call. Keep it in OQ-4 with Stay, or label it as following the request set, rather than in US-5 and the "Decided" section as if he specified the force list.

2. **T-12's exact-copy list does not include "Travel" or W4's "Ready to travel."** The only "Travel" hit in the stories is a v2 negative example (line 178). Add those strings to the student-view must-NOT-say check so a leftover Travel label cannot pass T-12.

3. **State-dependent label risks to watch in the build** (improvement 4). T-12 already covers an interest staying "Adjacent" during a force. Also watch: a locked or pending control that still reads as a pressable "switch to X"; a v3 picker that stays pre-selected after cancel or in the force-coming state; stale "requested" / "scheduled" / "chosen" tags after deny or before the boundary pick.

4. **T-01 forbids Tobin, Ms. Rivera, and Room 12, but is not tagged must-NOT-say and does not require its own exact-copy screenshot.** T-02 covers the guard list with screenshots. Same treatment for the proposed-name bans would match improvement 5.

5. **The Linear issue body still has the old Scope** (student Galaxy map, adjacent Travel) above the Nov 28 decision. Stories follow the new cut. I did not write to Linear.

## Must-NOT-say coverage (improvement 5)

Already in `checklist-r2.md` as exact-copy checks with a screenshot: T-11 (no map / ring / neighbor layout), T-12 (adjacency and Galaxy-map strings, including leftover "Adjacent" during a force), T-26 (deny copy), T-38 (force-time timeline names no destination), T-43 ("next session"), T-44 ("switch now"), T-45 (force-time views and timeline name no destination). T-02 covers the guard-list names. Gaps are nits 2 and 4. T-04 is the above-the-fold decision-surface check at 1280×800 in states (a)–(h). The fixtures/n-a block is at the top of the checklist.

## Leftover scan

No leftover *requirements*. Hits are bans, Jah quotes, the canceled WVR-157 title, or fixture labels. No non-adjacent/Plants test; Plants appears only as a top-five fixture.

- `stories.md`: 13, 18, 19, 25, 27, 31, 57, 58, 81, 82, 93, 129, 132, 166, 170, 178, 186, 187, 188, 207, 219. Only "Travel" hit: 178 (do not build a "Travel to [one neighbor]" button). "traversal": 19 (WVR-157, do not revive).
- `checklist-r2.md`: 18, 77 (Plants as a fixture label); 78, 79, 86, 112, 117, 137, 147 (must-NOT or fail-if-leftover). No Travel, no traversal.

## Demo-name scan (improvement 6)

Pass. The Ground rule 5 guard list, plus Tobin, Ms. Rivera, and Room 12, appear only in do-not-use lines and in OQ-7 proposed fixtures, not in required UI copy: `stories.md` 52, 159, 207; `checklist-r2.md` T-01 and T-02. Required on-screen labels remain Student A, Teacher, and Class.

## Scope that's in good shape

Rev 1's timeline blocker is fixed (US-6, T-38, T-39, T-45). Deny copy starts from locked v4; the W4 "stay for now" line is documentation only. Destination skin on the request control, and at most one equipped item per slot if a bag is shown, stay consistent with locked v4. A deny is not final. Desktop-only; I did not raise phone or iPhone risks.
