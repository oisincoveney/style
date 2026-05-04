---
name: destructive
description: Destructive command policy, approvals, co-author trailer ban
---

# Destructive Operations

Blocked by hooks. Never attempt without explicit user approval:
- `git reset --hard`
- `git push --force` / `git push -f`
- `git clean -f`
- `rm -rf`
- `DROP TABLE` / `DROP DATABASE`
- `npm publish` / `yarn publish` / `bun publish` / `pnpm publish`

User-authorized destructive ops: ask each occurrence, not once per session.

**No Co-Authored-By**: don't add `Co-Authored-By: Claude` to commits. Hook strips automatically.
