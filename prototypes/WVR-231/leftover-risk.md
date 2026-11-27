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
