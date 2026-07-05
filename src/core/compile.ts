import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

interface DiscoveredEntry {
  route: string[]
  sourcePath: string
  meta: unknown
}

type ExtractResult = { inline: true } | { inline: false; entries: DiscoveredEntry[] }

const GENERATED_MANIFEST_PATH = resolve(import.meta.dir, 'generated-manifest.ts'),
  PLACEHOLDER_MANIFEST = readFileSync(GENERATED_MANIFEST_PATH, 'utf8')

/**
 * Render a manifest module whose entries use literal-string dynamic `import()`.
 * `bun build --compile` can statically discover and embed a literal `import()`
 * argument, unlike the `readdirSync` + computed-path `import()` that
 * `discoverManifest` uses at runtime, which sees nothing inside a compiled
 * binary's virtual filesystem.
 */
export function renderManifestModule(entries: DiscoveredEntry[]): string {
  const importers = entries
    .map((entry, i) => `const importer${i} = () => import(${JSON.stringify(entry.sourcePath)})`)
    .join('\n')

  const rendered = entries
    .map(
      (entry, i) =>
        `  { route: ${JSON.stringify(entry.route)}, sourcePath: ${JSON.stringify(entry.sourcePath)}, importer: importer${i}, meta: ${JSON.stringify(entry.meta)} },`,
    )
    .join('\n')

  return `export const generated = true\n\n${importers}\n\nconst manifest = {\n  entries: [\n${rendered}\n  ],\n}\n\nexport default manifest\n`
}

function spawnBun(args: string[], env?: Record<string, string>): Promise<number> {
  const proc = Bun.spawn(['bun', ...args], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: env ? { ...process.env, ...env } : process.env,
  })

  return proc.exited
}

/** Runs the entry as a real subprocess with `CONCISE_TI_EXTRACT_MANIFEST` set,
 * so `run()` resolves the manifest (via `config.manifest` or discovery) and
 * reports it back as JSON instead of dispatching. This reads the entry's
 * `Config` without requiring it to be exported separately from the `run()`
 * call the entrypoint already makes. */
async function extractManifest(entryPath: string): Promise<ExtractResult | number> {
  const outPath = join(mkdtempSync(join(tmpdir(), 'concise-ti-extract-')), 'manifest.json')

  try {
    const code = await spawnBun(['run', entryPath], { CONCISE_TI_EXTRACT_MANIFEST: outPath })

    if (code !== 0) return code

    return JSON.parse(readFileSync(outPath, 'utf8')) as ExtractResult
  } finally {
    rmSync(outPath, { force: true })
  }
}

/**
 * `concise-ti compile <entry> [...bun build flags]`.
 *
 * `discoverManifest`'s `readdirSync` scan works fine under `bun run`, but
 * `bun build --compile` bundles the entry file before any user code runs, so
 * nothing triggered from inside `run()` at runtime can make the bundler embed
 * command files discovered later. This resolves the manifest once, up front,
 * by running the entry in a real (uncompiled) Bun process, then temporarily
 * overwrites the framework's own `generated-manifest.ts` placeholder with the
 * result before compiling the entry unchanged: `run()` imports that file
 * instead of scanning the filesystem when it detects it's inside a compiled
 * binary. The entrypoint itself never has to change.
 */
export async function compile(argv: string[]): Promise<number> {
  const [entryArg, ...buildArgs] = argv

  if (!entryArg) {
    console.error('Usage: concise-ti compile <entry.ts> [...bun build flags]')
    return 1
  }

  const entryPath = resolve(entryArg)

  if (!existsSync(entryPath)) {
    console.error(`Error: entry file not found: ${entryPath}`)
    return 1
  }

  const extracted = await extractManifest(entryPath)

  if (typeof extracted === 'number') return extracted

  if (extracted.inline) return spawnBun(['build', entryPath, '--compile', ...buildArgs])

  writeFileSync(GENERATED_MANIFEST_PATH, renderManifestModule(extracted.entries))

  try {
    return await spawnBun(['build', entryPath, '--compile', ...buildArgs])
  } finally {
    writeFileSync(GENERATED_MANIFEST_PATH, PLACEHOLDER_MANIFEST)
  }
}
