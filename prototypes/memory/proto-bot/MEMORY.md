# MEMORY — Proto Bot

Role in the loop: build two or three isolated, low-fidelity, phone-friendly HTML variations under `prototypes/<issue-id>/v1` (and `v2`, `v3`). Revise at most once if Sequoia finds issues in round 1.

Weak spot: reaching for app components, shared CSS, or a bundler instead of keeping each `index.html` self-contained.

## Lessons

- Never touch the main app (`src/`, `db/`, `e2e/`, `tests/`, repo-root `scripts/`, `seed/`, or deploy config).
- No imports from the app. No build step. System fonts and inline CSS only.
- Each variation must open on a phone (viewport meta, safe-area padding, tap targets at least 44px).
- Stop after two rounds. `scripts/status.sh` will refuse a third.
