import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, relative, sep } from 'node:path'

import type { CommandModule } from '@/types/command'
import type { Manifest, ManifestEntry } from '@/types/manifest'

const COMMAND_FILE = /\.ts$/,
  TEST_FILE = /\.test\.ts$/

function walk(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)

    if (entry.isDirectory()) files.push(...walk(full))
    else if (entry.isFile() && COMMAND_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) {
      files.push(full)
    }
  }

  return files
}

function routeFor(commandsDir: string, file: string): string[] {
  const segments = relative(commandsDir, file).replace(COMMAND_FILE, '').split(sep)

  if (segments.at(-1) === 'index') segments.pop()

  return segments
}

/**
 * Build a Manifest by scanning a commands directory: every `.ts` file becomes a
 * route (slash path mirrors the file path, `index.ts` collapses into its parent
 * directory's route), and its default export is loaded as the CommandModule.
 *
 * This is the directory-scanning counterpart to `defineManifest`. The inline
 * map is handwritten and best for a handful of commands; this scales to many
 * commands without an ever-growing manifest literal.
 */
export async function discoverManifest(commandsDir: string): Promise<Manifest> {
  const entries: ManifestEntry[] = []

  for (const file of walk(commandsDir)) {
    const route = routeFor(commandsDir, file),
      loaded = (await import(pathToFileURL(file).href)) as { default: CommandModule }

    entries.push({
      route,
      sourcePath: file,
      importer: () => Promise.resolve(loaded),
      meta: loaded.default.meta,
    })
  }

  return { entries }
}
