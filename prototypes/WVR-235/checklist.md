# Test checklist: WVR-235

Written by WVR.dev on 2026-11-26 (America/Denver) from the 28 checklist seeds in `stories.md` rev 2 (`f98ce40`), plus checks on Proto's round-1 interpretations. Sequoia runs it against every variation at build SHA `cc278c6` and records the outcomes in `results.md`.

## Setup

- **Builds under test (SHA `cc278c6`):**
  - v1, rows: https://html-preview.github.io/?url=https://github.com/jachiike-madubuko/wvr/blob/proto/WVR-235/prototypes/WVR-235/v1/index.html
  - v2, radar drag and steppers: https://html-preview.github.io/?url=https://github.com/jachiike-madubuko/wvr/blob/proto/WVR-235/prototypes/WVR-235/v2/index.html
  - v3, wizard: https://html-preview.github.io/?url=https://github.com/jachiike-madubuko/wvr/blob/proto/WVR-235/prototypes/WVR-235/v3/index.html
- **Widths:**
  - The floor is **360px** and the top is **430px**. Ignore 320px; stories rev 2 overrides it.
  - Items tagged **[W]** must pass at **both** 360×780 and 430×932.
  - All other items need one phone width (390×844 is fine).
  - Where you can, run once on a real iPhone in Safari. **[iOS]** items need that.
- **Out of scope; don't fail for these:**
  - The 1024px-and-wider desktop layout. It isn't built in round 1, and stories US-9 calls it nice to have.
  - The "← Room" link and "Room 12". They're placeholders with no destination.
  - There's no real backend. "Saved on this device only" is expected.
- **Before each variation:**
  1. Open Proto controls and tap **Reset demo**.
  2. Confirm devtools > Application > Local Storage has no `wvr235:<var>:*` keys for that variation, or only the defaults for `:controls`.
- **Storage keys:**
  - `wvr235:<var>:student:tobin` (saved)
  - `wvr235:<var>:student:tobin:draft`
  - `wvr235:<var>:controls`
- **Tags:** items marked **(proposed, OQ-n)** test a proposed default, not a decided product rule. A fail on one of these is a build issue, not a product decision. Note in `results.md` if the default itself felt wrong.
- **Marking:** use `pass`, `fail`, or `n/a` in each variation column. Use `n/a` only where the item says "v2 only", "v3 only", and so on. Give each fail a one-line reason in `results.md`.

## Checks

### A. Dimensions, empty state, radar drawing

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-01 | 1 | US-2 | Open edit mode. The 5 dimensions appear in this exact order and spelling, in the rows (v1, v2) or cards and review (v3), on the radar, and in the values line: **Emotional Reg, Focus, Engagement, Task Completion, Social**. The chart may show the shorthand "Emo Reg" or "Task Comp"; the rows and values line may not. | | | | |
| T-02 | 2 | US-1 | After Reset demo, view mode shows the title "Weaver Wheel", an empty pentagon grid with 5 labels, the text "No scores yet. These are your observations, not a diagnosis.", and one "Set Weaver Wheel" button at least 44px tall. **No** polygon, no numbers, no caption, and no default scores such as 72 or 76. | | | | |
| T-03 | 3 | US-3 | In edit mode, change one value. The radar starts moving right away (no lag you can see) and settles in about 150ms. The values line updates at the same moment. No Save is needed to see the change. | | | | |
| T-04 | 3 | US-3 | With a saved wheel, tap Edit and change one value. The draft polygon is **dashed and unfilled**, and the saved polygon is still visible behind it as a faint filled shape. Tap Save. In view mode the polygon is **solid and filled**. Line style alone (dashed vs solid) tells them apart. | | | | |
| T-05 | 3 | US-3 | Turn on reduced motion (iOS: Settings > Accessibility > Motion > Reduce Motion; devtools: emulate `prefers-reduced-motion: reduce`) and change a value. The polygon jumps with no tween. | | | | |
| T-06 | 4 | Radar rules | Set only Focus = 1. **Focus's vertex sits at 20% of the radius, not at the center.** The other 4 axes are dashed, their vertices are at the center, there's a hollow ring at each axis tip, and each is labeled "Not set". | (proposed, OQ-1) | | | |

### B. Save, storage, validation

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-07 | 5 | US-4 | From empty, set **only** Focus = 3 and Save. The button shows "Saving…" for about 400ms and a double tap doesn't save twice. Then the view shows "Saved" and "Updated just now by you". **Reload.** Focus is still 3 and the other four still show Not set, on the radar and in the values line. | (proposed, OQ-3) | | | |
| T-08 | 6 | US-6 | After Reset demo, enter edit mode and tap Save **without setting anything**. The inline error "Set at least one dimension before saving." appears next to Save with a "!" icon, so not color alone. Focus moves to the first dimension's control. No saved key is written. | (proposed, OQ-3) | | | |
| T-09 | 6 | US-6 | With a saved wheel, Edit, Clear **every** row, and Save. You get the same error. The saved key and the saved polygon are unchanged, so clearing everything is not a delete. | (proposed, OQ-3) | | | |
| T-10 | 7 | Rule 3 | After T-07, and again after saving all 5 with values 1 and 5 among them, check the saved key in devtools. Each `scores` value is `null` or a whole number **1–5**. There are **no** 20–100 values and no decimals. `updatedBy` is `"teacher"` and `updatedAt` is an ISO date. | (proposed, OQ-1) | | | |
| T-11 | — | US-6 | There's no free-text number field anywhere. Values are entered only through segments, steppers, or radar touch. | | | | |

### C. Unsaved changes and drafts

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-12 | 8 | US-5 | With a saved wheel, Edit and change a value, then tap **Cancel**. A native "Discard unsaved changes?" confirm appears. Choose Cancel: you stay in edit mode with the draft. Tap Cancel again and choose OK: you're back in view mode, the saved key is unchanged, and the draft key is gone. | | | | |
| T-13 | 8 | US-5, US-10 | Same as T-12 but press **Escape** (keyboard, desktop browser at phone width). You get the same confirm and the same outcome. | | | | |
| T-14 | 8 | US-5 | With unsaved changes, tap "← Room", then "Start empty", then "Reset demo". **Each** one asks to confirm before it discards anything. "← Room" itself goes nowhere and that's fine. | | | | |
| T-15 | 9 | US-5 | Change a value, don't save, and **reload**. A notice above the radar reads "You have unsaved changes from <time>" with **Resume** and **Discard**. Resume reopens edit mode with the draft values. Repeat and choose Discard: the draft key is deleted and the saved values show. | | | | |
| T-16 | 9 | US-5 | **[iOS]** On an iPhone in Safari, change a value, then swipe the tab closed (or switch apps and let Safari reload it) and reopen the link. The draft notice appears and Resume restores the draft. This must work with no `beforeunload` prompt. | | | | |
| T-17 | 10 | US-5 | The "Unsaved changes" chip (text plus a dot) is visible in the sticky bar **whenever** the draft differs from the saved record, and the panel title reads "Weaver Wheel · editing". Change a value back to its saved value: the chip goes away. | | | | |

### D. Prototype controls and fail-closed states

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-18 | 11 | US-7 | Save a wheel. Turn on **Slow load** and reload. For about 1.5 s you see a skeleton pentagon and "Loading Weaver Wheel…", with **no** values, polygon, Edit button, or draft notice. Then the saved wheel appears. | | | | |
| T-19 | 12 | US-7 | Save a wheel **and** leave a draft. Turn on **Fail load** and reload. The page **never** shows the saved polygon, values line, timestamp, caption, or draft notice, not even for a moment. It shows "Couldn't load the Weaver Wheel." with Retry, and there's no Edit or Set button. | | | | |
| T-20 | 12 | US-7 | Still on Fail load, tap Retry: it fails again. Turn Fail load off and tap Retry: the saved wheel and the draft notice load normally. | | | | |
| T-21 | 13 | US-7 | Tap **Bad stored value**, which writes Focus 7. The load error appears and no 7, 5, or other clamped or rounded value is shown. **Reset demo** recovers to the empty state. | | | | |
| T-22 | 14 | US-7 | Turn on **Fail next save**, edit a value, and Save. Edit mode stays open with the draft, you see "Not saved. Check your connection and try again.", the saved key keeps its old values, and "Saved" **never** appears. Tap Retry or Save again: it succeeds and the toggle has turned itself off. | | | | |
| T-23 | 15 | US-5 | With a saved wheel, set **Last saved: 2 days ago**. The view shows "Updated 2 days ago by you". "3 weeks ago" shows "Updated 3 weeks ago by you". Then Edit, change a value, and Save: it shows "just now". With nothing saved, the Last saved control is disabled. | | | | |
| T-24 | 16 | Rule 7 | Turn on Slow load, save a wheel, and leave a draft. Tap **Start empty**. The saved and draft keys are cleared, the empty state shows, and **Slow load is still on**. | | | | |
| T-25 | 16 | Rule 7 | Tap **Reset demo**. The saved, draft, **and** controls keys are cleared, and every toggle is back to off with Last saved on "just now". | | | | |
| T-26 | 16 | Rule 3, 7 | Save a wheel in v1, then open v2 and tap Start empty and Reset demo there. v1's keys are untouched. Do the same with each pair of variations. The controls sheet says "Only affects vN on this device." | | | | |
| T-27 | 22 | Rule 7, 8 | **[W]** In edit mode with the controls sheet **closed**, the "Proto controls" pill is in the header, at least 44×44px, and below the top safe area. Nothing overlaps the sticky Save bar. Scroll to the bottom: the last row isn't hidden behind the bar. | | | | |
| T-28 | 22 | Rule 7, 8 | **[W]** Open the controls sheet. It drops from the top with a backdrop and covers the page and the Save bar. **Close** dismisses it, and Escape closes the sheet only (it doesn't cancel the edit). The Save bar is fully tappable again. | | | | |

### E. Teacher-authored, identity, banner

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-29 | 17 | US-8 | Go through every state: empty, edit, saved, error, loading, the controls sheet. There's no "Suggest", "Auto-fill", "AI estimate", "Explain", sparkle icon, or chat anywhere, no student or parent edit control, and no link containing `/s/`. | | | | |
| T-30 | 18 | US-8 | "Set by you (teacher). Teacher observation, not a diagnosis." shows under the radar in **view mode and edit mode**. In v3 it shows on every card. The legend reads "Your view", never "Estimate" or "Score". | | | | |
| T-31 | 19 | Rule 5 | The only student name anywhere is **Tobin**, with a "Prototype pseudonym" tag next to it. There's no last name, photo, email, ID, or old name (Maya, Jordan, and so on). Storage keys use `tobin`. | (proposed, OQ-11) | | | |
| T-32 | 20 | Rule 9 | The proposed-defaults banner shows under the header and reads "Proposed defaults, not decided: 1–5 scale · partial save allowed · latest value only (no history) · no class average · no question bank". It collapses to one line but can't be removed, and it scrolls with the page rather than staying fixed. | | | | |
| T-33 | 28 | Rule 1 | Open devtools > Network and reload. After the HTML document itself, there are **no** requests: no fonts, CDN, or API calls. Turn on offline mode and reload from cache: the variation still works. | | | | |

### F. Phone layout

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-34 | 21 | US-9 | **[W]** There's no horizontal scroll in any state: empty, edit, error, review (v3), or with the controls sheet open. The radar labels aren't clipped. | | | | |
| T-35 | 21 | US-9 | **[W]** Every tap target is **at least 44×44px**, with **at least 8px** between neighbors. That covers segments, steppers, Clear, Save, Cancel, Back, Next/Skip, Review rows, radar labels (v3), and the controls pill. Measure with devtools. | | | | |
| T-36 | 21 | Row layout | **[W]** Each dimension is stacked. **Line 1** has the name, the value text ("4 · Usually" or "Not set"), and Clear (only when a value is set). **Line 2** has the hint. **Line 3** has the control at **full width**. v1 also has a line 4 with end labels "1 Rarely" and "5 Almost always". The name and the control never share a line. | | | | |
| T-37 | — | US-9 | **[W]** The sticky Save/Cancel bar holds the "Unsaved changes" chip, Cancel, and Save, and sits above the iPhone home indicator thanks to safe-area padding. The order down the page is header, banner, radar, values line, caption, provenance line, then rows or the card. | | | | |

### G. Keyboard and screen reader

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-38 | 23 | US-10 | Using only the keyboard (Tab, Shift+Tab, Enter, Space, arrows, Escape), complete a full edit: Edit, set 2 dimensions, Save. Tab order follows the visual order. A focus ring (at least 2px, clearly visible on the dark background) is always shown. | | | | |
| T-39 | 23 | US-10 | **v1, v3 only:** the segments are a radiogroup with roving tabindex. Arrow keys change the value, and Home and End jump to 1 and 5. | | | n/a | |
| T-40 | 23 | US-10 | **v2 only:** each stepper is a spinbutton. Up and Down arrows change it. The − and + buttons are named "Decrease <dimension>" and "Increase <dimension>". Each radar wedge handle can be focused and changed with the arrow keys. | | n/a | | n/a |
| T-41 | 24 | US-10 | With VoiceOver (iOS) or a screen reader in devtools, an untouched dimension announces **"Not set"**, not 0 or 1, and a set one announces **"<n>, <label>"**, for example "4, Usually". | (proposed, OQ-7) | | | |
| T-42 | 24 | US-10 | The radar is announced as an image whose label **matches the values line** exactly, and it updates after a change. "Loading", "Saved", and "Not saved" are announced politely. The T-08 validation error is announced assertively. | | | | |

### H. Caption

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-43 | 25 | US-4 | Save Emotional Reg 4, Focus 2, Engagement 5, Task Completion 2, Social 3. The caption reads "Lowest right now: Focus." (a tie, so the first in the fixed order). | (proposed, OQ-8) | | | |
| T-44 | 25 | US-4 | Save only Engagement 4 and Social 2. The caption reads "Lowest right now: Social. (2 of 5 set)" or very close. With nothing saved, there's no caption. The caption contains no advice. | (proposed, OQ-3, OQ-8) | | | |

### I. Variation-specific

| ID | Seed | Story | Check (steps → expected) | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|---|
| T-45 | 26 | v2 | **[W]** **v2 only:** the radar is about `min(100vw − 32px, 340px)` square (about 328px at 360 and 340px at 430). Tap or drag anywhere inside an axis's wedge, including close to the outer ring and outside the visible point: that dimension changes, snapping to the nearest step. | | n/a | | n/a |
| T-46 | 26 | v2 | **v2 only:** set all 5 dimensions to 1, so the vertices bunch up near the center. Tap each axis near its 1 position: you can raise each one **without changing a neighbor**. A tap within about 10% of the center is ignored. | | n/a | | n/a |
| T-47 | 26 | v2 | **v2 only:** the page doesn't scroll while you're dragging on the radar, but it still scrolls normally when you swipe outside it. | | n/a | | n/a |
| T-48 | 26 | v2 | **v2 only:** complete a full edit with **only** the − and + steppers, without touching the radar. It works. | | n/a | | n/a |
| T-49 | 27 | v3 | **v3 only, entry:** "Set Weaver Wheel" (empty) or "Edit" (saved) opens **card 1, Emotional Reg**. Each card shows "N of 5" as text. Picking a value **does not** auto-advance. | (proposed, OQ-9) | n/a | n/a | |
| T-50 | 27 | v3 | **v3 only, navigation:** **Back** is disabled on card 1. The forward button reads **Skip** when the card's dimension is Not set and **Next** when it's set. Skip leaves it Not set. The current card's axis is highlighted with a thicker line and a bold label, not color alone. | | n/a | n/a | |
| T-51 | 27 | v3 | **v3 only, review:** after card 5, the forward button reads **Review**. The review lists all 5 with their values or "Not set", and tapping a row jumps to that card. | | n/a | n/a | |
| T-52 | 27 | v3 | **v3 only, jump:** in edit mode, tapping a radar axis label jumps to that dimension's card. Each label's tap target is at least 44×44px. | | n/a | n/a | |
| T-53 | 27 | v3 | **v3 only, partial save from any card:** on card 2, set Focus = 4 and tap Save in the sticky bar without going to Review. It saves (as in T-07) and the wizard closes to view mode. | (proposed, OQ-3) | n/a | n/a | |
| T-54 | 27 | v3 | **v3 only, exit:** Cancel or Escape mid-wizard with changes asks to confirm, then returns to view mode. Moving between cards adds no browser history entries: browser Back leaves the page, and when you return, the draft notice comes back. Resume reopens at **card 1** with the draft values. | | n/a | n/a | |

### J. Proto's round-1 interpretations (check that they match the stories)

These are choices Proto made where the stories left room. Pass each one if the build behaves as described. If it doesn't, fail it and say why. Don't fail an item just because you'd have made a different call. Note that in `results.md` instead.

| ID | Story | Interpretation → expected | Tag | v1 | v2 | v3 |
|---|---|---|---|---|---|---|
| P-1 | US-10 (steppers) | **v2 only:** pressing **−** on a dimension at **1** leaves it at 1, and pressing **−** on a **Not set** dimension leaves it Not set. In both cases nothing changes, no error appears, and no 0 shows up. **Clear is the only way back to Not set.** Pressing + from Not set gives 1. This matches US-10. | | n/a | | n/a |
| P-2 | US-6 | **Save stays tappable** (not disabled) when every dimension is Not set, so the T-08 error can appear. It must still write nothing. This is consistent with US-6's trigger. | (proposed, OQ-3) | | | |
| P-3 | US-3 | In edit mode the draft polygon is **always dashed**, even before the first change. US-3 only requires dashed while there are unsaved changes, so dashed before the first change is allowed. What must hold: view mode is solid and filled, and with unsaved changes the faint saved shape is still behind the dashed draft. | | | | |
| P-4 | — | "← Room" and "Room 12" are **placeholders**. Pass if "← Room" goes nowhere or is inert. Fail only if it navigates away **without** the T-14 confirm while there are unsaved changes. | | | | |
| P-5 | US-9 | **There's no desktop (1024px and wider) layout.** At 1024px the page may just be the phone layout centered. **Don't fail this.** All layout checks run at 360px and 430px only. | | | | |

## Seed coverage

| Seed | Items | Note |
|---|---|---|
| 1 | T-01 | |
| 2 | T-02 | |
| 3 | T-03, T-04, T-05 | **Split** into immediacy, dashed vs solid, and reduced motion |
| 4 | T-06 | |
| 5 | T-07 | |
| 6 | T-08, T-09 | **Split** into the empty wheel and clear-all on a saved wheel |
| 7 | T-10 | |
| 8 | T-12, T-13, T-14 | **Split** into Cancel, Escape, and in-page links |
| 9 | T-15, T-16 | **Split** into reload and the real-iPhone check |
| 10 | T-17 | |
| 11 | T-18 | |
| 12 | T-19, T-20 | **Split** into hiding the cache and Retry recovery |
| 13 | T-21 | |
| 14 | T-22 | |
| 15 | T-23 | |
| 16 | T-24, T-25, T-26 | **Split** into Start empty, Reset demo, and isolation between variations |
| 17 | T-29 | |
| 18 | T-30 | |
| 19 | T-31 | |
| 20 | T-32 | |
| 21 | T-34, T-35, T-36 | **Split** into no scroll, tap targets, and stacked rows |
| 22 | T-27, T-28 | **Split** into sheet closed and sheet open |
| 23 | T-38, T-39, T-40 | **Split** into the full flow, radiogroup (v1, v3), and spinbutton (v2) |
| 24 | T-41, T-42 | **Split** into values and the radar label plus live regions |
| 25 | T-43, T-44 | **Split** into the tie and the partial set |
| 26 | T-45, T-46, T-47, T-48 | **Split** into wedge hits, crowded center, scroll lock, and steppers only |
| 27 | T-49 to T-54 | **Split** into entry, navigation, review, jump, partial save, and exit |
| 28 | T-33 | |
| — | T-11, T-37 | Added from US-6 and US-9 acceptance items not covered by a seed |

No seed was dropped.
