# prototypes/

Isolated, low-fidelity prototype loop for Weavr. Jah verified this loop on 25 Nov 2026 (America/Denver) and asked us to set it up here.

**The main app is never touched.** Work in this folder must not edit `src/`, `db/`, `e2e/`, `tests/`, the repo-root `scripts/`, `seed/`, app config, or deploy config. This folder is also distinct from the read-only rebuild references in `seed/previews/`.

Each variation is a self-contained static HTML file. No imports from the app (`src/`, `web/`, or otherwise). No build step. The file must open on a phone.

## The loop (7 steps)

1. **Daily Linear pick and user stories (WVR.dev).** A morning pass over Weaver Linear issues picks one or two that are ready and expands each into user stories in `stories.md`.
2. **Red team (Petey Pablo).** Petey pokes holes in the stories. WVR.dev revises them before anything goes to Proto. Findings live in `redteam.md`.
3. **Build (Proto Bot).** Proto builds two or three isolated, low-fidelity HTML variations under `v1/`, `v2/`, `v3/`. Each `index.html` is self-contained and phone-friendly.
4. **Test (Sequoia).** WVR.dev writes a checklist from the stories into `checklist.md`. Sequoia tests every variation against it and records results in `results.md`.
5. **Second round only if needed (maximum two rounds).** Proto revises from the results and Sequoia retests. Two rounds is the cap. `scripts/status.sh` refuses to set round 3 (non-zero exit).
6. **Team improvement chat after each round.** WVR.dev, Petey Pablo, Proto Bot, and Sequoia talk through how to improve the process. WVR.dev writes the plan in `improvements.md` and sends it to Jah to verify.
7. **Top variations sent to Jah.** WVR.dev sends phone-ready links, what each variation tests, and the test results. Jah's pick and notes go back into the Linear issue, and `STATUS.md` moves to `decided`.

## Folder layout

```
prototypes/
  README.md                 this file
  _template/                copied when a new issue starts
    STATUS.md
    stories.md
    redteam.md
    checklist.md
    results.md
    improvements.md
    v1/index.html           mobile-friendly placeholder
  scripts/status.sh         init a folder; set stage / round / waiting_on
  memory/<bot>/MEMORY.md    loop memory for WVR.dev, Petey Pablo, Proto Bot, Sequoia
  WVR-228/                  one folder per Linear issue (example name)
    STATUS.md
    stories.md
    redteam.md
    checklist.md
    results.md
    improvements.md
    v1/ index.html
    v2/ index.html
    v3/ index.html
```

Create an issue folder with the status script, not by editing `_template/` in place:

```bash
prototypes/scripts/status.sh init WVR-228
```

That copies `_template/` to `prototypes/WVR-228/`, fills in the issue id, and sets the default Linear link `https://linear.app/weaver-edu/issue/WVR-228`.

## Status file

`STATUS.md` starts with a YAML frontmatter block the script reads and writes:

| Field | Meaning |
|---|---|
| `issue_id` | Linear id, for example `WVR-228` |
| `issue_link` | URL of that issue |
| `stage` | `stories` \| `redteam` \| `build` \| `test` \| `improve` \| `sent` \| `decided` |
| `round` | `0`, `1`, or `2` only. `0` is stories and red team before the first build. `1` is the first build and test. `2` is the revision and retest. |
| `waiting_on` | Who the folder is waiting on (WVR.dev, Petey Pablo, Proto Bot, Sequoia, or Jah) |
| `updated` | Timestamp in America/Denver |

## Status script

```bash
# Start a new issue folder from _template
prototypes/scripts/status.sh init WVR-228
prototypes/scripts/status.sh init WVR-228 --link https://linear.app/weaver-edu/issue/WVR-228

# Update stage, round, and who we are waiting on (any subset)
prototypes/scripts/status.sh set WVR-228 --stage redteam --waiting-on "Petey Pablo"
prototypes/scripts/status.sh set WVR-228 --stage build --round 1 --waiting-on "Proto Bot"
prototypes/scripts/status.sh set WVR-228 --stage test --waiting-on Sequoia

# Print the current frontmatter
prototypes/scripts/status.sh show WVR-228

# Round 3 is refused and leaves the file unchanged (exit status is non-zero)
prototypes/scripts/status.sh set WVR-228 --round 3

# Tiny self-test (creates a temp copy, asserts init / set / round-3 refusal, then deletes it)
prototypes/scripts/status.sh self-test
```

## Viewing variations on a phone

This PR does not change deploy config and does not enable GitHub Pages.

What we checked on 25 Nov 2026 (America/Denver), against the public file `seed/previews/index.html` on `main`:

- **GitHub Pages is not enabled** on `jachiike-madubuko/wvr`.
- **A Vercel deploy of this app would not serve `prototypes/`.** The Next.js app lives at the repo root. There is no `public/` folder and no `vercel.json` that would map this directory. We left that alone.
- **`raw.githubusercontent.com`, jsDelivr, and statically.io all serve the HTML as `text/plain`**, so a phone browser will show source, not the page.
- **raw.githack.com returned 403** from this network (Cloudflare), so it is not a reliable default.

**Recommended way to send Jah a tappable link** (the repo is public, so a client-side HTML preview works without any deploy change):

```
https://html-preview.github.io/?url=https://github.com/jachiike-madubuko/wvr/blob/<branch>/prototypes/<issue-id>/v1/index.html
```

The classic `https://htmlpreview.github.io/?https://github.com/jachiike-madubuko/wvr/blob/<branch>/prototypes/<issue-id>/v1/index.html` also works. Push the variation to the issue branch first, then send that URL. After this scaffold lands, the template placeholder is:

```
https://html-preview.github.io/?url=https://github.com/jachiike-madubuko/wvr/blob/main/prototypes/_template/v1/index.html
```

**Local fallback** (same Wi-Fi, or a tunnel if you need a public URL before push):

```bash
python3 -m http.server 4173 --directory prototypes
```

Then open `http://<lan-ip>:4173/<issue-id>/v1/` on the phone. Prefer the preview URL above when sending links to Jah.
