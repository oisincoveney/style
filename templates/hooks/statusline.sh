#!/usr/bin/env bash
# statusLine command — rendered in the Claude Code UI, zero token cost.
# One line: <variant> · <workflow> · branch · ready count
set -euo pipefail

CONFIG_FILE=".dev.config.json"

parts=()
if [[ -f "$CONFIG_FILE" ]]; then
  variant=$(jq -r '.variant // empty' "$CONFIG_FILE" 2>/dev/null || true)
  workflow=$(jq -r '.workflow // empty' "$CONFIG_FILE" 2>/dev/null || true)
  [[ -n "$variant" ]] && parts+=("$variant")
  [[ -n "$workflow" && "$workflow" != "none" ]] && parts+=("$workflow")
fi

branch=$(git branch --show-current 2>/dev/null || true)
[[ -n "$branch" ]] && parts+=("⎇ $branch")

if command -v bd >/dev/null 2>&1; then
  ready_count=$(bd ready 2>/dev/null | grep -c '^' || true)
  if [[ -n "$ready_count" && "$ready_count" != "0" ]]; then
    parts+=("ready:$ready_count")
  fi
fi

IFS=" · "
printf '%s\n' "${parts[*]}"
