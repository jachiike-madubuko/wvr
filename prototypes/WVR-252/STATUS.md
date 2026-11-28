---
issue_id: WVR-252
issue_link: "https://linear.app/weaver-edu/issue/WVR-252/credit-gated-interest-switch-top-five-and-teacher-forced-switch"
stage: build
round: 2
waiting_on: WVR.dev
updated: "2026-11-28 09:19 MST (America/Denver)"
---

# WVR-252

Stage: build. Round: 2 (final). Waiting on: WVR.dev, to hand off to Sequoia for `results-r2.md`.

- Built from `stories.md` Revision 4 and `checklist-r2.md` (T-01 to T-51, desktop 1280×800). R1 `v1`–`v3` (rejected map builds) are kept byte-identical and are not graded.
- Variations: `v4/` list-first, `v5/` skin chips (v5-only extra), `v6/` one picker, reused at the force boundary (v6-only extra). No adjacency limit and no Galaxy map in the Student view. After the credit target is met, any of the other four in the top five can be requested, and the teacher still approves.
- Pre-push check: `NODE_PATH=/workspace/proto-bot/wvr231-test/node_modules node prototypes/WVR-252/check.cjs` (needs `playwright`; serves the files from a throwaway 127.0.0.1 server). It also confirms `v1`–`v3` are unchanged via `check-r1.cjs`. Exit status 0 gates the push.
- `proto-loop/scaffold` has no shared `check.cjs`, so the per-issue copy stays (generic part marked `[LIB]`).
- Fixture list and remaining risks: `leftover-risk.md` (fixtures at the top). Sequoia's results files (`results.md`, `results-r2.md`) are not touched by Proto.
- Branch `proto/WVR-252` is based on `proto-loop/scaffold` (666a5cf).

Allowed `stage` values: `stories`, `redteam`, `build`, `test`, `improve`, `sent`, `decided`.

Allowed `round` values: `0` (stories and red team), `1` (first build and test), `2` (revision and retest). Round 3 is refused by `scripts/status.sh`.

Update this file with:

```bash
prototypes/scripts/status.sh set WVR-252 --stage <stage> --round <0-2> --waiting-on "<name>"
```
