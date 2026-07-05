import { existsSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

import { command } from '@/core/command'
import type { Context } from '@/types/context'
import { listDemoNames } from '../lib/init/github'
import { applyPackageJson, applyTemplate, isEmptyDir, type TemplateMode } from '../lib/init/template'

const MANIFEST_DEMO = 'hello-world-with-manifest'
const DISCOVERY_DEMO = 'hello-world'

const LOCATIONS = [
  'Add a CLI to the current project',
  'Create a new project folder',
] as const

const STYLES = [
  'Recommended: command auto-discovery — commands live in commands/',
  'Single-file, manifest-based configuration — everything in main.ts',
] as const

interface InitFlags {
  'from-demo'?: string
}

export default command<InitFlags>({
  meta: { description: 'Initialize a new concise-ti CLI, or add one to the current project' },
  flags: {
    'from-demo': {
      type: 'string',
      description: 'Skip the wizard and scaffold a new folder from a /demos template',
    },
  },
  run(ctx) {
    if (ctx.flags['from-demo']) return runFromDemo(ctx, ctx.flags['from-demo'])

    return runWizard(ctx)
  },
})

async function runFromDemo(ctx: Context<InitFlags>, demo: string): Promise<number> {
  const available = await listDemoNames()

  if (!available.includes(demo)) {
    ctx.io.writeError(`Unknown demo "${demo}". Available demos: ${available.join(', ')}`)
    return 1
  }

  const projectName = (await ctx.io.prompt(`Project name? (${demo})`)) || demo,
    targetDir = join(ctx.cwd, projectName)

  if (!isEmptyDir(targetDir)) {
    ctx.io.writeError(`Error: "${projectName}" already exists and is not empty.`)
    return 1
  }

  mkdirSync(targetDir, { recursive: true })
  ctx.io.write(`\nFetching "${demo}" from GitHub...`)

  await applyTemplate(demo, targetDir, 'new')
  applyPackageJson(targetDir, projectName)

  printSummary(ctx, projectName)
  return 0
}

async function runWizard(ctx: Context<InitFlags>): Promise<number> {
  ctx.io.write('\nA quick wizard to get a new CLI on its feet.\n')

  const location = await ctx.io.select('Where should this CLI live?', LOCATIONS)

  let targetDir = ctx.cwd
  let projectName = basename(ctx.cwd)
  let mode: TemplateMode = 'current'

  if (location === LOCATIONS[1]) {
    mode = 'new'
    projectName = (await ctx.io.prompt('Project name? (my-cli)')) || 'my-cli'
    targetDir = join(ctx.cwd, projectName)

    if (!isEmptyDir(targetDir)) {
      ctx.io.writeError(`Error: "${projectName}" already exists and is not empty.`)
      return 1
    }
  } else if (existsSync(join(targetDir, 'main.ts'))) {
    ctx.io.writeError(
      `Error: "${join(targetDir, 'main.ts')}" already exists. Remove or rename it before running init again.`,
    )
    return 1
  }

  const style = await ctx.io.select('Command style?', STYLES)
  const demo = style === STYLES[0] ? DISCOVERY_DEMO : MANIFEST_DEMO

  mkdirSync(targetDir, { recursive: true })
  ctx.io.write(`\nFetching "${demo}" from GitHub...`)

  await applyTemplate(demo, targetDir, mode)
  applyPackageJson(targetDir, projectName)

  printSummary(ctx, mode === 'new' ? projectName : undefined)
  return 0
}

function printSummary(ctx: Context<InitFlags>, projectDirToCd: string | undefined): void {
  ctx.io.write(ctx.io.color('\n✓ CLI scaffolded successfully!', 'green'))
  ctx.io.write('\nNext steps:')
  if (projectDirToCd) ctx.io.write(`  cd ${projectDirToCd}`)
  ctx.io.write('  bun install')
  ctx.io.write('  bun run cli hello World')
}
