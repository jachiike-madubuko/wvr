# Results: WVR-231

Sequoia (QA), 2026-11-27 (America/Denver). Round 1. Desktop only.

- **Build SHA:** `a60baeeddc1b41da39aa4b6177a517898af2b6c0` on `proto/WVR-231`. Graded the local files at that commit, served from `127.0.0.1:8231`. The html-preview links were not graded.
- **Viewport:** 1280x800 for every check. Horizontal scroll also checked at 1024 and 1440. A 800px-wide window was used only to see whether the banner collapse does anything (T-05). No phone, iPhone, or VoiceOver pass.
- **Tool:** Playwright 1.65.1 (headless Chromium). Harness at `/workspace/pm-weaver/wvr-231-r1/harness/run.js`. Evidence, screenshots, and the raw log are at `/workspace/pm-weaver/wvr-231-r1/evidence/` (`run.log`, `results.json`).
- **Console and network:** 0 console errors or warnings, 0 page errors, 0 failed or 4xx requests, and 0 external requests on all three.
- **Proto's pre-push check** (`node prototypes/WVR-231/check.cjs`) passed at this SHA: v1 124/124, v2 141/141, v3 140/140 (`evidence/proto-check.log`). This is extra signal only. Every item below was tested separately by `run.js`.

## Must-fix

- **None.** No variation failed any item, so all three can go to Jah.

## Polish (not blocking)

1. **The request button is below the fold at 1280x800 on all three.** You have to scroll to reach "Ask to move to Ocean": its bottom edge is at 905px on v1 and 970px on v2, and its top edge is at 877px on v3. The loop is easy to follow once you scroll, but on v1 (loop-first) the first step is the one you can't see.
2. **The banner's Collapse button does nothing you can see on desktop.** The banner text fits on one line at 800, 1024, and 1280px, so collapsed and expanded both measure 1 line and 25px. T-05 still passes because the banner can collapse and can't be removed. The button just looks dead.
3. **The scheduled state still looks like a live control.** After Approve, the disabled "Approved, not applied yet" button keeps the dimmed filled primary style, and the Ocean option stays dimmed with its dot selected (`evidence/v1-33-student-scheduled.png`). The wording is clear. The styling could read as a pressable button.
4. **The teacher ring shows more neighbors than the student can pick.** On the ring, Space links to both Ocean and Ballet, and after the transition Ocean links to Space and Digging up the past. The student is only offered one adjacent option (Ocean, then Space), with Plants as the disabled non-adjacent one. This matches the fixture, but "adjacent" means something different on each screen. Noted as fixture copy (OQ-2), not a fail.
5. **v3: the Comeback Visor preview is hard to see.** Its dashed outline is thin and sits partly under the helmet edge, so it is hard to spot in the normal 1280x800 screenshot (`evidence/v3-41-v3-select-visor.png`). It shows up clearly only when zoomed (`evidence/eye-v3-avatar-visor-crop.png`, 2x). The boots and helmet-highlight outlines are clear.
6. **v3: the item preview stays on after a view switch.** If an item is selected, going Student → Teacher → Student keeps the selection and its dashed preview. The Equipped tags don't change, and deselecting brings back the seeded avatar. This is not a T-41 fail, because the selection was never left. It is just a small surprise.

## Ranking

All three pass every in-scope item, so the ranking is a judgment call on clarity and risk, not on checklist counts.

1. **v1 Loop-first.** Shortest path, and nothing on the screen can be misread as equip or as a move. Approve and Deny are clear, and the scheduled hint on both views says "still on Space."
2. **v2 Destination preview.** Close second. The preview card reads clearly as "not applied," and the side-by-side current vs requested modal is the best teacher modal of the three. It has the most content, so its request button sits lowest (970px). The pre-submit delay note and the side-by-side modal would be worth folding into v1.
3. **v3 Mnemonic-first.** Best for reading the bag as memories, with large memory lines. But its on-avatar dashed preview is the closest to "trying on" an item (leftover-risk item 1), the visor preview is barely visible, and the request panel is deliberately downplayed.

## Leftover-risk eye-check (T-40, T-41)

- **v2: does not read as equip or as already moved.** The Ocean look opens as a separate dashed card inside the "Change interest" panel, labeled "LOOK PREVIEW ONLY · NOT APPLIED," with the text "You are still on **Space**, and what you wear does not change." With the card open, the avatar SVG is byte-identical to the seed. Skin stays "Space," Today's work stays "Space packet," and Wearing and Equipped don't change. This holds after submit too. Evidence: `evidence/v2-40-v2-preview-open.png`, `evidence/v2-40-preview-panel.png`, `evidence/eye-v2-avatar-with-preview-open.png`, `evidence/eye-v2-preview-card.png`, and the side-by-side modal `evidence/v2-40-v2-modal-side-by-side.png`.
- **v3: does not read as already moved, but it is closer to a "try-on" than v2.** Selecting an unequipped item (Visor, Boots) draws a dashed outline on the avatar plus a "PREVIEW ONLY · NOT EQUIPPED" box. Selecting an equipped item (Helmet, Badge) draws a dashed ring and says "Already worn. Nothing changes." The Equipped tags, the Wearing line, and the solid item fills never change. Clear, Escape, re-clicking, selecting another item, and reload all bring back the byte-identical seeded avatar. Because the preview sits on the avatar itself, Jah should judge whether it reads as the first step of equipping. Evidence: `evidence/eye-v3-avatar-strip.png` (none / helmet / visor / boots), `evidence/v3-41-v3-select-*.png`.

## Counts

| Variation | pass | fail | blocked | n/a |
|---|---|---|---|---|
| v1 | 40 | 0 | 0 | 2 |
| v2 | 41 | 0 | 0 | 1 |
| v3 | 41 | 0 | 0 | 1 |

n/a is only used where the item says "v2 only" (T-40) or "v3 only" (T-41).

**Out of scope / dropped:** none. This checklist has no phone, iPhone, or VoiceOver items. T-04 and the desktop part of T-42 were graded as written.

## Fixture notes (proposed, not product decisions)

- T-18 (OQ-2): current is "Space", adjacent is "Ocean", non-adjacent is "Plants" on all three. The ring also shows Ballet and Digging up the past. These are fixture labels only.
- T-14 (OQ-6): all three use the W4 lines exactly. The Comeback Visor line is "Kept going after 3 misses", not the issue example. No Revision 1 invented lines.
- T-20 (OQ-9): "Today's work: Space packet" is fixture copy.
- T-28 (OQ-3): one-click Approve and Deny with no reason field is prototype-only.
- T-33 (OQ-13): the delay copy is "does not apply yet … comes later (stand-in timing, not decided)". It never says "next session" or "next block".
- T-39 (OQ-8): behavior seen on all three is **can ask again immediately**. The request control comes back right after a deny, still limited to Ocean, with Plants disabled. Immediate return is a proposed fixture, not a timing rule.

## Item grid

| ID | v1 | v2 | v3 |
|---|---|---|---|
| T-01 | pass | pass | pass |
| T-02 | pass | pass | pass |
| T-03 | pass | pass | pass |
| T-04 | pass | pass | pass |
| T-05 | pass | pass | pass |
| T-06 | pass | pass | pass |
| T-07 | pass | pass | pass |
| T-08 | pass | pass | pass |
| T-09 | pass | pass | pass |
| T-10 | pass | pass | pass |
| T-11 | pass | pass | pass |
| T-12 | pass | pass | pass |
| T-13 | pass | pass | pass |
| T-14 | pass | pass | pass |
| T-15 | pass | pass | pass |
| T-16 | pass | pass | pass |
| T-17 | pass | pass | pass |
| T-18 | pass | pass | pass |
| T-19 | pass | pass | pass |
| T-20 | pass | pass | pass |
| T-21 | pass | pass | pass |
| T-22 | pass | pass | pass |
| T-23 | pass | pass | pass |
| T-24 | pass | pass | pass |
| T-25 | pass | pass | pass |
| T-26 | pass | pass | pass |
| T-27 | pass | pass | pass |
| T-28 | pass | pass | pass |
| T-29 | pass | pass | pass |
| T-30 | pass | pass | pass |
| T-31 | pass | pass | pass |
| T-32 | pass | pass | pass |
| T-33 | pass | pass | pass |
| T-34 | pass | pass | pass |
| T-35 | pass | pass | pass |
| T-36 | pass | pass | pass |
| T-37 | pass | pass | pass |
| T-38 | pass | pass | pass |
| T-39 | pass | pass | pass |
| T-40 | n/a | pass | n/a |
| T-41 | n/a | n/a | pass |
| T-42 | pass | pass | pass |

## v1 details

- **T-01 pass.** student names seen ["Student A"]; tag "Prototype pseudonym" visible=true; forbidden(Tobin/Rivera/Room 12) in text+source=[]; img/photo elements=0; email-like=false; teacher view shows "Teacher" + "Class"=true Evidence: `evidence/v1-01-student-seed.png`, `evidence/v1-01-teacher-seed.png`
- **T-02 pass.** guard-list names found in 9 rendered-text snapshots (seed, pending, scheduled, transitioned, denied, teacher, modal) + raw HTML source: []
- **T-03 pass.** 1024: hscroll student=0 teacher=0 pending=0 modal=0; 1280: hscroll student=0 teacher=0 pending=0 modal=0; 1440: hscroll student=0 teacher=0 pending=0 modal=0 / hit-test at 1280: {"#viewStudent":"ok 120x36","#viewTeacher":"ok 120x36","#resetBtn":"ok 104x36","#delayBtn":"ok 316x36","#bannerTog":"ok 84x36","#submitReq":"ok 197x44","#teacherBadge":"ok 159x40","#mClose":"ok 77x40","#mApprove":"ok 201x44","#mDeny":"ok 201x44"} Evidence: `evidence/v1-03-modal-1280.png`
- **T-04 pass.** @media rules: []; phone/mobile copy hits: []; desktop loop usable at 1024-1440 (see T-03)
- **T-05 pass.** below header=true; exact text=true; color rgb(136, 146, 176) vs body rgb(246, 241, 234) (muted); expanded h=25px; collapsed h=25px white-space=nowrap toggle="Expand"; only control ["Collapse"] (no remove); present after reload=true; collapse→expand toggles back (collapsed after 2 clicks=false); at 1280 the full text already fits on 1 line; line counts by width {"800":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1024":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1280":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}}} (800w window only to  … (full text in evidence/run.log) Evidence: `evidence/v1-05-banner-collapsed.png`, `evidence/v1-05-banner-collapsed-800w.png`
- **T-06 pass.** switch labels ["Student view","Teacher view"]; titles "Student view · Trophy Bag" / "Teacher view · Galaxy Homepage"; pending request survives Student→Teacher→Student (badge on teacher=true; student status "Waiting for your teacher. You asked to m…")
- **T-07 pass.** strip top=0px, first element in body=true; label "Proto controls · prototype only"; striped bg repeating-linear-gradient(135d… dashed border=dashed; buttons dashed monospace (ui-monospace, SFMono); controls ["Student view","Teacher view","Trigger delayed transition (stand-in)","Reset demo"]
- **T-08 pass.** pending→reset: seed restored; scheduled→reset: seed restored; applied (on Ocean)→reset: seed restored; denied→reset: seed restored; after reset+reload request=null; delay control then says "Nothing scheduled. No change." and interest stays space
- **T-09 pass.** Trophy Bag grid visible on Student view; 8 tiles, 4 unlocked (Number Helmet, Planet Badge, Comeback Visor, Streak Boots), 4 locked Evidence: `evidence/v1-09-bag.png`
- **T-10 pass.** Number Helmet: "Mastered 10s addition" visible=true; Planet Badge: "Matched the planets to their names" visible=true; Comeback Visor: "Kept going after 3 misses" visible=true; Streak Boots: "Answered 3 in a row on the first try" visible=true Evidence: `evidence/v1-09-bag.png`
- **T-11 pass.** grid names ["Number Helmet","Planet Badge","Comeback Visor","Streak Boots","Word Gloves","Social Cape","Art Brush","Traveler Star"]; not in WVR-227 catalog: []
- **T-12 pass.** avatar on same Student screen, 180x210 at y=357 (above fold at 1280x800=true); avatar draws helmet+badge (fills #58b6fa,#f2c14e); "Wearing: Number Helmet, Planet Badge"; grid "Equipped" tags on ["Number Helmet","Planet Badge"] Evidence: `evidence/v1-12-avatar.png`, `evidence/v1-01-student-seed.png`
- **T-13 pass.** equipped set (Wearing line, Equipped tags, avatar item fills) identical to seed after pending/scheduled/transition/deny: true; buttons with equip/wear wording: []
- **T-14 pass.** seeded unlocked items show the proposed W4 lines exactly: true; Comeback line seen "Kept going after 3 misses"; Rev 1 invented lines in source=false
- **T-15 pass.** current chip "Space"; destination option "OceanNext to Space" (preselected aria-checked=true); submit button "Ask to move to Ocean" enabled before submit Evidence: `evidence/v1-15-request-panel.png`
- **T-16 pass.** "Plants Not next to Space, can't ask" visible=true disabled=true aria-disabled=true no action handler=true; force-click → no request, submit still "Ask to move to Ocean"; even after DOM-enabling Plants and clicking, submit created request to "ocean" (never plants); 2 option rows only, no map svg in Student view
- **T-17 pass.** state after one submit {"status":"pending","to":"ocean"}; Teacher view badge visible=true; credit meter/check text present=false
- **T-18 pass.** fixture pair used: current "Space", adjacent "Ocean" (proposed OQ-2 pair); non-adjacent "Plants"; ring also lists Ballet, Digging up the past. Noted as fixtures only.
- **T-19 pass.** status "Waiting for your teacher. You asked to move from Space to Ocean. You stay on Space for today's work."; current chip "Space", skin "Space", state interest space Evidence: `evidence/v1-19-student-pending.png`
- **T-20 pass.** today line "Today's work: Space packet" while Ocean is pending Evidence: `evidence/v1-19-student-pending.png`
- **T-21 pass.** submit enabled=false ("Request sent"), destination enabled=false; force + DOM click on submit leaves one request {"status":"pending","to":"ocean"}
- **T-22 pass.** after reload: state {"status":"pending","to":"ocean"}, status "Waiting for your teacher. …", current "Space", today "Today's work: Space packet", teacher badge=true
- **T-23 pass.** heading "Galaxy Homepage"; class row "Student APrototype pseudonymInterest: Space"; ring labels ["Space","A","Ballet","Plants","Digging up the past","Ocean"] (five W4 labels, non-interactive: focusables=0, cursor auto, clicking ring changed state=false); no 3D/calendar=true Evidence: `evidence/v1-23-teacher-empty.png`
- **T-24 pass.** badge {"inRow":true,"text":"Switch request","aria":"Student A has an interest switch request. Open."} Evidence: `evidence/v1-24-teacher-badge.png`
- **T-25 pass.** after Reset demo, Teacher view alert-badge elements=0 Evidence: `evidence/v1-23-teacher-empty.png`
- **T-26 pass.** click badge → dialog open=true role=dialog; initial focus #mClose Evidence: `evidence/v1-26-modal.png`
- **T-27 pass.** modal text: "Interest switch request Close Student A Prototype pseudonym Current interest Space Requested interest Ocean (next to Space) ✕ Deny ✓ Approve One tap. No reason field in this prototype only (OQ-3). Approve schedules the change for later; it " Evidence: `evidence/v1-26-modal.png`
- **T-28 pass.** modal buttons ["Close","✕ Deny","✓ Approve"]; inputs/reason fields=0; one click Approve → scheduled; one click Deny → request null, last=denied
- **T-29 pass.** after Approve: modal closed=true, "Teacher view · Galaxy Homepage", toast "Approved: Ocean is scheduled for later. Student A stays on Space for now."; after Deny: modal closed=true, "Teacher view · Galaxy Homepage", toast "Denied. Student A stays on Space and can ask again." Evidence: `evidence/v1-32-teacher-after-approve.png`, `evidence/v1-37-teacher-after-deny.png`
- **T-30 pass.** Approve {"c":"rgb(88, 182, 250)","b":"rgb(88, 182, 250)","bg":"rgba(88, 182, 250, 0.06)"} "✓" vs Deny {"c":"rgb(255, 122, 122)","b":"rgb(255, 122, 122)","bg":"rgba(255, 122, 122, 0.06)"} "✕"; neither filled primary; default focus on Close, Enter right after open → request still pending (modal open after Enter=false) Evidence: `evidence/v1-26-modal.png`
- **T-31 pass.** [{"how":"Close button","closed":true,"status":"pending","badge":true},{"how":"Escape","closed":true,"status":"pending","badge":true},{"how":"backdrop click","closed":true,"status":"pending","badge":true}]
- **T-32 pass.** state after Approve {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"teacher"}
- **T-33 pass.** status "Your teacher said yes to Ocean. It does not apply yet. You finish today's work on Space first. The change comes later (stand-in timing, not decided)."; current "Space"; today "Today's work: Space packet"; skin "Space" (avatar gradient #1b1640 = space); submit "Approved, not applied yet" Evidence: `evidence/v1-33-student-scheduled.png`
- **T-34 pass.** badge visible=false; hint "Scheduled: Ocean later · still on Space"; roster interest "Space"; ring marker on Space Evidence: `evidence/v1-34-teacher-scheduled.png`
- **T-35 pass.** after reload: {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"student"}; current "Space"; status "Your teacher said yes to Ocean. It does not apply …"
- **T-36 pass.** proto msg "Delayed transition ran: Student A is now on Ocean."; state {"interest":"ocean","request":null,"last":"applied","view":"student"}; current "Ocean", skin "Ocean" (avatar gradient #0e4d6b = ocean), today "Today's work: Ocean packet", note "You moved to Ocean. Your approved change has applied."; adjacent now "SpaceNext to Ocean", disabled "PlantsNot next to Ocean, can't ask", submit "Ask to move to Space" enabled=true; teacher roster "Ocean", scheduled hint gone=true Evidence: `evidence/v1-36-student-after-transition.png`, `evidence/v1-36-teacher-after-transition.png`
- **T-37 pass.** state after Deny {"interest":"space","request":null,"last":"denied","view":"teacher"} (no pending, no scheduled)
- **T-38 pass.** after Deny: current "Space", status "Your teacher said not now. You are still on Space. You can ask again.", teacher badge=false hint=false; delay control → "Nothing scheduled. No change.", still "Space" / skin "Space" Evidence: `evidence/v1-38-student-after-deny.png`
- **T-39 pass.** behavior seen: can ask again IMMEDIATELY (submit "Ask to move to Ocean" enabled=true); destination still adjacent only ("OceanNext to Space", Plants disabled=true); re-request → {"status":"pending","to":"ocean"}
- **T-40 n/a.** v2 only
- **T-41 n/a.** v3 only
- **T-42 pass.** text+source hits {"switchNow":null,"credit":null,"force":null,"map":null,"earn":null}; only immediate-apply control is the Proto chrome "Trigger delayed transition (stand-in)", which applies only an already-approved change (deny/none → no change, T-08/T-38); no @media/phone layout (T-04)

## v2 details

- **T-01 pass.** student names seen ["Student A"]; tag "Prototype pseudonym" visible=true; forbidden(Tobin/Rivera/Room 12) in text+source=[]; img/photo elements=0; email-like=false; teacher view shows "Teacher" + "Class"=true Evidence: `evidence/v2-01-student-seed.png`, `evidence/v2-01-teacher-seed.png`
- **T-02 pass.** guard-list names found in 9 rendered-text snapshots (seed, pending, scheduled, transitioned, denied, teacher, modal) + raw HTML source: []
- **T-03 pass.** 1024: hscroll student=0 teacher=0 pending=0 modal=0; 1280: hscroll student=0 teacher=0 pending=0 modal=0; 1440: hscroll student=0 teacher=0 pending=0 modal=0 / hit-test at 1280: {"#viewStudent":"ok 120x36","#viewTeacher":"ok 120x36","#resetBtn":"ok 104x36","#delayBtn":"ok 316x36","#bannerTog":"ok 84x36","#submitReq":"ok 197x44","#teacherBadge":"ok 159x40","#mClose":"ok 77x40","#mApprove":"ok 271x44","#mDeny":"ok 271x44"} Evidence: `evidence/v2-03-modal-1280.png`
- **T-04 pass.** @media rules: []; phone/mobile copy hits: []; desktop loop usable at 1024-1440 (see T-03)
- **T-05 pass.** below header=true; exact text=true; color rgb(136, 146, 176) vs body rgb(246, 241, 234) (muted); expanded h=25px; collapsed h=25px white-space=nowrap toggle="Expand"; only control ["Collapse"] (no remove); present after reload=true; collapse→expand toggles back (collapsed after 2 clicks=false); at 1280 the full text already fits on 1 line; line counts by width {"800":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1024":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1280":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}}} (800w window only to  … (full text in evidence/run.log) Evidence: `evidence/v2-05-banner-collapsed.png`, `evidence/v2-05-banner-collapsed-800w.png`
- **T-06 pass.** switch labels ["Student view","Teacher view"]; titles "Student view · Trophy Bag" / "Teacher view · Galaxy Homepage"; pending request survives Student→Teacher→Student (badge on teacher=true; student status "Waiting for your teacher. You asked to m…")
- **T-07 pass.** strip top=0px, first element in body=true; label "Proto controls · prototype only"; striped bg repeating-linear-gradient(135d… dashed border=dashed; buttons dashed monospace (ui-monospace, SFMono); controls ["Student view","Teacher view","Trigger delayed transition (stand-in)","Reset demo"]
- **T-08 pass.** pending→reset: seed restored; scheduled→reset: seed restored; applied (on Ocean)→reset: seed restored; denied→reset: seed restored; after reset+reload request=null; delay control then says "Nothing scheduled. No change." and interest stays space
- **T-09 pass.** Trophy Bag grid visible on Student view; 8 tiles, 4 unlocked (Number Helmet, Planet Badge, Comeback Visor, Streak Boots), 4 locked Evidence: `evidence/v2-09-bag.png`
- **T-10 pass.** Number Helmet: "Mastered 10s addition" visible=true; Planet Badge: "Matched the planets to their names" visible=true; Comeback Visor: "Kept going after 3 misses" visible=true; Streak Boots: "Answered 3 in a row on the first try" visible=true Evidence: `evidence/v2-09-bag.png`
- **T-11 pass.** grid names ["Number Helmet","Planet Badge","Comeback Visor","Streak Boots","Word Gloves","Social Cape","Art Brush","Traveler Star"]; not in WVR-227 catalog: []
- **T-12 pass.** avatar on same Student screen, 180x210 at y=376 (above fold at 1280x800=true); avatar draws helmet+badge (fills #58b6fa,#f2c14e); "Wearing: Number Helmet, Planet Badge"; grid "Equipped" tags on ["Number Helmet","Planet Badge"] Evidence: `evidence/v2-12-avatar.png`, `evidence/v2-01-student-seed.png`
- **T-13 pass.** equipped set (Wearing line, Equipped tags, avatar item fills) identical to seed after pending/scheduled/transition/deny: true; buttons with equip/wear wording: []
- **T-14 pass.** seeded unlocked items show the proposed W4 lines exactly: true; Comeback line seen "Kept going after 3 misses"; Rev 1 invented lines in source=false
- **T-15 pass.** current chip "Space"; destination option "OceanNext to Space" (preselected aria-checked=true); submit button "Ask to move to Ocean" enabled before submit Evidence: `evidence/v2-15-request-panel.png`
- **T-16 pass.** "Plants Not next to Space, can't ask" visible=true disabled=true aria-disabled=true no action handler=true; force-click → no request, submit still "Ask to move to Ocean"; even after DOM-enabling Plants and clicking, submit created request to "ocean" (never plants); 2 option rows only, no map svg in Student view
- **T-17 pass.** state after one submit {"status":"pending","to":"ocean"}; Teacher view badge visible=true; credit meter/check text present=false
- **T-18 pass.** fixture pair used: current "Space", adjacent "Ocean" (proposed OQ-2 pair); non-adjacent "Plants"; ring also lists Ballet, Digging up the past. Noted as fixtures only.
- **T-19 pass.** status "Waiting for your teacher. You asked to move from Space to Ocean. You stay on Space for today's work."; current chip "Space", skin "Space", state interest space Evidence: `evidence/v2-19-student-pending.png`
- **T-20 pass.** today line "Today's work: Space packet" while Ocean is pending Evidence: `evidence/v2-19-student-pending.png`
- **T-21 pass.** submit enabled=false ("Request sent"), destination enabled=false; force + DOM click on submit leaves one request {"status":"pending","to":"ocean"}
- **T-22 pass.** after reload: state {"status":"pending","to":"ocean"}, status "Waiting for your teacher. …", current "Space", today "Today's work: Space packet", teacher badge=true
- **T-23 pass.** heading "Galaxy Homepage"; class row "Student APrototype pseudonymInterest: Space"; ring labels ["Space","A","Ballet","Plants","Digging up the past","Ocean"] (five W4 labels, non-interactive: focusables=0, cursor auto, clicking ring changed state=false); no 3D/calendar=true Evidence: `evidence/v2-23-teacher-empty.png`
- **T-24 pass.** badge {"inRow":true,"text":"Switch request","aria":"Student A has an interest switch request. Open."} Evidence: `evidence/v2-24-teacher-badge.png`
- **T-25 pass.** after Reset demo, Teacher view alert-badge elements=0 Evidence: `evidence/v2-23-teacher-empty.png`
- **T-26 pass.** click badge → dialog open=true role=dialog; initial focus #mClose Evidence: `evidence/v2-26-modal.png`
- **T-27 pass.** modal text: "Interest switch request Close Student A Prototype pseudonym Current: Space Requested: Ocean (next to Space) ✕ Deny ✓ Approve One tap. No reason field in this prototype only (OQ-3). Approve schedules the change for later; it does not apply n" Evidence: `evidence/v2-26-modal.png`
- **T-28 pass.** modal buttons ["Close","✕ Deny","✓ Approve"]; inputs/reason fields=0; one click Approve → scheduled; one click Deny → request null, last=denied
- **T-29 pass.** after Approve: modal closed=true, "Teacher view · Galaxy Homepage", toast "Approved: Ocean is scheduled for later. Student A stays on Space for now."; after Deny: modal closed=true, "Teacher view · Galaxy Homepage", toast "Denied. Student A stays on Space and can ask again." Evidence: `evidence/v2-32-teacher-after-approve.png`, `evidence/v2-37-teacher-after-deny.png`
- **T-30 pass.** Approve {"c":"rgb(88, 182, 250)","b":"rgb(88, 182, 250)","bg":"rgba(88, 182, 250, 0.06)"} "✓" vs Deny {"c":"rgb(255, 122, 122)","b":"rgb(255, 122, 122)","bg":"rgba(255, 122, 122, 0.06)"} "✕"; neither filled primary; default focus on Close, Enter right after open → request still pending (modal open after Enter=false) Evidence: `evidence/v2-26-modal.png`
- **T-31 pass.** [{"how":"Close button","closed":true,"status":"pending","badge":true},{"how":"Escape","closed":true,"status":"pending","badge":true},{"how":"backdrop click","closed":true,"status":"pending","badge":true}]
- **T-32 pass.** state after Approve {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"teacher"}
- **T-33 pass.** status "Your teacher said yes to Ocean. It does not apply yet. You finish today's work on Space first. The change comes later (stand-in timing, not decided)."; current "Space"; today "Today's work: Space packet"; skin "Space" (avatar gradient #1b1640 = space); submit "Approved, not applied yet" Evidence: `evidence/v2-33-student-scheduled.png`
- **T-34 pass.** badge visible=false; hint "Scheduled: Ocean later · still on Space"; roster interest "Space"; ring marker on Space Evidence: `evidence/v2-34-teacher-scheduled.png`
- **T-35 pass.** after reload: {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"student"}; current "Space"; status "Your teacher said yes to Ocean. It does not apply …"
- **T-36 pass.** proto msg "Delayed transition ran: Student A is now on Ocean."; state {"interest":"ocean","request":null,"last":"applied","view":"student"}; current "Ocean", skin "Ocean" (avatar gradient #0e4d6b = ocean), today "Today's work: Ocean packet", note "You moved to Ocean. Your approved change has applied."; adjacent now "SpaceNext to Ocean", disabled "PlantsNot next to Ocean, can't ask", submit "Ask to move to Space" enabled=true; teacher roster "Ocean", scheduled hint gone=true Evidence: `evidence/v2-36-student-after-transition.png`, `evidence/v2-36-teacher-after-transition.png`
- **T-37 pass.** state after Deny {"interest":"space","request":null,"last":"denied","view":"teacher"} (no pending, no scheduled)
- **T-38 pass.** after Deny: current "Space", status "Your teacher said not now. You are still on Space. You can ask again.", teacher badge=false hint=false; delay control → "Nothing scheduled. No change.", still "Space" / skin "Space" Evidence: `evidence/v2-38-student-after-deny.png`
- **T-39 pass.** behavior seen: can ask again IMMEDIATELY (submit "Ask to move to Ocean" enabled=true); destination still adjacent only ("OceanNext to Space", Plants disabled=true); re-request → {"status":"pending","to":"ocean"}
- **T-40 pass.** pre-submit delay note "If your teacher says yes, the change does not happen right away. You finish today's work first (stand-in wording)."; preview card "Look preview only · not appliedThis is how the Ocean skin looks. You are still on Space, and what you wear does not change." (border dashed, inside request panel, not in avatar panel); with preview open: avatar SVG unchanged=true, Wearing/Equipped unchanged=true, skin "Space", today "Today's work: Space packet", current "Space", state interest space; after submit avatar still Space=true Evidence: `evidence/v2-40-v2-preview-open.png`, `evidence/v2-40-preview-panel.png`, `evidence/v2-40-v2-pending-after-preview.png`, `evidence/v2-40-v2-modal-side-by-side.png`
- **T-41 n/a.** v3 only
- **T-42 pass.** text+source hits {"switchNow":null,"credit":null,"force":null,"map":null,"earn":null}; only immediate-apply control is the Proto chrome "Trigger delayed transition (stand-in)", which applies only an already-approved change (deny/none → no change, T-08/T-38); no @media/phone layout (T-04)

## v3 details

- **T-01 pass.** student names seen ["Student A"]; tag "Prototype pseudonym" visible=true; forbidden(Tobin/Rivera/Room 12) in text+source=[]; img/photo elements=0; email-like=false; teacher view shows "Teacher" + "Class"=true Evidence: `evidence/v3-01-student-seed.png`, `evidence/v3-01-teacher-seed.png`
- **T-02 pass.** guard-list names found in 9 rendered-text snapshots (seed, pending, scheduled, transitioned, denied, teacher, modal) + raw HTML source: []
- **T-03 pass.** 1024: hscroll student=0 teacher=0 pending=0 modal=0; 1280: hscroll student=0 teacher=0 pending=0 modal=0; 1440: hscroll student=0 teacher=0 pending=0 modal=0 / hit-test at 1280: {"#viewStudent":"ok 120x36","#viewTeacher":"ok 120x36","#resetBtn":"ok 104x36","#delayBtn":"ok 316x36","#bannerTog":"ok 84x36","#submitReq":"ok 197x44","#teacherBadge":"ok 159x40","#mClose":"ok 77x40","#mApprove":"ok 201x44","#mDeny":"ok 201x44"} Evidence: `evidence/v3-03-modal-1280.png`
- **T-04 pass.** @media rules: []; phone/mobile copy hits: []; desktop loop usable at 1024-1440 (see T-03)
- **T-05 pass.** below header=true; exact text=true; color rgb(136, 146, 176) vs body rgb(246, 241, 234) (muted); expanded h=25px; collapsed h=25px white-space=nowrap toggle="Expand"; only control ["Collapse"] (no remove); present after reload=true; collapse→expand toggles back (collapsed after 2 clicks=false); at 1280 the full text already fits on 1 line; line counts by width {"800":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1024":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}},"1280":{"expanded":{"collapsed":false,"lines":1,"h":25},"collapsed":{"collapsed":true,"lines":1,"h":25}}} (800w window only to  … (full text in evidence/run.log) Evidence: `evidence/v3-05-banner-collapsed.png`, `evidence/v3-05-banner-collapsed-800w.png`
- **T-06 pass.** switch labels ["Student view","Teacher view"]; titles "Student view · Trophy Bag" / "Teacher view · Galaxy Homepage"; pending request survives Student→Teacher→Student (badge on teacher=true; student status "Waiting for your teacher. You asked to m…")
- **T-07 pass.** strip top=0px, first element in body=true; label "Proto controls · prototype only"; striped bg repeating-linear-gradient(135d… dashed border=dashed; buttons dashed monospace (ui-monospace, SFMono); controls ["Student view","Teacher view","Trigger delayed transition (stand-in)","Reset demo"]
- **T-08 pass.** pending→reset: seed restored; scheduled→reset: seed restored; applied (on Ocean)→reset: seed restored; denied→reset: seed restored; after reset+reload request=null; delay control then says "Nothing scheduled. No change." and interest stays space
- **T-09 pass.** Trophy Bag grid visible on Student view; 8 tiles, 4 unlocked (Number Helmet, Planet Badge, Comeback Visor, Streak Boots), 4 locked Evidence: `evidence/v3-09-bag.png`
- **T-10 pass.** Number Helmet: "Mastered 10s addition" visible=true; Planet Badge: "Matched the planets to their names" visible=true; Comeback Visor: "Kept going after 3 misses" visible=true; Streak Boots: "Answered 3 in a row on the first try" visible=true Evidence: `evidence/v3-09-bag.png`
- **T-11 pass.** grid names ["Number Helmet","Planet Badge","Comeback Visor","Streak Boots","Word Gloves","Social Cape","Art Brush","Traveler Star"]; not in WVR-227 catalog: []
- **T-12 pass.** avatar on same Student screen, 180x210 at y=195 (above fold at 1280x800=true); avatar draws helmet+badge (fills #58b6fa,#f2c14e); "Wearing: Number Helmet, Planet Badge"; grid "Equipped" tags on ["Number Helmet","Planet Badge"] Evidence: `evidence/v3-12-avatar.png`, `evidence/v3-01-student-seed.png`
- **T-13 pass.** equipped set (Wearing line, Equipped tags, avatar item fills) identical to seed after pending/scheduled/transition/deny: true; buttons with equip/wear wording: []
- **T-14 pass.** seeded unlocked items show the proposed W4 lines exactly: true; Comeback line seen "Kept going after 3 misses"; Rev 1 invented lines in source=false
- **T-15 pass.** current chip "Space"; destination option "OceanNext to Space" (preselected aria-checked=true); submit button "Ask to move to Ocean" enabled before submit Evidence: `evidence/v3-15-request-panel.png`
- **T-16 pass.** "Plants Not next to Space, can't ask" visible=true disabled=true aria-disabled=true no action handler=true; force-click → no request, submit still "Ask to move to Ocean"; even after DOM-enabling Plants and clicking, submit created request to "ocean" (never plants); 2 option rows only, no map svg in Student view
- **T-17 pass.** state after one submit {"status":"pending","to":"ocean"}; Teacher view badge visible=true; credit meter/check text present=false
- **T-18 pass.** fixture pair used: current "Space", adjacent "Ocean" (proposed OQ-2 pair); non-adjacent "Plants"; ring also lists Ballet, Digging up the past. Noted as fixtures only.
- **T-19 pass.** status "Waiting for your teacher. You asked to move from Space to Ocean. You stay on Space for today's work."; current chip "Space", skin "Space", state interest space Evidence: `evidence/v3-19-student-pending.png`
- **T-20 pass.** today line "Today's work: Space packet" while Ocean is pending Evidence: `evidence/v3-19-student-pending.png`
- **T-21 pass.** submit enabled=false ("Request sent"), destination enabled=false; force + DOM click on submit leaves one request {"status":"pending","to":"ocean"}
- **T-22 pass.** after reload: state {"status":"pending","to":"ocean"}, status "Waiting for your teacher. …", current "Space", today "Today's work: Space packet", teacher badge=true
- **T-23 pass.** heading "Galaxy Homepage"; class row "Student APrototype pseudonymInterest: Space"; ring labels ["Space","A","Ballet","Plants","Digging up the past","Ocean"] (five W4 labels, non-interactive: focusables=0, cursor auto, clicking ring changed state=false); no 3D/calendar=true Evidence: `evidence/v3-23-teacher-empty.png`
- **T-24 pass.** badge {"inRow":true,"text":"Switch request","aria":"Student A has an interest switch request. Open."} Evidence: `evidence/v3-24-teacher-badge.png`
- **T-25 pass.** after Reset demo, Teacher view alert-badge elements=0 Evidence: `evidence/v3-23-teacher-empty.png`
- **T-26 pass.** click badge → dialog open=true role=dialog; initial focus #mClose Evidence: `evidence/v3-26-modal.png`
- **T-27 pass.** modal text: "Interest switch request Close Student A Prototype pseudonym Current interest Space Requested interest Ocean (next to Space) ✕ Deny ✓ Approve One tap. No reason field in this prototype only (OQ-3). Approve schedules the change for later; it " Evidence: `evidence/v3-26-modal.png`
- **T-28 pass.** modal buttons ["Close","✕ Deny","✓ Approve"]; inputs/reason fields=0; one click Approve → scheduled; one click Deny → request null, last=denied
- **T-29 pass.** after Approve: modal closed=true, "Teacher view · Galaxy Homepage", toast "Approved: Ocean is scheduled for later. Student A stays on Space for now."; after Deny: modal closed=true, "Teacher view · Galaxy Homepage", toast "Denied. Student A stays on Space and can ask again." Evidence: `evidence/v3-32-teacher-after-approve.png`, `evidence/v3-37-teacher-after-deny.png`
- **T-30 pass.** Approve {"c":"rgb(88, 182, 250)","b":"rgb(88, 182, 250)","bg":"rgba(88, 182, 250, 0.06)"} "✓" vs Deny {"c":"rgb(255, 122, 122)","b":"rgb(255, 122, 122)","bg":"rgba(255, 122, 122, 0.06)"} "✕"; neither filled primary; default focus on Close, Enter right after open → request still pending (modal open after Enter=false) Evidence: `evidence/v3-26-modal.png`
- **T-31 pass.** [{"how":"Close button","closed":true,"status":"pending","badge":true},{"how":"Escape","closed":true,"status":"pending","badge":true},{"how":"backdrop click","closed":true,"status":"pending","badge":true}]
- **T-32 pass.** state after Approve {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"teacher"}
- **T-33 pass.** status "Your teacher said yes to Ocean. It does not apply yet. You finish today's work on Space first. The change comes later (stand-in timing, not decided)."; current "Space"; today "Today's work: Space packet"; skin "Space" (avatar gradient #1b1640 = space); submit "Approved, not applied yet" Evidence: `evidence/v3-33-student-scheduled.png`
- **T-34 pass.** badge visible=false; hint "Scheduled: Ocean later · still on Space"; roster interest "Space"; ring marker on Space Evidence: `evidence/v3-34-teacher-scheduled.png`
- **T-35 pass.** after reload: {"interest":"space","request":{"status":"scheduled","to":"ocean"},"last":null,"view":"student"}; current "Space"; status "Your teacher said yes to Ocean. It does not apply …"
- **T-36 pass.** proto msg "Delayed transition ran: Student A is now on Ocean."; state {"interest":"ocean","request":null,"last":"applied","view":"student"}; current "Ocean", skin "Ocean" (avatar gradient #0e4d6b = ocean), today "Today's work: Ocean packet", note "You moved to Ocean. Your approved change has applied."; adjacent now "SpaceNext to Ocean", disabled "PlantsNot next to Ocean, can't ask", submit "Ask to move to Space" enabled=true; teacher roster "Ocean", scheduled hint gone=true Evidence: `evidence/v3-36-student-after-transition.png`, `evidence/v3-36-teacher-after-transition.png`
- **T-37 pass.** state after Deny {"interest":"space","request":null,"last":"denied","view":"teacher"} (no pending, no scheduled)
- **T-38 pass.** after Deny: current "Space", status "Your teacher said not now. You are still on Space. You can ask again.", teacher badge=false hint=false; delay control → "Nothing scheduled. No change.", still "Space" / skin "Space" Evidence: `evidence/v3-38-student-after-deny.png`
- **T-39 pass.** behavior seen: can ask again IMMEDIATELY (submit "Ask to move to Ocean" enabled=true); destination still adjacent only ("OceanNext to Space", Plants disabled=true); re-request → {"status":"pending","to":"ocean"}
- **T-40 n/a.** v2 only
- **T-41 pass.** per selection [{"id":"helmet","wearing":true,"eqtags":true,"avFills":true,"dashed":1,"box":"Memory highlightMastered 10s addition (Number Helmet)Already worn. Nothing changes.Clear preview","stateSame":true},{"id":"visor","wearing":true,"eqtags":true,"avFills":true,"dashed":1,"box":"Preview only · not equippedKept going after 3 misses (Comeback Visor)Dashed outline is a look only. What you w","stateSame":true},{"id":"badge","wearing":true,"eqtags":true,"avFills":true,"dashed":1,"box":"Memory highlightMatched the planets to their names (Planet Badge)Already worn. Nothing changes.Clear preview","stateSame":true},{"id":"boots","wearing":true,"eqtags":true,"avFills":true,"dashed":2,"box":"Previe … (full text in evidence/run.log) Evidence: `evidence/v3-41-v3-select-helmet.png`, `evidence/v3-41-v3-select-visor.png`, `evidence/v3-41-v3-select-badge.png`, `evidence/v3-41-v3-select-boots.png`
- **T-42 pass.** text+source hits {"switchNow":null,"credit":null,"force":null,"map":null,"earn":null}; only immediate-apply control is the Proto chrome "Trigger delayed transition (stand-in)", which applies only an already-approved change (deny/none → no change, T-08/T-38); no @media/phone layout (T-04)

