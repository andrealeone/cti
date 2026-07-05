import { describe, test, expect } from 'bun:test'
import { command } from '@/core/command'
import type { CommandModule, CommandMeta } from '@/types/command'
import type { Context } from '@/types/context'

describe('command', () => {
  test('returns the module as-is', () => {
    const module: CommandModule = {
      meta: { description: 'Test command' },
      run: () => {},
    }

    const result = command(module)

    expect(result).toBe(module)
  })

  test('preserves meta properties', () => {
    const meta: CommandMeta = {
      description: 'Say hello',
      aliases: ['hi', 'greet'],
      examples: ['hello --name Alice'],
    }

    const module = command({
      meta,
      run: () => {},
    })

    expect(module.meta).toBe(meta)
    expect(module.meta?.description).toBe('Say hello')
    expect(module.meta?.aliases).toEqual(['hi', 'greet'])
    expect(module.meta?.examples).toEqual(['hello --name Alice'])
  })

  test('preserves flags definition', () => {
    const module = command({
      flags: {
        verbose: { type: 'boolean', short: 'v' },
        name: { type: 'string', default: 'World' },
      },
      run: () => {},
    })

    expect(module.flags).toBeDefined()
    expect(module.flags?.verbose).toMatchObject({ type: 'boolean', short: 'v' })
    expect(module.flags?.name).toMatchObject({ type: 'string', default: 'World' })
  })

  test('preserves args definition', () => {
    const module = command({
      args: [
        { name: 'target', required: true },
        { name: 'files', variadic: true },
      ],
      run: () => {},
    })

    expect(module.args).toBeDefined()
    expect(module.args?.length).toBe(2)
    expect(module.args?.[0]).toMatchObject({ name: 'target', required: true })
    expect(module.args?.[1]).toMatchObject({ name: 'files', variadic: true })
  })

  test('preserves the run function', () => {
    const runFn = () => {
      return 42
    }

    const module = command({
      run: runFn,
    })

    expect(module.run).toBe(runFn)
  })

  test('supports generic type parameter for flags', () => {
    interface MyFlags {
      verbose: boolean
      count: number
    }

    const module = command<MyFlags>({
      flags: {
        verbose: { type: 'boolean' },
        count: { type: 'number' },
      },
      run: (ctx) => {
        // Type assertions to verify flags are properly typed
        const v: boolean = ctx.flags.verbose
        const c: number = ctx.flags.count
        void v
        void c
      },
    })

    expect(module.run).toBeDefined()
  })

  test('handles minimal command definition', () => {
    const module = command({
      run: () => {},
    })

    expect(module.run).toBeDefined()
    expect(module.meta).toBeUndefined()
    expect(module.flags).toBeUndefined()
    expect(module.args).toBeUndefined()
  })

  test('handles async run function', async () => {
    const module = command({
      run: () => {
        return 0
      },
    })

    // Create a minimal valid context for testing
    const ctx: Context = {
      flags: {},
      positionals: [],
      route: [],
      cwd: process.cwd(),
      env: process.env,
      config: {
        name: 'test',
        commandsDir: '.',
        version: '1.0.0',
      },
      io: {
        isTTY: false,
        color: (text) => text,
        write: () => {},
        writeError: () => {},
        spinner: () => ({
          update: () => {},
          succeed: () => {},
          fail: () => {},
          stop: () => {},
        }),
        prompt: () => Promise.resolve(''),
        confirm: () => Promise.resolve(false),
        select: <T extends string>() => Promise.resolve('' as T),
      },
      logger: {
        level: 'info',
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    }

    const result = await module.run(ctx)
    expect(result).toBe(0)
  })

  test('preserves hidden and other meta flags', () => {
    const module = command({
      meta: {
        description: 'Internal command',
        hidden: true,
      },
      run: () => {},
    })

    expect(module.meta?.hidden).toBe(true)
  })

  test('returns the same reference (identity check)', () => {
    const module: CommandModule = {
      meta: { description: 'Test' },
      run: () => {},
    }

    const result1 = command(module)
    const result2 = command(module)

    expect(result1 === module).toBe(true)
    expect(result2 === module).toBe(true)
    expect(result1 === result2).toBe(true)
  })
})
