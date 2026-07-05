import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { resolveCommandsDir } from '@/core/runtime'

/**
 * Best-effort detection of the concise-ti CLI in the current project, for
 * `concise-ti scaffold`. There's no AST tooling in this dependency-free
 * codebase, so this is a regex heuristic over the entrypoint's source, not a
 * real static analysis — good enough to tell manifest-based from
 * discovery-based CLIs written the conventional way (see
 * docs/guides/cli/scaffolding-commands.md).
 */

export interface DetectedCli {
  entryPath: string
  entryDir: string
  kind: 'manifest' | 'discovery'
  /** Only set for `kind: 'discovery'`; resolved the same way `run()` resolves it. */
  commandsDir?: string
}

const ENTRY_CANDIDATES = ['main.ts']

function findEntryFromPackageJson(cwd: string): string | undefined {
  const pkgPath = join(cwd, 'package.json')

  if (!existsSync(pkgPath)) return undefined

  let pkg: { main?: string; scripts?: Record<string, string> }

  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as typeof pkg
  } catch {
    return undefined
  }

  const candidates = [pkg.main, pkg.scripts?.cli, pkg.scripts?.dev]

  for (const candidate of candidates) {
    if (!candidate) continue

    const match = /([\w./-]+\.ts)/.exec(candidate)
    if (!match) continue

    const resolved = resolve(cwd, match[1])
    if (existsSync(resolved)) return resolved
  }

  return undefined
}

/** Finds the project's concise-ti entrypoint: `main.ts` in `cwd`, else inferred from `package.json`. */
export function findEntrypoint(cwd: string): string | undefined {
  for (const candidate of ENTRY_CANDIDATES) {
    const resolved = join(cwd, candidate)
    if (existsSync(resolved)) return resolved
  }

  return findEntryFromPackageJson(cwd)
}

const MANIFEST_PATTERN = /\bmanifest\s*:/
const COMMANDS_DIR_PATTERN = /commandsDir\s*:\s*['"]([^'"]+)['"]/

/** Classifies the project's CLI as manifest- or discovery-based by scanning its entrypoint. */
export function detectCli(cwd: string): DetectedCli | undefined {
  const entryPath = findEntrypoint(cwd)
  if (!entryPath) return undefined

  const source = readFileSync(entryPath, 'utf8')
  const entryDir = dirname(entryPath)

  if (MANIFEST_PATTERN.test(source)) return { entryPath, entryDir, kind: 'manifest' }

  const commandsDirLiteral = COMMANDS_DIR_PATTERN.exec(source)?.[1] ?? 'commands'

  return {
    entryPath,
    entryDir,
    kind: 'discovery',
    commandsDir: resolveCommandsDir(entryDir, commandsDirLiteral),
  }
}
