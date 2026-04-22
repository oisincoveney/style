---
name: destructive
description: Destructive command policy, approvals, co-author trailer ban
---

# Destructive Operations

The following are blocked by hooks. Never attempt them without explicit user approval:
- `git reset --hard`
- `git push --force` / `git push -f`
- `git clean -f`
- `rm -rf`
- `DROP TABLE` / `DROP DATABASE`
- `npm publish` / `yarn publish` / `bun publish` / `pnpm publish`

For destructive operations the user has explicitly authorized, ask before each occurrence, not once for a session.

**No Co-Authored-By**: Do not add `Co-Authored-By: Claude` to commit messages. Stripped automatically by hook.
