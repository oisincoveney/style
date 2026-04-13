/**
 * Generates .claude/settings.json — hooks + permissions + mcpServers.
 */

import type { DevConfig } from '../config.js'

interface HookCommand {
  type: 'command'
  command: string
  timeout?: number
}

interface Hook {
  matcher?: string
  hooks: HookCommand[]
}

interface ClaudeSettings {
  hooks: {
    UserPromptSubmit?: Hook[]
    PreToolUse?: Hook[]
    PostToolUse?: Hook[]
    SessionStart?: Hook[]
    Stop?: Hook[]
  }
  permissions: {
    mode: string
    rules: Array<{
      tool: string
      decision: 'deny' | 'allow' | 'ask'
      if?: string
      reason: string
    }>
  }
  mcpServers?: Record<string, unknown>
}

export function generateClaudeSettings(config: DevConfig): ClaudeSettings {
  const settings: ClaudeSettings = {
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/context-bootstrap.sh',
              timeout: 10,
            },
          ],
        },
      ],
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/context-injector.sh',
              timeout: 5,
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/import-validator.sh',
              timeout: 10,
            },
            {
              type: 'command',
              command: '.claude/hooks/ai-antipattern-guard.sh',
              timeout: 10,
            },
          ],
        },
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/destructive-command-guard.sh',
              timeout: 5,
            },
            {
              type: 'command',
              command: '.claude/hooks/block-coauthor.sh',
              timeout: 5,
            },
          ],
        },
        {
          matcher: 'TodoWrite',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/block-todowrite.sh',
              timeout: 5,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/post-edit-check.sh',
              timeout: 60,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: '.claude/hooks/pre-stop-verification.sh',
              timeout: 30,
            },
          ],
        },
      ],
    },
    permissions: {
      mode: 'default',
      rules: [
        {
          tool: 'Bash',
          decision: 'deny',
          if: 'Bash(rm -rf|git reset --hard|git push --force|git push -f )',
          reason: 'Destructive commands require explicit user approval',
        },
        {
          tool: 'Read',
          decision: 'allow',
          reason: 'Read-only file access',
        },
        {
          tool: 'Glob',
          decision: 'allow',
          reason: 'Read-only search',
        },
        {
          tool: 'Grep',
          decision: 'allow',
          reason: 'Read-only search',
        },
        {
          tool: 'Bash',
          decision: 'allow',
          if: `Bash(${config.commands.typecheck}|${config.commands.lint}|${config.commands.test}|git status|git diff|git log|bd *)`,
          reason: 'Safe verification and task tracking',
        },
        {
          tool: 'Bash',
          decision: 'ask',
          if: 'Bash(git commit*|git push*)',
          reason: 'Git operations require review',
        },
        {
          tool: 'Edit',
          decision: 'ask',
          reason: 'Code changes require approval',
        },
        {
          tool: 'Write',
          decision: 'ask',
          reason: 'File creation requires approval',
        },
      ],
    },
  }

  return settings
}
