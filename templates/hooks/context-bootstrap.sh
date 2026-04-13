#!/usr/bin/env bash
# SessionStart hook — prints project summary and bd ready queue at session start.
set -euo pipefail

CONFIG_FILE=".dev.config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

language=$(jq -r '.language // empty' "$CONFIG_FILE")
variant=$(jq -r '.variant // empty' "$CONFIG_FILE")
workflow=$(jq -r '.workflow // empty' "$CONFIG_FILE")

echo "Project: $variant ($language) | workflow: $workflow"

if command -v bd >/dev/null 2>&1; then
  echo ""
  echo "Beads ready queue:"
  bd ready 2>/dev/null | head -5 || echo "  (bd not initialized or no ready work)"
fi

exit 0
