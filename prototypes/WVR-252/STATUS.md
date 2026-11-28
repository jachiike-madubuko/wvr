---
issue_id: WVR-252
issue_link: "https://linear.app/weaver-edu/issue/WVR-252/credit-gated-galaxy-traversal-and-teacher-forced-switch-wvr-231"
stage: build
round: 1
waiting_on: WVR.dev
updated: "2026-11-27 17:59 MST (America/Denver)"
---

# WVR-252

Stage: build. Round: 1. Waiting on: WVR.dev, to hand off to Sequoia.

- Built from `stories.md` Revision 2 (2026-11-27). `checklist.md` has T-01 to T-44 (desktop, 1280×800).
- Variations: `v1/` gate-first, `v2/` decision-point preview, `v3/` upcoming pick. Each `index.html` is self-contained (inline CSS/JS, no network).
- Pre-push check: `node prototypes/WVR-252/check.cjs` (needs `playwright`; `NODE_PATH=/workspace/proto-bot/wvr231-test/node_modules`). Serves the files from a throwaway 127.0.0.1 server (same file:// localStorage lesson as WVR-231). It passed on all three before the push.
- Leftover risks: `leftover-risk.md`. `results.md` is still the blank template for Sequoia.
- Branch is based on `proto-loop/scaffold` (666a5cf), not on `proto/WVR-231`, so this folder stays isolated.

Allowed `stage` values: `stories`, `redteam`, `build`, `test`, `improve`, `sent`, `decided`.

Allowed `round` values: `0` (stories and red team), `1` (first build and test), `2` (revision and retest). Round 3 is refused by `scripts/status.sh`.

Update this file with:

```bash
prototypes/scripts/status.sh set WVR-252 --stage <stage> --round <0-2> --waiting-on "<name>"
```
