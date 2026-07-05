import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { command } from '@/core/command'
import type { Context } from '@/types/context'
import { version } from '../../package.json' with { type: 'json' }
import { ask, closePrompts, select } from '../lib/prompt'
import { downloadDemo, listDemoNames } from '../lib/github'
import {
  createPackageJson,
  renderPackageJson,
  withCliScript,
  withDependency,
  withFixedBuildScript,
  withName,
  type PackageJson,
} from '../lib/package-json'

const MANIFEST_DEMO = 'hello-world-with-manifest'
const DISCOVERY_DEMO = 'hello-world'

/** Downloads `demo` into a temp dir, then copies it into `targetDir`. When
 * `mode` is `'current'`, the template's own `package.json`/`readme.md` are
 * skipped: an existing project's `package.json` is patched, not replaced. */
async function applyTemplate(
  demo: string,
  targetDir: string,
  mode: 'new' | 'current',
): Promise<string[]> {
  const tmp = mkdtempSync(join(tmpdir(), 'concise-ti-init-'))

  try {
    const files = await downloadDemo(demo, tmp),
      skip = new Set(mode === 'current' ? ['package.json', 'readme.md'] : [])

    for (const relativePath of files) {
      if (skip.has(relativePath.toLowerCase())) continue

      const destination = join(targetDir, relativePath)

      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(join(tmp, relativePath), destination)
    }

    return files
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

function applyPackageJson(targetDir: string, projectName: string): void {
  const pkgPath = join(targetDir, 'package.json')

  let pkg: PackageJson = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson)
    : createPackageJson(projectName)

  pkg = withName(pkg, projectName)
  pkg = withCliScript(pkg)
  pkg = withDependency(pkg, 'concise-ti', `^${version}`)
  pkg = withFixedBuildScript(pkg)

  writeFileSync(pkgPath, renderPackageJson(pkg))
}

function isEmptyDir(dir: string): boolean {
  return !existsSync(dir) || readdirSync(dir).length === 0
}

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
  async run(ctx) {
    try {
      if (ctx.flags['from-demo']) return await runFromDemo(ctx, ctx.flags['from-demo'])

      return await runWizard(ctx)
    } finally {
      closePrompts()
    }
  },
})

async function runFromDemo(ctx: Context<InitFlags>, demo: string) {
  const available = await listDemoNames()

  if (!available.includes(demo)) {
    ctx.io.writeError(`Unknown demo "${demo}". Available demos: ${available.join(', ')}`)

    return 1
  }

  const projectName = await ask('Project name?', demo),
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

async function runWizard(ctx: Context<InitFlags>) {
  ctx.io.write(ctx.io.color('\n◆ concise-ti · init', 'cyan'))
  ctx.io.write('  A quick wizard to get a new CLI on its feet.\n')

  const location = await select('Where should this CLI live?', [
    { value: 'current', label: 'Add a CLI to the current project', hint: ctx.cwd },
    { value: 'new', label: 'Create a new project folder' },
  ] as const)

  let targetDir = ctx.cwd
  let projectName = basename(ctx.cwd)

  if (location === 'new') {
    projectName = await ask('Project name?', 'my-cli')
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

  const style = await select('Command style?', [
    {
      value: 'discovery',
      label: 'Recommended: command auto-discovery',
      hint: 'drop files into commands/',
    },
    {
      value: 'manifest',
      label: 'Single-file, manifest-based configuration',
      hint: 'everything in main.ts',
    },
  ] as const)

  const demo = style === 'discovery' ? DISCOVERY_DEMO : MANIFEST_DEMO

  mkdirSync(targetDir, { recursive: true })
  ctx.io.write(`\nFetching "${demo}" from GitHub...`)

  await applyTemplate(demo, targetDir, location)
  applyPackageJson(targetDir, projectName)

  printSummary(ctx, location === 'new' ? projectName : undefined)
  return 0
}

function printSummary(ctx: Context<InitFlags>, projectDirToCd: string | undefined): void {
  ctx.io.write(ctx.io.color('\n✓ CLI scaffolded successfully!', 'green'))
  ctx.io.write('\nNext steps:')
  if (projectDirToCd) ctx.io.write(`  cd ${projectDirToCd}`)
  ctx.io.write('  bun install')
  ctx.io.write('  bun run cli hello World')
}
