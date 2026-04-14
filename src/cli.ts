#!/usr/bin/env node
import { runInit } from './init.js'
import { runUpdate } from './update.js'

const COMMANDS: Record<string, string> = {
  init:   'Initialize an opinionated dev environment in the current (or new) project',
  update: 'Re-sync generated files (hooks, docs, settings) from .dev.config.json',
  help:   'Show this help message',
}

function printHelp(): void {
  console.log(`
@oisincoveney/dev — Opinionated AI dev environment

Usage:
  npx @oisincoveney/dev <command>

Commands:
${Object.entries(COMMANDS)
  .map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`)
  .join('\n')}
`)
}

async function main(): Promise<void> {
  const command = process.argv[2]

  switch (command) {
    case 'init':
      await runInit()
      break
    case 'update':
      await runUpdate()
      break
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

void main()
