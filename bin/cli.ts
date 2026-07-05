#!/usr/bin/env bun
import { compile } from '../src/core/compile.ts'

function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2)

  if (command === 'compile') return compile(rest)

  console.error(
    `Unknown command: ${command ?? '(none)'}\n\nUsage: concise-ti compile <entry.ts> [...bun build flags]`,
  )
  return Promise.resolve(1)
}

process.exitCode = await main()
