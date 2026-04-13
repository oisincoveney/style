#!/usr/bin/env bash
# UserPromptSubmit hook — grounds Claude in actual project state by injecting
# dependency lists and commands into context at the start of every prompt.
set -euo pipefail

CONFIG_FILE=".dev.config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

language=$(jq -r '.language // empty' "$CONFIG_FILE")
dev=$(jq -r '.commands.dev // empty' "$CONFIG_FILE")
build=$(jq -r '.commands.build // empty' "$CONFIG_FILE")
test=$(jq -r '.commands.test // empty' "$CONFIG_FILE")
typecheck=$(jq -r '.commands.typecheck // empty' "$CONFIG_FILE")
lint=$(jq -r '.commands.lint // empty' "$CONFIG_FILE")

deps=""
case "$language" in
  typescript)
    if [[ -f package.json ]]; then
      deps=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys | join(", ")' package.json 2>/dev/null || echo "")
    fi
    ;;
  rust)
    if [[ -f Cargo.toml ]]; then
      deps=$(grep -E '^[a-z_][a-z0-9_-]*[[:space:]]*=' Cargo.toml 2>/dev/null | awk '{print $1}' | tr '\n' ', ' | sed 's/,$//' || echo "")
    fi
    ;;
  go)
    if [[ -f go.mod ]]; then
      deps=$(grep -oE '[a-z0-9./_-]+ v[0-9][^ ]*' go.mod 2>/dev/null | awk '{print $1}' | tr '\n' ', ' | sed 's/,$//' || echo "")
    fi
    ;;
esac

cat <<EOF
<project-context>
Language: $language
Commands:
  dev:       $dev
  build:     $build
  test:      $test
  typecheck: $typecheck
  lint:      $lint
Installed dependencies: $deps

Use the exact commands listed above. Do not guess alternatives.
Do not import packages that are not in the dependency list — the import validator hook will block fabricated imports.
</project-context>
EOF

exit 0
