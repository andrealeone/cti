---
name: start-building-with-concise-ti
description: >-
  Use when scaffolding a brand-new CLI on concise-ti, the Bun-native TypeScript CLI framework
  — command files, entrypoint wiring (defineManifest/discoverManifest), flags/positionals,
  commands directory structure, ctx.io (color, spinner, prompt, confirm, select), and
  concise-ti's testing/error-handling conventions. For porting an existing CLI, use migrate-to-concise-ti
  instead. Not for explaining or pitching concise-ti; use about-concise-ti for that.
---

# Starting a CLI with concise-ti

concise-ti is a Bun-native TypeScript framework for building CLIs out of plain objects: no classes, no decorators, no code generation. This skill is the complete, self-contained API contract: everything needed to scaffold a new concise-ti project from an empty directory.

## The mental model

A concise-ti CLI has exactly three moving parts:

1. **Command modules**: plain objects (`CommandModule`) with `meta`, `flags`, `args`, and a `run(ctx)` handler.
2. **A manifest**: maps route strings (e.g. `'db/migrate'`) to command modules, built either inline (`defineManifest`) or by scanning a directory (`discoverManifest`). Assign it to `config.manifest`, or leave it unset and let `run()` discover one from `config.commandsDir`.
3. **The runtime**: `run(config, importMeta?)` resolves argv against the manifest using longest-prefix match, lazily loads the matched command, parses/coerces its flags, builds a `Context`, and invokes the command's `run()`. It returns the process exit code.

Everything else (color output, spinners, prompts, logging) hangs off the `Context` object passed into every handler.

Import everything from the package root:

```typescript
import { command, defineManifest, discoverManifest, run } from 'concise-ti'
import type { Config, Context, Io, Logger, Manifest, CommandModule } from 'concise-ti'
```

## Choosing a project shape

Two valid shapes; pick based on command count, and don't mix them without reason.

**Small CLI (a handful of commands): inline manifest, no commands directory:**

```
my-cli/
├── main.ts          # entrypoint: defines commands inline, builds config.manifest with defineManifest, calls run
├── package.json
└── tsconfig.json
```

Every command is a local variable, composed with `defineManifest({ deploy, rollback, status })` and assigned to `config.manifest`.

```typescript
import { command, defineManifest, run } from 'concise-ti'

const hello = command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    ctx.io.write(`Hello, ${ctx.positionals[0] ?? 'World'}!`)
  },
})

void run({ name: 'my-cli', version: '1.0.0', manifest: defineManifest({ hello }) })
```

**Larger CLI (many commands): directory-scanned manifest:**

```
my-cli/
├── main.ts           # entrypoint: run(config, import.meta) auto-discovers commands/
├── state.ts          # shared helpers/state, NOT a command (no default CommandModule export)
├── commands/
│   ├── add.ts             # → my-cli add
│   ├── list.ts             # → my-cli list
│   └── db/
│       └── migrate.ts      # → my-cli db migrate
├── package.json
└── tsconfig.json
```

The entrypoint calls `run(config, import.meta)` with no `config.manifest` set, so `run()` discovers commands from `config.commandsDir` (default `'commands'`, resolved relative to `import.meta.dir`). Each file under the commands directory exports a default `CommandModule` built with the `command()` helper:

```typescript
import { run } from 'concise-ti'

void run({ name: 'my-cli', commandsDir: 'commands', version: '1.0.0' }, import.meta)
```

`commandsDir` is just a config value; name the directory whatever fits the project (`'lib'`, `'cmd'`, etc.), it does not have to be literally `commands`.

**Routing rule:** every `.ts` file under the commands directory becomes a route that mirrors its file path (`commands/db/migrate.ts` → `db migrate`); a file named `index.ts` collapses into its parent's route (`commands/db/index.ts` → `db`); files matching `*.test.ts` are skipped and never become routes.

You can also call `discoverManifest(commandsDir)` yourself and assign the result to `config.manifest`, which is useful if you want to inspect or modify entries before dispatch. Either way, a `Manifest` ends up on `config.manifest`.

## Config

```typescript
interface Config {
  name: string
  version: string
  commandsDir?: string
  targets?: string[]
  bin?: string
  manifest?: Manifest
}
```

There's no enforced loader; build it however suits the project. It's available to every command as `ctx.config`. Set `manifest` directly for the inline shape, or leave it unset and pass `import.meta` to `run()` so it can discover one from `commandsDir` for the directory-scanned shape. If `bin` is omitted, it defaults to `name`.

## Writing a command

Prefer the `command()` helper over a bare object literal with `satisfies CommandModule`; it gives the same type inference with less ceremony:

```typescript
import { command } from 'concise-ti'

export default command({
  meta: {
    description: 'Deploy application to an environment',
    examples: ['my-cli deploy', 'my-cli deploy --env=prod --force'],
  },
  flags: {
    env: { type: 'string', default: 'staging', description: 'Target environment' },
    force: { type: 'boolean', short: 'f', description: 'Skip confirmation' },
  },
  run(ctx) {
    const env = ctx.flags.env as string
    // ...
  },
})
```

`meta`, `flags`, and `args` are all optional; the minimal command is just `command({ run(ctx) { ... } })`.

### CommandMeta

```typescript
interface CommandMeta {
  description?: string
  aliases?: readonly string[]
  hidden?: boolean
  examples?: readonly string[]
}
```

### Flags (`FlagSpec`)

```typescript
interface FlagSpec {
  type: 'string' | 'boolean' | 'number'
  short?: string
  description?: string
  default?: string | boolean | number
  required?: boolean
  multiple?: boolean
  choices?: readonly string[]
  validate?: (value: unknown) => true | string
}
```

Flags are parsed via Node's `util.parseArgs` under the hood and coerced to their declared type; an invalid number throws. Numeric defaults are stringified internally for `parseArgs` and coerced back, so you don't need to think about that; just declare `type: 'number'` with a numeric `default`.

### Positionals (`ArgSpec`, declarative and currently informational)

```typescript
interface ArgSpec {
  name: string
  description?: string
  required?: boolean
  variadic?: boolean
  validate?: (value: string) => true | string
}
```

In practice, positionals arrive as a plain `string[]` on `ctx.positionals` regardless of whether `args` is declared. Access them by index (`ctx.positionals[0]`) and validate yourself in `run()`. A missing positional is just `undefined`, not an error thrown for you, so always validate before using it.

### Type-safe flags via generics

Always type the handler's `Context` generic with your flags shape; without it, `ctx.flags.whatever` is `any` and arithmetic/boolean checks can fail silently at runtime:

```typescript
interface DeployFlags {
  env: string
  force: boolean
}

export default command<DeployFlags>({
  flags: {
    env: { type: 'string', default: 'staging' },
    force: { type: 'boolean' },
  },
  run(ctx) {
    const env = ctx.flags.env // typed string, not any
    if (ctx.flags.force) {
      /* typed boolean */
    }
  },
})
```

## The Context object

```typescript
interface Context<F = Record<string, unknown>> {
  flags: F
  positionals: string[]
  route: string[]
  cwd: string
  env: Record<string, string | undefined>
  config: Config
  io: Io
  logger: Logger
}
```

This is the only argument a handler receives; everything the command needs comes through it.

## The I/O interface: mind the spelling

```typescript
interface Io {
  isTTY: boolean
  color: (text: string, color: Color) => string
  write: (text: string) => void
  writeError: (text: string) => void
  spinner: (text: string) => SpinnerHandle
  prompt: (question: string) => Promise<string>
  confirm: (question: string, fallback?: boolean) => Promise<boolean>
  select: <T extends string>(question: string, choices: readonly T[]) => Promise<T>
}

type Color = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'gray'
```

**Use American spelling: `ctx.io.color(...)` and `Color`, not `colour`/`Colour`.** If you encounter prose (docs, comments, another codebase you're porting from) that spells it the British way, treat that as wrong for this framework: the actual interface only has `color`, and code written as `colour` will fail to compile.

```typescript
ctx.io.write(ctx.io.color('✓ Deployment successful', 'green'))
ctx.io.writeError(ctx.io.color('✗ Deployment failed', 'red'))

const spinner = ctx.io.spinner('Deploying...')
try {
  await deploy()
  spinner.succeed('Done!')
} catch {
  spinner.fail('Failed')
}

const name = await ctx.io.prompt('Project name: ')
const ok = await ctx.io.confirm('Continue?', false)
const choice = await ctx.io.select('Pick one:', ['a', 'b', 'c'] as const)
```

`spinner()`, `prompt()`, `confirm()`, and `select()` are currently lightweight/stub-level implementations (no animation yet) but are the stable API to code against; write against the interface, not the current behavior.

## Logger

```typescript
interface Logger {
  level: LogLevel // 'debug' | 'info' | 'warn' | 'error'
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}
```

`ctx.logger.debug(...)` only prints when the `DEBUG` env var is set; the others always print. Use `logger` for internal diagnostics and `io.write`/`io.writeError` for user-facing output; don't conflate the two.

## Patterns to follow

**Validate positionals early, return a non-zero exit code on failure:**

```typescript
run(ctx) {
  const [source, dest] = ctx.positionals
  if (!source || !dest) {
    ctx.io.writeError('Usage: deploy <source> <destination>')
    return 1
  }
  // ...
  return 0
}
```

**Confirm before destructive operations unless `--force` is set:**

```typescript
run: async (ctx) => {
  if (!ctx.flags.force) {
    const ok = await ctx.io.confirm('This will delete data. Continue?')
    if (!ok) return 0
  }
  // proceed
}
```

**Exit codes are the `run()` return value.** The runtime sets `process.exitCode` to that value internally, so the entrypoint just calls `void run(config)`; no `process.exit()` needed. Return `1` (or any non-zero number) for failure, `0` or `undefined` for success.

**Errors thrown from a handler are caught by the runtime** and printed as `Error: <message>` with exit code 1. You don't need a top-level try/catch purely to avoid a crash, but catch specific, expected errors yourself to give a better message:

```typescript
run: async (ctx) => {
  try {
    await deploy()
  } catch (err) {
    if (err instanceof NetworkError) {
      ctx.io.writeError(ctx.io.color(`Network error: ${err.message}`, 'red'))
      return 1
    }
    throw err // let the runtime's generic handler report unexpected errors
  }
}
```

## Testing commands

Commands are plain functions, so test them directly with `bun:test` by constructing a `Context`:

```typescript
import { describe, test, expect } from 'bun:test'
import command from './mycommand'
import type { Context, Io, Logger } from 'concise-ti'

test('runs successfully', async () => {
  const ctx: Context = {
    flags: {},
    positionals: [],
    route: ['mycommand'],
    cwd: '/tmp',
    env: {},
    config: { name: 'x', commandsDir: 'commands', version: '1.0.0' },
    io: {
      /* mock the Io methods you actually call */
    } as Io,
    logger: {
      /* mock */
    } as Logger,
  }
  expect(await command.run(ctx)).toBe(0)
})
```

Mirror your test layout to your source layout for consistency, e.g. `commands/add.ts` → `tests/unit/commands/add.test.ts`. For directory-scanned CLIs, also add a black-box test per command that spawns the compiled entrypoint (`Bun.spawn(['bun', 'run', 'main.ts', ...args])`) and asserts on stdout/stderr/exit code, so routing and flag-parsing are exercised together, not just the handler in isolation.

## Building a binary

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli hello Alice
```

No further config needed; this is the whole release pipeline for a concise-ti CLI.

## Quick checklist for a new project

1. Decide: inline (`defineManifest`) or directory-scanned (`discoverManifest`). Pick one shape and stick to it.
2. Scaffold `main.ts`, `package.json`, `tsconfig.json`, and (for the directory-scanned shape) a commands directory.
3. Build each command with `command({ meta, flags, run })`. `meta` and `flags` are optional, `run` is required.
4. Type `Context<YourFlagsInterface>` if the command declares flags, so `ctx.flags` isn't `any`.
5. Validate positionals/required flags at the top of `run()`; return `1` on failure.
6. Use `ctx.io.color` (not `colour`) for colored output, `ctx.io.write`/`writeError` for output, `ctx.logger` for diagnostics gated behind `DEBUG`.
7. If destructive, gate on a `force` flag with a `ctx.io.confirm()` fallback.
8. Add a unit test per command, mirroring the source layout.
