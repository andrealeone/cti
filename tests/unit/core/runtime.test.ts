import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { defineManifest, run } from '@/core/runtime'
import type { CommandModule } from '@/types/command'
import type { Manifest } from '@/types/manifest'
import type { Config } from '@/types/config'
import type { Context } from '@/types/context'

describe('defineManifest', () => {
  test('converts a flat route map into a Manifest', () => {
    const routes = {
      'hello': { run: () => {} },
      'users/list': { run: () => {} },
    } as Record<string, CommandModule>

    const manifest = defineManifest(routes)

    expect(manifest.entries.length).toBe(2)
    expect(manifest.entries.map((e) => e.route.join('/'))).toContain('hello')
    expect(manifest.entries.map((e) => e.route.join('/'))).toContain('users/list')
  })

  test('splits route keys on slashes', () => {
    const routes = {
      'api/v1/users': { run: () => {} },
    } as Record<string, CommandModule>

    const manifest = defineManifest(routes)
    const entry = manifest.entries[0]

    expect(entry.route).toEqual(['api', 'v1', 'users'])
  })

  test('sets sourcePath from the route key', () => {
    const routes = {
      'admin/settings': { run: () => {} },
    } as Record<string, CommandModule>

    const manifest = defineManifest(routes)
    const entry = manifest.entries[0]

    expect(entry.sourcePath).toBe('admin/settings.ts')
  })

  test('preserves the command module reference', async () => {
    const module: CommandModule = {
      meta: { description: 'Test' },
      run: () => 42,
    }

    const routes = { test: module } as Record<string, CommandModule>
    const manifest = defineManifest(routes)
    const loaded = await manifest.entries[0].importer()

    expect(loaded.default).toBe(module)
  })

  test('includes meta from the command module', () => {
    const module: CommandModule = {
      meta: { description: 'Say hello', aliases: ['hi'] },
      run: () => {},
    }

    const routes = { hello: module } as Record<string, CommandModule>
    const manifest = defineManifest(routes)
    const entry = manifest.entries[0]

    expect(entry.meta?.description).toBe('Say hello')
    expect(entry.meta?.aliases).toEqual(['hi'])
  })

  test('handles empty route map', () => {
    const manifest = defineManifest({})

    expect(manifest.entries.length).toBe(0)
  })

  test('preserves original object when accessing importer', async () => {
    const module: CommandModule = { run: () => {} }
    const routes = { test: module } as Record<string, CommandModule>

    const manifest = defineManifest(routes)
    const loaded1 = await manifest.entries[0].importer()
    const loaded2 = await manifest.entries[0].importer()

    expect(loaded1.default).toBe(loaded2.default)
    expect(loaded1.default).toBe(module)
  })
})

describe('run', () => {
  let _mockIo: any
  let _mockLogger: any
  let config: Config

  beforeEach(() => {
    _mockIo = {
      write: mock(() => {}),
      writeError: mock(() => {}),
      spinner: mock(() => ({})),
    }

    _mockLogger = {
      level: 'info',
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    }

    config = {
      name: 'test-cli',
      commandsDir: './commands',
      version: '1.0.0',
    }
  })

  function dispatch(manifest: Manifest, argv: string[]): Promise<number> {
    return run({ ...config, manifest }, undefined, argv)
  }

  function createTestManifest(
    route: string[],
    sourcePath: string,
    runFn: (ctx: Context) => Promise<any>,
  ): Manifest {
    return {
      entries: [
        {
          route,
          sourcePath,
          importer: () => Promise.resolve({ default: { run: runFn } }),
        },
      ],
    }
  }

  function createContextTest(assertion: (ctx: Context) => void): (ctx: Context) => Promise<number> {
    const mockFn = mock((ctx: Context) => {
      assertion(ctx)
      return 0
    })

    return (ctx: Context) => Promise.resolve(mockFn(ctx))
  }

  test('resolves and runs a matched command', async () => {
    const runFn = mock((ctx: Context) => {
      expect(ctx.route).toEqual(['hello'])
      return 0
    })

    const manifest = createTestManifest(['hello'], 'hello.ts', (ctx: Context) => {
      return Promise.resolve(runFn(ctx))
    })

    const result = await dispatch(manifest, ['hello'])

    expect(result).toBe(0)
    expect(runFn).toHaveBeenCalled()
  })

  test('returns 1 when command is not found', async () => {
    const manifest: Manifest = { entries: [] }

    const result = await dispatch(manifest, ['unknown'])

    expect(result).toBe(1)
  })

  test('defaults to help for empty argv', async () => {
    const manifest: Manifest = { entries: [] }

    const result = await dispatch(manifest, [])

    expect(result).toBe(0)
  })

  test('passes parsed flags to the command context', async () => {
    const runFn = mock((ctx: Context) => {
      expect(ctx.flags).toMatchObject({ verbose: true })
      return 0
    })

    const manifest: Manifest = {
      entries: [
        {
          route: ['cmd'],
          sourcePath: 'cmd.ts',
          importer: () =>
            Promise.resolve({
              default: {
                flags: { verbose: { type: 'boolean' } },
                run: runFn,
              },
            }),
        },
      ],
    }

    await dispatch(manifest, ['cmd', '--verbose'])
    expect(runFn).toHaveBeenCalled()
  })

  test('passes positional arguments to the command context', async () => {
    const runFn = mock((ctx: Context) => {
      expect(ctx.positionals).toEqual(['arg1', 'arg2'])
      return 0
    })

    const manifest = createTestManifest(['cmd'], 'cmd.ts', (ctx: Context) => {
      return Promise.resolve(runFn(ctx))
    })

    await dispatch(manifest, ['cmd', 'arg1', 'arg2'])
    expect(runFn).toHaveBeenCalled()
  })

  test('includes route in context', async () => {
    const manifest = createTestManifest(
      ['users', 'list'],
      'users/list.ts',
      createContextTest((ctx: Context) => {
        expect(ctx.route).toEqual(['users', 'list'])
      }),
    )

    await dispatch(manifest, ['users', 'list'])
  })

  test('includes config in context', async () => {
    const manifest = createTestManifest(
      ['cmd'],
      'cmd.ts',
      createContextTest((ctx: Context) => {
        expect(ctx.config).toBe(configWithManifest)
      }),
    )

    const configWithManifest: Config = { ...config, manifest }

    await run(configWithManifest, undefined, ['cmd'])
  })

  test('includes io and logger in context', async () => {
    const manifest = createTestManifest(
      ['cmd'],
      'cmd.ts',
      createContextTest((ctx: Context) => {
        expect(ctx.io).toBeDefined()
        expect(ctx.logger).toBeDefined()
        expect(ctx.io.write).toBeDefined()
        expect(ctx.logger.info).toBeDefined()
      }),
    )

    await dispatch(manifest, ['cmd'])
  })

  test('includes cwd in context', async () => {
    const manifest = createTestManifest(
      ['cmd'],
      'cmd.ts',
      createContextTest((ctx: Context) => {
        expect(typeof ctx.cwd).toBe('string')
        expect(ctx.cwd.length > 0).toBe(true)
      }),
    )

    await dispatch(manifest, ['cmd'])
  })

  test('includes environment variables in context', async () => {
    const manifest = createTestManifest(
      ['cmd'],
      'cmd.ts',
      createContextTest((ctx: Context) => {
        expect(ctx.env).toBeDefined()
        expect(typeof ctx.env).toBe('object')
      }),
    )

    await dispatch(manifest, ['cmd'])
  })

  test('handles command returning undefined', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['cmd'],
          sourcePath: 'cmd.ts',
          importer: () => Promise.resolve({ default: { run: async () => {} } }),
        },
      ],
    }

    const result = await dispatch(manifest, ['cmd'])

    expect(result).toBe(0)
  })

  test('handles command returning a number', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['cmd'],
          sourcePath: 'cmd.ts',
          importer: () =>
            Promise.resolve({ default: { run: (): Promise<number> => Promise.resolve(42) } }),
        },
      ],
    }

    const result = await dispatch(manifest, ['cmd'])

    expect(result).toBe(42)
  })

  test('handles command throwing an error', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['cmd'],
          sourcePath: 'cmd.ts',
          importer: () =>
            Promise.resolve({
              default: {
                run: (): Promise<never> => {
                  return Promise.reject(new Error('Command failed'))
                },
              },
            }),
        },
      ],
    }

    const result = await dispatch(manifest, ['cmd'])

    expect(result).toBe(1)
  })

  test('handles non-Error thrown values', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['cmd'],
          sourcePath: 'cmd.ts',
          importer: () =>
            Promise.resolve({
              default: {
                run: (): Promise<never> => {
                  return Promise.reject(new Error('string error'))
                },
              },
            }),
        },
      ],
    }

    const result = await dispatch(manifest, ['cmd'])

    expect(result).toBe(1)
  })

  test('resolves longest matching route', async () => {
    const listFn = mock((): Promise<number> => Promise.resolve(0)),
      usersFn = mock((): Promise<number> => Promise.resolve(1))

    const manifest: Manifest = {
      entries: [
        {
          route: ['users'],
          sourcePath: 'users.ts',
          importer: () => Promise.resolve({ default: { run: usersFn } }),
        },
        {
          route: ['users', 'list'],
          sourcePath: 'users/list.ts',
          importer: () => Promise.resolve({ default: { run: listFn } }),
        },
      ],
    }

    await dispatch(manifest, ['users', 'list', 'filter'])

    expect(listFn).toHaveBeenCalled()
    expect(usersFn).not.toHaveBeenCalled()
  })

  test('passes remaining argv as positionals after route', async () => {
    const runFn = mock((ctx: Context) => {
      expect(ctx.positionals).toEqual(['filter', 'active'])

      return 0
    })

    const manifest = createTestManifest(['users', 'list'], 'users/list.ts', (ctx: Context) => {
      return Promise.resolve(runFn(ctx))
    })

    await dispatch(manifest, ['users', 'list', 'filter', 'active'])

    expect(runFn).toHaveBeenCalled()
  })

  test('handles command with no flags defined', async () => {
    const runFn = mock((ctx: Context) => {
      expect(ctx.flags).toBeDefined()

      return 0
    })

    const manifest = createTestManifest(['cmd'], 'cmd.ts', (ctx: Context) =>
      Promise.resolve(runFn(ctx)),
    )

    const result = await dispatch(manifest, ['cmd', 'positional', 'arg'])

    expect(result).toBe(0)
    expect(runFn).toHaveBeenCalled()
  })
})

describe('default commands', () => {
  function baseConfig(overrides: Partial<Config> = {}): Config {
    return { name: 'test-cli', version: '1.0.0', ...overrides }
  }

  async function captureRun(
    config: Config,
    argv: string[],
  ): Promise<{ result: number; output: string[] }> {
    const original = process.stdout.write.bind(process.stdout),
      output: string[] = []

    process.stdout.write = (chunk: string) => {
      output.push(chunk)
      return true
    }

    try {
      const result = await run(config, undefined, argv)
      return { result, output }
    } finally {
      process.stdout.write = original
    }
  }

  test('help lists available commands with heading and branding', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['hello'],
          sourcePath: 'hello.ts',
          importer: () => Promise.resolve({ default: { run: () => 0 } }),
          meta: { description: 'Say hello' },
        },
      ],
    }

    const { result, output } = await captureRun(baseConfig({ manifest }), ['help'])

    expect(result).toBe(0)
    const text = output.join('')
    expect(text).toContain('test-cli 1.0.0 (built with concise-ti)')
    expect(text).toContain('hello')
    expect(text).toContain('Say hello')
    expect(text).toContain('help')
    expect(text).toContain('version')
  })

  test('help --json outputs structured data', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['hello'],
          sourcePath: 'hello.ts',
          importer: () => Promise.resolve({ default: { run: () => 0 } }),
          meta: { description: 'Say hello' },
        },
      ],
    }

    const { output } = await captureRun(baseConfig({ manifest }), ['help', '--json'])

    const parsed = JSON.parse(output.join('')) as {
      name: string
      version: string
      commands: { route: string }[]
    }

    expect(parsed.name).toBe('test-cli')
    expect(parsed.version).toBe('1.0.0')
    expect(parsed.commands.map((c) => c.route)).toContain('hello')
  })

  test('help omits hidden commands', async () => {
    const manifest: Manifest = {
      entries: [
        {
          route: ['secret'],
          sourcePath: 'secret.ts',
          importer: () => Promise.resolve({ default: { run: () => 0 } }),
          meta: { hidden: true },
        },
      ],
    }

    const { output } = await captureRun(baseConfig({ manifest }), ['help'])

    expect(output.join('')).not.toContain('secret')
  })

  test('version prints the heading', async () => {
    const manifest: Manifest = { entries: [] }

    const { result, output } = await captureRun(baseConfig({ manifest }), ['version'])

    expect(result).toBe(0)
    expect(output.join('').trim()).toBe('test-cli 1.0.0 (built with concise-ti)')
  })

  test('empty argv dispatches to help', async () => {
    const manifest: Manifest = { entries: [] }

    const { result, output } = await captureRun(baseConfig({ manifest }), [])

    expect(result).toBe(0)
    expect(output.join('')).toContain('built with concise-ti')
  })

  test('a manifest-defined help/version overrides the default', async () => {
    const customHelp = mock(() => 0)
    const manifest: Manifest = {
      entries: [
        {
          route: ['help'],
          sourcePath: 'help.ts',
          importer: () => Promise.resolve({ default: { run: customHelp } }),
        },
      ],
    }

    const result = await run({ ...baseConfig(), manifest }, undefined, ['help'])

    expect(result).toBe(0)
    expect(customHelp).toHaveBeenCalled()
  })

  test('config.skip removes a default command entirely', async () => {
    const manifest: Manifest = { entries: [] }

    const result = await run({ ...baseConfig(), manifest, skip: ['help'] }, undefined, ['help'])

    expect(result).toBe(1)
  })

  test('config.skip removes a user-defined command entirely', async () => {
    const customFn = mock(() => 0)
    const manifest: Manifest = {
      entries: [
        {
          route: ['dangerous'],
          sourcePath: 'dangerous.ts',
          importer: () => Promise.resolve({ default: { run: customFn } }),
        },
      ],
    }

    const result = await run({ ...baseConfig(), manifest, skip: ['dangerous'] }, undefined, [
      'dangerous',
    ])

    expect(result).toBe(1)
    expect(customFn).not.toHaveBeenCalled()
  })
})

describe('run (directory discovery)', () => {
  function withCapturedConsoleError<T>(fn: () => T): { result: T; messages: string[] } {
    const original = console.error,
      messages: string[] = []

    console.error = (...args: unknown[]) => {
      messages.push(args.join(' '))
    }

    try {
      return { result: fn(), messages }
    } finally {
      console.error = original
    }
  }

  test('discovers and runs a command from a real commandsDir next to importMeta.dir', async () => {
    const root = mkdtempSync(join(tmpdir(), 'concise-ti-runtime-discover-'))

    mkdirSync(join(root, 'commands'))

    writeFileSync(
      join(root, 'commands', 'hello.ts'),
      `export default { run: (ctx: any) => { ctx.io.write('hi'); return 0 } }`,
    )

    const config: Config = { name: 'test-cli', version: '1.0.0', commandsDir: 'commands' },
      result = await run(config, { dir: root }, ['hello'])

    expect(result).toBe(0)
  })

  test('returns 1 and reports an error when importMeta is missing and no manifest is set', async () => {
    const config: Config = { name: 'test-cli', version: '1.0.0', commandsDir: 'commands' },
      { result, messages } = withCapturedConsoleError(() => run(config, undefined, ['hello']))

    expect(await result).toBe(1)
    expect(messages.some((m) => m.includes('requires passing import.meta'))).toBe(true)
  })

  test('falls back to the parent directory when commandsDir is not found next to importMeta.dir', async () => {
    const root = mkdtempSync(join(tmpdir(), 'concise-ti-runtime-parent-'))

    mkdirSync(join(root, 'commands'))
    mkdirSync(join(root, 'sub'))

    writeFileSync(
      join(root, 'commands', 'hello.ts'),
      `export default { run: (ctx: any) => { ctx.io.write('parent-hi'); return 0 } }`,
    )

    const config: Config = { name: 'test-cli', version: '1.0.0', commandsDir: 'commands' },
      result = await run(config, { dir: join(root, 'sub') }, ['hello'])

    expect(result).toBe(0)
  })

  test('returns 1 and reports an error when discoverManifest fails to load a command', async () => {
    const root = mkdtempSync(join(tmpdir(), 'concise-ti-runtime-broken-'))

    mkdirSync(join(root, 'commands'))

    writeFileSync(
      join(root, 'commands', 'broken.ts'),
      `export default { this is not valid typescript`,
    )

    const config: Config = { name: 'test-cli', version: '1.0.0', commandsDir: 'commands' },
      captured: string[] = [],
      original = console.error

    console.error = (...args: unknown[]) => {
      captured.push(args.join(' '))
    }

    let result: number

    try {
      result = await run(config, { dir: root }, ['broken'])
    } finally {
      console.error = original
    }

    expect(result).toBe(1)
    expect(captured.some((m) => m.includes('failed to discover commands'))).toBe(true)
  })
})
