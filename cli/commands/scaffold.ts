import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { command } from '@/core/command'
import type { Context } from '@/types/context'
import { detectCli } from '../lib/detect'
import { ask, closePrompts, confirm } from '../lib/prompt'
import { parseCommandString, renderCommandModule, routeToFilePath } from '../lib/scaffold-parse'

export default command({
  meta: { description: 'Generate a new command file for a discovery-based CLI' },
  async run(ctx) {
    try {
      return await runScaffold(ctx)
    } finally {
      closePrompts()
    }
  },
})

async function runScaffold(ctx: Context): Promise<number> {
  const detected = detectCli(ctx.cwd)

  if (!detected) {
    ctx.io.writeError(
      'Error: could not find a concise-ti entrypoint (main.ts) in this project. Run `concise-ti init` first.',
    )
    return 1
  }

  if (detected.kind === 'manifest') {
    ctx.io.writeError(
      `Error: scaffolding isn't supported for manifest-based CLIs. "${detected.entryPath}" defines its commands inline via defineManifest — add the new command there directly.`,
    )
    return 1
  }

  ctx.io.write(ctx.io.color('\n◆ concise-ti · scaffold', 'cyan'))
  ctx.io.write('  Generate a new command file for this discovery-based CLI.\n')

  const commandString = await ask(
    'What should the command look like? (e.g. "cli tag add <name> --force")',
  )

  let parsed: ReturnType<typeof parseCommandString>
  try {
    parsed = parseCommandString(commandString)
  } catch (error) {
    ctx.io.writeError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }

  const description = await ask('Command description?')

  const relativePath = routeToFilePath(parsed.route)
  const filePath = join(detected.commandsDir!, relativePath)

  printOverview(ctx, parsed, description, filePath)

  const proceed = await confirm('Create this command?', true)
  if (!proceed) {
    ctx.io.write('Aborted, nothing was written.')
    return 0
  }

  if (existsSync(filePath)) {
    const overwrite = await confirm(`"${relativePath}" already exists. Overwrite?`, false)
    if (!overwrite) {
      ctx.io.write('Aborted, nothing was written.')
      return 0
    }
  }

  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, renderCommandModule(parsed, description))

  ctx.io.write(ctx.io.color(`\n✓ Created ${relativePath}`, 'green'))
  return 0
}

function printOverview(
  ctx: Context,
  parsed: ReturnType<typeof parseCommandString>,
  description: string,
  filePath: string,
): void {
  ctx.io.write('')
  ctx.io.write(ctx.io.color('Overview', 'cyan'))
  ctx.io.write(`  Route:       ${parsed.route.join(' ')}`)
  ctx.io.write(`  Description: ${description}`)
  ctx.io.write(
    `  Args:        ${parsed.args.length ? parsed.args.map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`)).join(' ') : '(none)'}`,
  )
  ctx.io.write(
    `  Flags:       ${parsed.flags.length ? parsed.flags.map((f) => `--${f.name} (${f.type})`).join(', ') : '(none)'}`,
  )
  ctx.io.write(`  File:        ${filePath}`)
  ctx.io.write('')
}
