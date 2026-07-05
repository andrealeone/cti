import type { ParsedCommand } from './parse'

/** `commands/tag/add.ts` for route `['tag', 'add']`. */
export function routeToFilePath(route: string[]): string {
  return `${route.join('/')}.ts`
}

/** Renders the boilerplate for a `ParsedCommand`: always an empty `run(ctx) {}` —
 * `scaffold` writes the declared shape, never guesses at behavior. */
export function renderCommandModule(parsed: ParsedCommand, description: string): string {
  const lines = ["import { command } from 'concise-ti'", '', 'export default command({']

  lines.push(`  meta: { description: ${JSON.stringify(description)} },`)

  if (parsed.flags.length > 0) {
    lines.push('  flags: {')
    // Property keys are always quoted (not bare identifiers): flag names commonly
    // contain hyphens (`--dry-run`), which aren't valid as bare object keys.
    for (const flag of parsed.flags)
      lines.push(`    ${JSON.stringify(flag.name)}: { type: ${JSON.stringify(flag.type)} },`)
    lines.push('  },')
  }

  if (parsed.args.length > 0) {
    lines.push('  args: [')
    for (const arg of parsed.args)
      lines.push(`    { name: ${JSON.stringify(arg.name)}, required: ${arg.required} },`)
    lines.push('  ],')
  }

  lines.push('  run(ctx) {},', '})', '')

  return lines.join('\n')
}
