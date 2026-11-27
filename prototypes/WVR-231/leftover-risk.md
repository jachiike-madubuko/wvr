# Leftover risk: WVR-231 round 1

Written by Proto Bot, 2026-11-27 (America/Denver), at the round 1 build.

## Process gaps

- **No second red-team pass.** Petey reviewed Revision 1 (verdict: not ready). WVR.dev's Revision 2 addressed the four blockers, but nobody re-reviewed Revision 2 before this build.
- **No leftover-risk file came with the stories.** This file was added by Proto at build time. It is not a red-team sign-off.

## Product risks to watch in testing

1. **v2 destination preview and v3 item preview could read as equip, or as a move that already happened.**
   - v2 shows the Ocean look as a separate dashed card inside the request panel, labeled "Look preview only · not applied". It does not touch the avatar, the skin label, "Wearing", or "Today's work".
   - v3 draws a dashed outline on the avatar plus a "Preview only · not equipped" box. Clearing, Escape, or picking another item restores the seeded avatar. The "Equipped" tags never change.
   - Sequoia and Jah should still judge by eye whether either one reads as equip or as "already switched" (T-40, T-41).
2. **Fixture copy is proposed, not decided.** These are all fixtures from the Open questions, not product names or rules:
   - Student A, Teacher, Class (OQ-12)
   - Space, Ocean, Plants, and the other ring labels (OQ-2, from the W4 ring)
   - The four mnemonic lines (OQ-6, from W4)
   - "Today's work: Space packet" (OQ-9)
   - The request control returning right after a deny (OQ-8)
3. **Delay wording is stand-in only (OQ-13).**
   - The copy says "does not apply yet" and "comes later (stand-in timing, not decided)". It never says "next session" or "next block".
   - The Proto control "Trigger delayed transition (stand-in)" is prototype chrome, not a "switch now" product control.
4. **One-tap Approve/Deny with no reason field is prototype-only (OQ-3).** A logged reason may still be required in product.
5. **Revision 2 was not re-reviewed** (see Process gaps). Any slip in Revision 2 carried into this build unchecked.

## Not built (by design)

- Galaxy-map traversal, credit meters, earning items, equip/unequip
- Teacher force-switch, any "switch now" control
- Phone layouts, network calls

## Round 2 (v4), 2026-11-27

Eye checks still needed (Sequoia and Jah):

1. **Several items per slot must not read as try-on.** v4 bag tiles are plain cards, not controls. There is no equip, select, or preview action. Each slot shows "N owned · 1 equipped" plus the rule "Only one per slot is equipped at a time." Check that the Owned capes don't look like something to click and wear.
2. **The button-skin preview must not read as "already moved."** The Ocean look is only the background of the "Ask to move to Ocean" button, with a dark label chip (about 16:1 contrast, worst case). The avatar, skin label, and Today's work stay on Space. After a request, the button turns into a flat "Request sent · waiting" or "Approved, not applied yet" pill with no skin.
3. **New fixture copy (proposed, not decided):**
   - Two extra Social Cape copies: Gold, "Matched landmarks to their countries", and Teal, "Put a day of school in time order". The Red cape uses the W4 line, "Put spaceflight events in order".
   - Social Cape (Red) is now seeded as equipped, so the cape slot shows one Equipped. The stories seeded only Helmet and Badge.
   - Slot names come from the W4 catalog (head, back, body, feet, hand).
   - Colour variants are labels on the same catalog name, not new catalog names.
4. **No real equip control** (OQ-4 is still open). One-equipped-at-a-time is shown, not interactive.
