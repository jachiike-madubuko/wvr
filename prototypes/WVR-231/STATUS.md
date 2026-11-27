---
issue_id: WVR-231
issue_link: "https://linear.app/weaver-edu/issue/WVR-231/rebuild-phase-6-workflow-4-mnemonic-trophy-bag-avatar-rig-and-interest"
stage: build
round: 2
waiting_on: WVR.dev
updated: "2026-11-27 15:53 MST (America/Denver)"
---

# WVR-231

Stage: build. Round: 2 (final; status.sh refuses round 3). Waiting on: WVR.dev, to hand off to Sequoia.

- Round 2 adds one new variation, `v4/` (button skin + slots), from Jah's notes on v2 and v3. `v1/`–`v3/` are unchanged from round 1 (a60baee).
- v4: the destination skin is the background of the "Ask to move to …" button. The bag uses v3's memory-first tiles grouped by slot, with several owned items per slot (3 Social Capes) and exactly one Equipped per slot. The teacher modal is v2's side-by-side. Sequoia's polish is applied: Collapse visibly shortens the banner, the scheduled state is a flat non-pressable disabled pill, and no preview state survives a view switch.
- Pre-push check: `node prototypes/WVR-231/check.cjs` (needs `playwright`). It now covers v4 too and serves the files from a throwaway 127.0.0.1 server, because Chrome's file:// localStorage sometimes came back empty after a reload, which made the reload checks flaky. It passed on all four before the push.
- Leftover risks: `leftover-risk.md` (round 2 section).

Allowed `stage` values: `stories`, `redteam`, `build`, `test`, `improve`, `sent`, `decided`.

Allowed `round` values: `0` (stories and red team), `1` (first build and test), `2` (revision and retest). Round 3 is refused by `scripts/status.sh`.

Update this file with:

```bash
prototypes/scripts/status.sh set WVR-231 --stage <stage> --round <0-2> --waiting-on "<name>"
```
