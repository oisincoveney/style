/**
 * Generates .codex/hooks.json — same hook structure as Claude but paths
 * point to .codex/hooks/ instead of .claude/hooks/.
 */

import type { DevConfig } from '../config.js'
import { generateClaudeSettings } from './claude-settings.js'

export function generateCodexHooks(config: DevConfig): unknown {
  const claude = generateClaudeSettings(config)
  // Re-path the commands from .claude/hooks/ to .codex/hooks/
  const retarget = (cmd: string): string => cmd.replace('.claude/', '.codex/')
  const hooks = claude.hooks
  for (const event of Object.keys(hooks) as Array<keyof typeof hooks>) {
    const entries = hooks[event]
    if (!entries) continue
    for (const entry of entries) {
      for (const hook of entry.hooks) {
        hook.command = retarget(hook.command)
      }
    }
  }
  return { hooks }
}
