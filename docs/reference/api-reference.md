## API Reference

Every type and function concise-ti exports, as of `src/index.ts`:

```typescript
export { command } from '@/core/command'
export { run, defineManifest } from '@/core/runtime'

export type { Config } from '@/types/config'
export type { Context } from '@/types/context'
export type { Manifest } from '@/types/manifest'
export type { Io, Logger } from '@/types/io'
export type { CommandModule } from '@/types/command'
```

### Types

#### CommandModule

```typescript
interface CommandModule<F = Record<string, unknown>> {
  meta?: CommandMeta
  flags?: Record<string, FlagSpec>
  args?: ArgSpec[]
  rawArgs?: boolean
  run: (ctx: Context<F>) => void | number | Promise<void | number>
}

interface CommandMeta {
  description?: string
  aliases?: readonly string[]
  hidden?: boolean
  examples?: readonly string[]
}
```

The default export of a command file. Only `run` is required.

#### FlagSpec

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

`type`, `short`, `default`, `multiple` are enforced by the parser. `required`,
`choices`, `validate` are typed but not yet read at parse time. See
[Flag Parsing](../features/flag-parsing.md).

#### ArgSpec

```typescript
interface ArgSpec {
  name: string
  description?: string
  required?: boolean
  variadic?: boolean
  validate?: (value: string) => true | string
}
```

Descriptive metadata for a positional argument. Not currently read by the
runtime. See [Positional Arguments](../features/positional-arguments.md).

#### `rawArgs`

When `true`, skips `parseAndCoerce` entirely: `ctx.flags` is `{}` and
`ctx.positionals` is the command's remaining argv, unchanged. Needed by
commands that forward arbitrary flags to another CLI (e.g. `concise-ti
compile` passing `--outfile` etc. through to `bun build`), since `node:util`'s
`parseArgs` in strict mode rejects any option not declared in `flags`. See
[Flag Parsing](../features/flag-parsing.md).

#### Context

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

#### Io

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

interface SpinnerHandle {
  update: (text: string) => void
  succeed: (text?: string) => void
  fail: (text?: string) => void
  stop: () => void
}
```

`write`, `writeError`, `color`, `isTTY` are implemented. `spinner`, `prompt`,
`confirm`, `select` are interfaces backed by no-op stubs. See [I/O System](../architecture/io.md).

#### Logger

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  level: LogLevel
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}
```

#### Manifest

```typescript
interface ManifestEntry {
  route: string[]
  sourcePath: string
  importer: () => Promise<{ default: CommandModule }>
  meta?: CommandMeta
}

interface Manifest {
  entries: ManifestEntry[]
}
```

#### Config

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

If `manifest` is set, `run()` uses it directly; otherwise it discovers one from
`commandsDir` (default `'commands'`). `bin` defaults to `name`.

### Functions

#### `run(config, importMeta?, argv?)`

```typescript
function run(config: Config, importMeta?: { dir: string }, argv?: string[]): Promise<number>
```

The dispatcher. Uses `config.manifest` if present, otherwise discovers one from
`config.commandsDir` resolved relative to `importMeta.dir` (required in that
case). Resolves `argv` (defaults to `Bun.argv.slice(2)`) against the manifest,
parses and coerces flags, builds `Context`, invokes the matched command, and
resolves to the exit code: the command's numeric return, or `0`. On an
unknown route or a thrown error, writes to stderr and resolves to `1`. When
called with no explicit `argv` (the entrypoint case), also sets
`process.exitCode`.

#### `defineManifest(routes)`

```typescript
function defineManifest(routes: Record<string, CommandModule>): Manifest
```

Builds a `Manifest` from a flat map of slash-delimited route to command module.
See [Manifest](../features/manifest.md).

#### `discoverManifest(commandsDir)`

```typescript
function discoverManifest(commandsDir: string): Promise<Manifest>
```

Walks `commandsDir`, building a route from each `.ts` file's path (skipping
`*.test.ts`; `index.ts` collapses into its parent's route) and lazily
importing its default export. Not exported from `concise-ti` directly; `run()` calls
it for you when `config.manifest` is unset.

#### `compile(argv)`

```typescript
function compile(argv: string[]): Promise<number>
```

Backs the `concise-ti compile <entry> [...bun build flags]` bin command. Not
exported from `concise-ti` directly. See
[Manifest](../features/manifest.md#compiling-a-commandsdir-cli-to-a-binary)
and [Core Module](../architecture/core.md#compileargv).

#### `buildRouteLookup(manifest)`

```typescript
function buildRouteLookup(manifest: Manifest): Map<string, ManifestEntry>
```

Builds an O(1) lookup keyed by `route.join('/')`.

#### `resolveRoute(args, lookup)`

```typescript
function resolveRoute(
  args: string[],
  lookup: Map<string, ManifestEntry>,
): { entry: ManifestEntry; remaining: string[] } | null
```

Longest-prefix match of `args` against `lookup`. Returns the matching entry and
the unmatched remainder, or `null`.

#### `parseAndCoerce(args, flags)`

```typescript
function parseAndCoerce(
  args: string[],
  flags: Record<string, FlagSpec>,
): { values: Record<string, unknown>; positionals: string[] }
```

Parses `args` with Node's `parseArgs` against the given flag specs and coerces
each value to its declared type.

#### `createIo()` / `createLogger()`

```typescript
function createIo(): Io
function createLogger(): Logger
```

Build a fresh `Io`/`Logger` instance, called once per `run()` invocation.

#### `colorize(text, color)`

```typescript
function colorize(text: string, color: Color): string
```

Wraps `text` in ANSI codes for `color`, or returns it unchanged if
`shouldUseColor()` is false.

#### `createSpinner(text)`

```typescript
function createSpinner(text: string): SpinnerHandle
```

Currently a no-op stub. See [Spinners](../features/spinners.md).

#### `coerceValue(value, spec)`

```typescript
function coerceValue(value: unknown, spec: FlagSpec): unknown
```

Converts a raw parsed value to the type declared in `spec.type`.

#### `shouldUseColor()` / `isTTY()`

```typescript
function shouldUseColor(): boolean
function isTTY(): boolean
```

`shouldUseColor` checks `NO_COLOR`, then `FORCE_COLOR`, then falls back to
`isTTY()`.

### Internal module map

For contributors browsing `src/` directly (all internal imports use the `@/`
alias):

```typescript
// @/types/
import type { CommandModule, FlagSpec, ArgSpec } from '@/types/command'
import type { Context } from '@/types/context'
import type { Config } from '@/types/config'
import type { Io, Logger, Color, SpinnerHandle } from '@/types/io'
import type { Manifest, ManifestEntry } from '@/types/manifest'

// @/core/
import { run, defineManifest } from '@/core/runtime'
import { discoverManifest } from '@/core/discovery'
import { buildRouteLookup, resolveRoute } from '@/core/router'
import { parseAndCoerce, toParseArgsOptions } from '@/core/parser'
import { command } from '@/core/command'
import { compile } from '@/core/compile'

// @/io/
import { createIo, createLogger } from '@/io/index'
import { colorize } from '@/io/color'
import { createSpinner } from '@/io/spinner'
import { prompt, confirm, select } from '@/io/prompt'

// @/utils/
import { coerceValue } from '@/utils/coerce'
import { shouldUseColor, isTTY } from '@/utils/tty'
```

As a consumer, import from the package instead:

```typescript
import { command, run } from 'concise-ti'
import type { Config, CommandModule } from 'concise-ti'
```
