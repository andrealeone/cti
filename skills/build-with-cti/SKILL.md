---
name: build-with-cti
description: Use when writing or scaffolding a CLI built on the CTI framework (the Bun-native TypeScript CLI framework) — creating command files, wiring up an entrypoint with defineManifest/discoverManifest, declaring flags/positionals, structuring a commands directory, using ctx.io (colour, spinner, prompt, confirm, select), or following CTI's conventions for testing and error handling. Triggers on phrases like "add a command to this CTI CLI", "set up a CTI project", "how do I declare a flag in CTI", "structure this CLI with CTI". Not for explaining what CTI is or pitching it — use about-cti for that.
---

# Building a CLI with CTI

This skill captures CTI's API contract and the recommended project shape, grounded directly in `src/` (the source of truth) and the real demo apps under `demos/`. Where the prose docs in `docs/` disagree with the source code, this skill follows the code — that discrepancy is called out explicitly below so you don't get tripped up by it.

## The mental model

A CTI CLI has exactly three moving parts:

1. **Command modules** — plain objects (`CommandModule`) with `meta`, `flags`, `args`, and a `run(ctx)` handler. No classes, no decorators.
2. **A manifest** — maps route strings (e.g. `'db/migrate'`) to command modules, built either inline (`defineManifest`) or by scanning a directory (`discoverManifest`). Assign it to `config.manifest`, or leave it unset and let `run()` discover one from `config.commandsDir`.
3. **The runtime** — `run(config, importMeta?)` resolves argv against the manifest (`config.manifest`, or one discovered from `config.commandsDir` relative to `importMeta.dir`) using longest-prefix match, lazily loads the matched command, parses/coerces its flags, builds a `Context`, and invokes `run()`. It returns the process exit code.

Everything else (colour output, spinners, prompts, logging) hangs off the `Context` object passed into every handler.

## Project structure

Two valid shapes, pick based on size:

**Small CLI (few commands) — inline manifest, no `commands/` directory:**

```
my-cli/
├── main.ts          # entrypoint: defines commands inline, builds config.manifest with defineManifest, calls run
├── package.json
└── tsconfig.json
```

See `demos/hello-world/main.ts` and `demos/deploy-tool/main.ts` for this pattern — multiple commands defined as local variables, composed with `defineManifest({ deploy, rollback, status })` and assigned to `config.manifest`.

**Larger CLI (many commands) — directory-scanned manifest:**

```
my-cli/
├── main.ts           # entrypoint: run(config, import.meta) auto-discovers commands/
├── state.ts         # shared helpers/state, NOT a command (no default CommandModule export)
├── commands/
│   ├── add.ts           # → my-cli add
│   ├── list.ts           # → my-cli list
│   └── db/
│       └── migrate.ts    # → my-cli db migrate
├── package.json
└── tsconfig.json
```

See `demos/todo-app/` for this pattern in full — `main.ts` calls `run(config, import.meta)` with no `config.manifest` set, so `run()` discovers commands from `config.commandsDir` (default `'commands'`) relative to `import.meta.dir`. Each file under `commands/` exports a default `CommandModule` built with the `command()` helper.

Routing rule (from `src/core/discovery.ts`): every `.ts` file under the commands directory becomes a route that mirrors its file path (`commands/db/migrate.ts` → `db migrate`); a file named `index.ts` collapses into its parent's route (`commands/db/index.ts` → `db`); files matching `*.test.ts` are skipped.

## The entrypoint

Inline manifest (small CLI):

```typescript
import { command, defineManifest, run } from 'cti'

const hello = command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    ctx.io.write(`Hello, ${ctx.positionals[0] ?? 'World'}!`)
  },
})

void run({ name: 'my-cli', version: '1.0.0', manifest: defineManifest({ hello }) })
```

Directory-scanned manifest (larger CLI) — pass `import.meta` and let `run()` discover commands from `config.commandsDir`:

```typescript
import { run } from 'cti'

void run({ name: 'my-cli', commandsDir: 'commands', version: '1.0.0' }, import.meta)
```

(You can also call `discoverManifest(commandsDir)` yourself and assign the result to `config.manifest` — useful if you want to inspect or modify entries before dispatch. Either way, `Manifest` ends up on `config.manifest`.)

`Config` (`src/types/config.d.ts`) is `{ name, version, commandsDir?, targets?, bin?, manifest? }` — there's no enforced loader; build it however suits the project and it's available to every command as `ctx.config`. Set `manifest` directly, or leave it unset and pass `import.meta` to `run()` so it can discover one from `commandsDir`.

Note on imports: import everything from the package root (`import { run } from 'cti'`) — `src/index.ts` is a barrel that re-exports the public runtime, `command()` helper, and types. Internally, this repo's own source uses the `@/*` → `./src/*` path alias from `tsconfig.json`; deep paths like `cti/src/core/runtime` still resolve for consumers but are no longer the documented form.

## Writing a command

Prefer the `command()` helper (`src/core/command.ts`) over a bare object literal with `satisfies CommandModule` — it's what the real demos use, and it gives the same type inference with less ceremony:

```typescript
import { command } from 'cti'

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

`meta`, `flags`, and `args` are all optional — the minimal command is just `command({ run(ctx) { ... } })`.

### CommandMeta (`src/types/command.d.ts`)

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

Flags are parsed via Node's `util.parseArgs` under the hood (`src/core/parser.ts`) and coerced to their declared type (`src/utils/coerce.ts`); an invalid number throws. Numeric defaults are stringified internally for `parseArgs` and coerced back, so you don't need to think about that — just declare `type: 'number'` and a numeric `default`.

### Positionals (`ArgSpec`, declarative — currently informational)

```typescript
interface ArgSpec {
  name: string
  description?: string
  required?: boolean
  variadic?: boolean
  validate?: (value: string) => true | string
}
```

In practice, positionals arrive as a plain `string[]` on `ctx.positionals` regardless of whether `args` is declared — access them by index (`ctx.positionals[0]`) and validate yourself in `run()`. Always validate before using; a missing positional is just `undefined`, not an error thrown for you.

### Type-safe flags via generics

Always type the handler's `Context` generic with your flags shape — without it, `ctx.flags.whatever` is `any` and arithmetic/boolean checks can fail silently at runtime:

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

## The Context object (`src/types/context.d.ts`)

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

This is the only argument a handler receives — everything the command needs comes through it.

## The I/O interface — mind the spelling

`Io` (`src/types/io.d.ts`, implemented in `src/io/index.ts`):

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

**Important inconsistency:** the prose docs (`docs/guides/building-commands.md`, `docs/concepts/core-concepts.md`) consistently write `ctx.io.colour(...)` and `Colour` (British spelling). The actual source (`src/types/io.d.ts`) and every real demo (`demos/deploy-tool/main.ts`, etc.) use the American spelling: **`ctx.io.color(...)`**. Use `color`, not `colour` — the compiler will reject `colour` since it doesn't exist on the `Io` interface. If you see `colour` in a doc snippet, mentally substitute `color` before writing code.

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

`spinner()`, `prompt()`, `confirm()`, and `select()` are currently lightweight/stub-level implementations (no animation yet) but are the stable API to call — write against the interface, not the current behaviour.

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

`ctx.logger.debug(...)` only prints when the `DEBUG` env var is set; the others always print. Use `logger` for internal diagnostics, `io.write`/`io.writeError` for user-facing output — don't conflate the two.

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

**Exit codes are the `run()` return value** — `run()` (`src/core/runtime.ts`) sets `process.exitCode` to that value internally, so the entrypoint just calls `void run(config)`; no `process.exit()` needed. Return `1` (or any non-zero number) for failure, `0` or `undefined` for success.

**Errors thrown from a handler are caught by the runtime** (`src/core/runtime.ts`) and printed as `Error: <message>` with exit code 1 — you don't need a top-level try/catch purely to avoid a crash, but catch specific, expected errors yourself to give a better message:

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

This repo's own test layout mirrors `src/`: e.g. `src/core/parser.ts` → `tests/unit/core/parser.test.ts`. Follow the same mirroring in a consumer project (`commands/add.ts` → `tests/unit/commands/add.test.ts` or similar) for consistency.

## Building a binary

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli hello Alice
```

No further config needed — this is the whole release pipeline for a CTI CLI.

## Quick checklist when adding a new command

1. Decide: inline (`defineManifest`) or directory-scanned (`discoverManifest`) — match the existing project's pattern, don't mix without reason.
2. Create the file at the path matching the desired route (or add a `key: command` entry to the inline manifest).
3. Build it with `command({ meta, flags, run })` — meta and flags are optional, `run` is required.
4. Type `Context<YourFlagsInterface>` if the command declares flags, so `ctx.flags` isn't `any`.
5. Validate positionals/required flags at the top of `run()`; return `1` on failure.
6. Use `ctx.io.color` (not `colour`) for coloured output, `ctx.io.write`/`writeError` for output, `ctx.logger` for diagnostics gated behind `DEBUG`.
7. If destructive, gate on a `force` flag with a `ctx.io.confirm()` fallback.
