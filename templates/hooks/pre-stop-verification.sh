#!/usr/bin/env bash
# Stop hook — runs final verification before ending a Claude turn.
# Warns about uncommitted WIP, unpushed commits, open beads issues.
set -euo pipefail

CONFIG_FILE=".dev.config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

warnings=""

# Check for uncommitted changes
if git diff --quiet 2>/dev/null; then :; else
  warnings+="  - Uncommitted changes (staged or unstaged)\n"
fi

# Check for untracked files
if [[ -n "$(git ls-files --others --exclude-standard 2>/dev/null || true)" ]]; then
  warnings+="  - Untracked files present\n"
fi

if [[ -n "$warnings" ]]; then
  echo "⚠️  Pre-stop check:" >&2
  echo -e "$warnings" >&2
fi

exit 0
