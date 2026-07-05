import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { compile, renderManifestModule } from '@/core/compile'
import type { Manifest } from '@/types/manifest'

async function withCapturedConsoleError<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; messages: string[] }> {
  const original = console.error,
    messages: string[] = []

  console.error = (...args: unknown[]) => {
    messages.push(args.join(' '))
  }

  try {
    const result = await fn()
    return { result, messages }
  } finally {
    console.error = original
  }
}

describe('renderManifestModule', () => {
  test('emits one literal dynamic import per entry', () => {
    const source = renderManifestModule([
      { route: ['hello'], sourcePath: '/abs/commands/hello.ts', meta: null },
      {
        route: ['users', 'list'],
        sourcePath: '/abs/commands/users/list.ts',
        meta: { description: 'List users' },
      },
    ])

    expect(source).toContain(`import("/abs/commands/hello.ts")`)
    expect(source).toContain(`import("/abs/commands/users/list.ts")`)
    expect(source).toContain(`route: ["hello"]`)
    expect(source).toContain(`route: ["users","list"]`)
    expect(source).toContain(`"description":"List users"`)
    expect(source).toContain('export default manifest')
  })

  test('produces valid, importable TypeScript', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-render-manifest-'))

    writeFileSync(join(dir, 'cmd.ts'), `export default { run: () => {} }`)
    writeFileSync(
      join(dir, 'manifest.ts'),
      renderManifestModule([{ route: ['cmd'], sourcePath: join(dir, 'cmd.ts'), meta: null }]),
    )

    const loaded = ((await import(join(dir, 'manifest.ts'))) as { default: Manifest }).default

    expect(loaded.entries[0]?.route).toEqual(['cmd'])
    const command = await loaded.entries[0]?.importer()
    expect(typeof command?.default.run).toBe('function')
  })
})

describe('compile', () => {
  test('reports usage and exits 1 when no entry is given', async () => {
    const { result, messages } = await withCapturedConsoleError(() => compile([]))

    expect(result).toBe(1)
    expect(messages.some((m) => m.includes('Usage: concise-ti compile'))).toBe(true)
  })

  test('exits 1 when the entry file does not exist', async () => {
    const { result, messages } = await withCapturedConsoleError(() =>
      compile(['./does-not-exist.ts']),
    )

    expect(result).toBe(1)
    expect(messages.some((m) => m.includes('entry file not found'))).toBe(true)
  })

  test('propagates a failure from the entry (e.g. a bad commandsDir) without compiling', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-compile-nocommands-')),
      entry = join(dir, 'main.ts'),
      runtime = resolveRuntimeEntry()

    writeFileSync(
      entry,
      `import { run } from ${JSON.stringify(runtime)}\nvoid run({ name: 'x', version: '1.0.0', commandsDir: 'nowhere' }, import.meta)\n`,
    )

    const code = await compile([entry])

    expect(code).toBe(1)
  })

  test('compiles an entry unmodified for a commandsDir config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-compile-gen-')),
      entry = join(dir, 'main.ts'),
      runtime = resolveRuntimeEntry()

    mkdirSync(join(dir, 'commands'))
    writeFileSync(
      join(dir, 'commands', 'ping.ts'),
      `export default { meta: { description: 'ping' }, run: (ctx: any) => { ctx.io.write('pong') } }`,
    )
    writeFileSync(
      entry,
      `import { run } from ${JSON.stringify(runtime)}\nvoid run({ name: 'x', version: '1.0.0', commandsDir: 'commands' }, import.meta)\n`,
    )

    const outfile = join(dir, 'dist-nonexistent-target')

    const code = await compile([entry, '--outfile', outfile])

    expect(code).toBe(0)
  })

  test('skips discovery and compiles directly when config.manifest is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'concise-ti-compile-inline-')),
      entry = join(dir, 'main.ts'),
      runtime = resolveRuntimeEntry()

    writeFileSync(
      entry,
      [
        `import { command, defineManifest, run } from ${JSON.stringify(runtime)}`,
        `const hello = command({ run: (ctx: any) => { ctx.io.write('hi') } })`,
        `void run({ name: 'x', version: '1.0.0', manifest: defineManifest({ hello }) }, import.meta)`,
        '',
      ].join('\n'),
    )

    const outfile = join(dir, 'dist-inline')

    const code = await compile([entry, '--outfile', outfile])

    expect(code).toBe(0)
  })
})

function resolveRuntimeEntry(): string {
  return join(import.meta.dir, '..', '..', '..', 'src', 'index.ts')
}
