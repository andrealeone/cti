## Type System

concise-ti's types are contracts between components, not an afterthought. Only `run`
is required on a `CommandModule`; everything else is optional, so a minimal
command stays minimal.

### CommandModule

```typescript
interface CommandModule<F = Record<string, unknown>, C extends Config = Config> {
  meta?: CommandMeta
  flags?: Record<string, FlagSpec>
  args?: ArgSpec[]
  run: (ctx: Context<F, C>) => void | number | Promise<void | number>
}

interface CommandMeta {
  description?: string
  aliases?: readonly string[]
  hidden?: boolean
  examples?: readonly string[]
}
```

The `F` generic carries your flag shape through to `ctx.flags`:

```typescript
interface DeployFlags {
  environment: string
  force: boolean
}

const deploy: CommandModule<DeployFlags> = {
  flags: {
    environment: { type: 'string', default: 'staging' },
    force: { type: 'boolean' },
  },
  run(ctx) {
    ctx.flags.environment // typed as string
    ctx.flags.force // typed as boolean
  },
}
```

### FlagSpec

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

`type`, `short`, `default`, and `multiple` are enforced by the parser today.
`choices` and `validate` are typed and documented but not yet read by
`parseAndCoerce`. See [Flag Parsing](../features/flag-parsing.md) and the
[Roadmap](../future/roadmap.md).

### Context

```typescript
interface Context<F = Record<string, unknown>, C extends Config = Config> {
  flags: F
  positionals: string[]
  route: string[]
  cwd: string
  env: Record<string, string | undefined>
  config: C
  io: Io
  logger: Logger
}
```

Everything a handler needs, in one object, built fresh per invocation. `C`
carries an extended `Config` type through to `ctx.config`, mirroring the
`ConfigType` passed to `run<ConfigType>()` — see [Config](#config) below.

### Io

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

See [I/O System](io.md) for what's implemented versus stubbed.

### Logger

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

### Manifest

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

Built by `defineManifest()` or `discoverManifest()`, consumed by the router.
See [Manifest](../features/manifest.md).

### Config

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

Minimal by design; extend it with your own properties as needed. `bin`
defaults to `name` when not set. When `manifest` is set, `run()` uses it
directly and skips discovery.

Pass an extended `Config` type as `run<ConfigType>()`'s type argument to get
a typed `ctx.config` in every command, via `CommandModule<F, ConfigType>` /
`Context<F, ConfigType>` (see `demos/api-client`).

### File organization

Types are split by domain under `src/types/`:

- **`command.d.ts`**: `CommandModule`, `FlagSpec`, `ArgSpec`, `CommandMeta`
- **`context.d.ts`**: `Context`
- **`io.d.ts`**: `Io`, `Logger`, `Color`, `SpinnerHandle`, `LogLevel`
- **`manifest.d.ts`**: `Manifest`, `ManifestEntry`
- **`config.d.ts`**: `Config`

### Related

- **[Core Concepts](../concepts/core-concepts.md)**: how the types fit into the dispatch flow
- **[Core Module](core.md)**: how types are used in parsing and routing
- **[API Reference](../reference/api-reference.md)**: the full type and function list
