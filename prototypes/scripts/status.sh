#!/usr/bin/env bash
# Manage prototypes/<issue-id>/STATUS.md for the daily Weavr prototype loop.
# Round 3 and above are refused (non-zero exit, file unchanged).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${PROTOTYPES_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
TEMPLATE="${ROOT}/_template"
ALLOWED_STAGES="stories|redteam|build|test|improve|sent|decided"

usage() {
  cat <<'EOF'
Usage:
  prototypes/scripts/status.sh init <issue-id> [--link <url>]
  prototypes/scripts/status.sh set  <issue-id> [--stage <stage>] [--round <0-2>]
                                   [--waiting-on <name>] [--link <url>]
  prototypes/scripts/status.sh show <issue-id>
  prototypes/scripts/status.sh self-test

Stages: stories, redteam, build, test, improve, sent, decided
Rounds: 0, 1, or 2. Round 3 is refused.

Examples:
  prototypes/scripts/status.sh init WVR-228
  prototypes/scripts/status.sh set WVR-228 --stage redteam --waiting-on "Petey Pablo"
  prototypes/scripts/status.sh set WVR-228 --round 3    # refused, exit 1
  prototypes/scripts/status.sh self-test
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

normalize_issue_id() {
  local raw="${1:-}"
  local upper
  upper="$(printf '%s' "$raw" | tr '[:lower:]' '[:upper:]')"
  [[ "$upper" =~ ^WVR-[0-9]+$ ]] || die "issue id must look like WVR-228 (got: ${raw:-empty})"
  printf '%s' "$upper"
}

reserved_name() {
  case "$1" in
    _TEMPLATE|SCRIPTS|MEMORY|README.MD) return 0 ;;
    *) return 1 ;;
  esac
}

status_path() {
  printf '%s/%s/STATUS.md' "$ROOT" "$1"
}

now_denver() {
  TZ=America/Denver date '+%Y-%m-%d %H:%M %Z (America/Denver)'
}

yaml_quote() {
  local value="$1"
  if [[ "$value" == *['\":#']* || "$value" == *$'\n'* || "$value" =~ ^[[:space:]] || "$value" =~ [[:space:]]$ ]]; then
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    printf '"%s"' "$value"
  else
    printf '%s' "$value"
  fi
}

get_field() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || die "missing status file: $file"
  awk -v key="$key" '
    BEGIN { in_fm = 0 }
    /^---[[:space:]]*$/ {
      if (in_fm == 0) { in_fm = 1; next }
      else { exit }
    }
    in_fm == 1 {
      prefix = key ":"
      if (index($0, prefix) == 1) {
        val = substr($0, length(prefix) + 1)
        sub(/^[[:space:]]+/, "", val)
        if (val ~ /^".*"$/) {
          val = substr(val, 2, length(val) - 2)
        }
        print val
        exit
      }
    }
  ' "$file"
}

set_field() {
  local file="$1" key="$2" value="$3"
  local quoted tmp
  quoted="$(yaml_quote "$value")"
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$quoted" '
    BEGIN { in_fm = 0; seen = 0 }
    /^---[[:space:]]*$/ {
      if (in_fm == 0) { in_fm = 1; print; next }
      if (in_fm == 1) {
        if (seen == 0) print key ": " value
        in_fm = 2
        print
        next
      }
    }
    in_fm == 1 {
      prefix = key ":"
      if (index($0, prefix) == 1) {
        print key ": " value
        seen = 1
        next
      }
    }
    { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

touch_updated() {
  set_field "$1" "updated" "$(now_denver)"
}

cmd_init() {
  local id link dest file
  id="$(normalize_issue_id "${1:-}")"
  shift || true
  link="https://linear.app/weaver-edu/issue/${id}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --link)
        [[ $# -ge 2 ]] || die "--link needs a URL"
        link="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown init option: $1"
        ;;
    esac
  done
  reserved_name "$id" && die "$id is reserved and cannot be used as an issue folder"
  dest="${ROOT}/${id}"
  [[ -e "$dest" ]] && die "folder already exists: $dest"
  [[ -d "$TEMPLATE" ]] || die "missing template: $TEMPLATE"
  cp -R "$TEMPLATE" "$dest"
  # Fill the placeholder issue id in copied text files.
  find "$dest" -type f \( -name '*.md' -o -name '*.html' \) -print0 \
    | while IFS= read -r -d '' f; do
        sed -i "s/WVR-000/${id}/g" "$f"
      done
  file="$(status_path "$id")"
  set_field "$file" "issue_id" "$id"
  set_field "$file" "issue_link" "$link"
  set_field "$file" "stage" "stories"
  set_field "$file" "round" "0"
  set_field "$file" "waiting_on" "WVR.dev"
  touch_updated "$file"
  echo "created ${dest}"
}

cmd_set() {
  local id file stage="" round="" waiting="" link=""
  id="$(normalize_issue_id "${1:-}")"
  shift || true
  file="$(status_path "$id")"
  [[ -f "$file" ]] || die "no status file at $file (run: status.sh init $id)"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --stage)
        [[ $# -ge 2 ]] || die "--stage needs a value"
        stage="$2"
        shift 2
        ;;
      --round)
        [[ $# -ge 2 ]] || die "--round needs a value"
        round="$2"
        shift 2
        ;;
      --waiting-on)
        [[ $# -ge 2 ]] || die "--waiting-on needs a value"
        waiting="$2"
        shift 2
        ;;
      --link)
        [[ $# -ge 2 ]] || die "--link needs a URL"
        link="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown set option: $1"
        ;;
    esac
  done
  [[ -n "$stage" || -n "$round" || -n "$waiting" || -n "$link" ]] \
    || die "set needs at least one of --stage, --round, --waiting-on, --link"

  if [[ -n "$round" ]]; then
    if [[ ! "$round" =~ ^[0-9]+$ ]]; then
      die "round must be 0, 1, or 2 (got: $round)"
    fi
    if (( 10#$round >= 3 )); then
      echo "error: round ${round} is refused. The prototype loop allows at most two rounds (0, 1, or 2). STATUS.md was not changed." >&2
      exit 1
    fi
    if (( 10#$round < 0 )); then
      die "round must be 0, 1, or 2 (got: $round)"
    fi
    # After the numeric checks, only 0, 1, and 2 remain for single-digit input.
    # (10, 11, … are already refused by the >= 3 test.)
  fi

  if [[ -n "$stage" ]]; then
    [[ "$stage" =~ ^($ALLOWED_STAGES)$ ]] || die "stage must be one of: ${ALLOWED_STAGES//|/, } (got: $stage)"
  fi

  [[ -n "$stage" ]] && set_field "$file" "stage" "$stage"
  [[ -n "$round" ]] && set_field "$file" "round" "$round"
  [[ -n "$waiting" ]] && set_field "$file" "waiting_on" "$waiting"
  [[ -n "$link" ]] && set_field "$file" "issue_link" "$link"
  touch_updated "$file"
  cmd_show "$id"
}

cmd_show() {
  local id file
  id="$(normalize_issue_id "${1:-}")"
  file="$(status_path "$id")"
  [[ -f "$file" ]] || die "no status file at $file"
  awk '
    BEGIN { in_fm = 0 }
    /^---[[:space:]]*$/ {
      if (in_fm == 0) { in_fm = 1; print; next }
      else { print; exit }
    }
    in_fm == 1 { print }
  ' "$file"
}

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" != "$actual" ]]; then
    die "self-test failed (${label}): expected '${expected}', got '${actual}'"
  fi
}

cmd_self_test() {
  local tmp script rc current
  script="${SCRIPT_DIR}/status.sh"
  tmp="$(mktemp -d)"
  # Bake the path into the trap so `set -u` cannot trip when the local goes out of scope.
  trap 'rm -rf "'"$tmp"'"' RETURN
  cp -R "$TEMPLATE" "${tmp}/_template"
  # init
  PROTOTYPES_ROOT="$tmp" "$script" init WVR-999 >/dev/null
  [[ -f "${tmp}/WVR-999/STATUS.md" ]] || die "self-test failed: STATUS.md was not created"
  [[ -f "${tmp}/WVR-999/v1/index.html" ]] || die "self-test failed: v1/index.html was not copied"
  assert_eq "init issue_id" "WVR-999" "$(PROTOTYPES_ROOT="$tmp" "$script" show WVR-999 >/dev/null; get_field "${tmp}/WVR-999/STATUS.md" "issue_id")"
  assert_eq "init stage" "stories" "$(get_field "${tmp}/WVR-999/STATUS.md" "stage")"
  assert_eq "init round" "0" "$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  assert_eq "init waiting_on" "WVR.dev" "$(get_field "${tmp}/WVR-999/STATUS.md" "waiting_on")"
  grep -q "WVR-999" "${tmp}/WVR-999/v1/index.html" || die "self-test failed: placeholder id was not replaced in v1/index.html"
  # second init should fail
  rc=0
  PROTOTYPES_ROOT="$tmp" "$script" init WVR-999 >/dev/null 2>"${tmp}/init.err" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test failed: second init should have been refused"
  # set stage and waiting_on
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --stage redteam --waiting-on "Petey Pablo" >/dev/null
  assert_eq "set stage" "redteam" "$(get_field "${tmp}/WVR-999/STATUS.md" "stage")"
  assert_eq "set waiting_on" "Petey Pablo" "$(get_field "${tmp}/WVR-999/STATUS.md" "waiting_on")"
  # set round 1 then 2
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --round 1 --stage build >/dev/null
  assert_eq "round 1" "1" "$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --round 2 --stage test >/dev/null
  assert_eq "round 2" "2" "$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  # invalid stage should fail and leave values
  rc=0
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --stage not-a-stage >/dev/null 2>"${tmp}/stage.err" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test failed: invalid stage should have been refused"
  assert_eq "stage unchanged after invalid" "test" "$(get_field "${tmp}/WVR-999/STATUS.md" "stage")"
  # round 3 refused, file unchanged
  current="$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  rc=0
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --round 3 >"${tmp}/round3.out" 2>"${tmp}/round3.err" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test failed: round 3 should have exited non-zero"
  grep -q "refused" "${tmp}/round3.err" || die "self-test failed: round 3 error should mention 'refused'"
  assert_eq "round unchanged after 3" "$current" "$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  # also refuse 4
  rc=0
  PROTOTYPES_ROOT="$tmp" "$script" set WVR-999 --round 4 >/dev/null 2>"${tmp}/round4.err" || rc=$?
  [[ "$rc" -ne 0 ]] || die "self-test failed: round 4 should have been refused"
  assert_eq "round unchanged after 4" "2" "$(get_field "${tmp}/WVR-999/STATUS.md" "round")"
  echo "self-test passed"
}

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    init) cmd_init "$@" ;;
    set) cmd_set "$@" ;;
    show) cmd_show "$@" ;;
    self-test|--self-test) cmd_self_test "$@" ;;
    -h|--help|help|"") usage; [[ -n "$cmd" ]] || exit 1 ;;
    *) die "unknown command: $cmd (try --help)" ;;
  esac
}

main "$@"
