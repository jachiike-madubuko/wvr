# Test checklist — WVR-235

WVR.dev writes this from the revised stories. Sequoia runs it against every variation and files the outcomes in `results.md`.

## Setup

- Viewport: phone (390×844 or the device's actual CSS size). Also scan at 320px wide.
- How to open the variation: see `prototypes/README.md` (HTML preview URL, or local `python3 -m http.server`).
- Data / fixtures the HTML is allowed to hard-code:

## Checks

| ID | Story | Check | v1 | v2 | v3 |
|---|---|---|---|---|---|
| T-1 | US-1 | <observable behavior> | | | |
| T-2 | US-1 | Works on a phone-sized viewport without sideways scroll | | | |
| T-3 | Red team | <edge case Petey flagged> | | | |

Mark each cell `pass`, `fail`, or `n/a`. Add rows as needed. There may not be a `v3`.
