## Core Concepts

concise-ti's conceptual model is deliberately small: **commands**, a **manifest** that
maps routes to them, and a **runtime** that dispatches one to the other. Understand
these three ideas, and the rest of the framework (flags, context, I/O) falls into
place around them.

### Layout

```
┌─────────────────────────────────────────┐
│              Your Commands               │
├─────────────────────────────────────────┤
│  Runtime + Router  (dispatch, routing)   │
├─────────────────────────────────────────┤
│  Parser            (argv → typed data)   │
├─────────────────────────────────────────┤
│  I/O                (color, prompts)      │
├─────────────────────────────────────────┤
│  Types             (contracts)           │
├─────────────────────────────────────────┤
│  Utils             (coercion, TTY)       │
├─────────────────────────────────────────┤
│        Bun & Node.js standard library    │
└─────────────────────────────────────────┘
```

Each layer only talks to the one below it. The router doesn't parse arguments;
it asks the parser. The parser doesn't know about colors or TTYs; that's I/O's
job. Utilities are stateless and depend on nothing else in the tree.

### Commands

A **command** is a module: a plain object with an optional `meta`, optional
`flags`/`args`, and a `run(ctx)` function.

```typescript
const deploy = {
  meta: { description: 'Deploy to an environment' },
  flags: {
    environment: { type: 'string', default: 'staging' },
  },
  run(ctx) {
    ctx.io.write(`Deploying to ${ctx.flags.environment}...`)
  },
}
```

Wrap it with `command()` (an identity function from `concise-ti`) so the compiler
infers the flag types correctly:

```typescript
import { command } from 'concise-ti'

export default command({ ... })
```

### Manifest

A **manifest** is the map from route to command module concise-ti dispatches against:

```typescript
interface Manifest {
  entries: ManifestEntry[]
}

interface ManifestEntry {
  route: string[] // e.g. ['deploy', 'aws']
  sourcePath: string
  importer: () => Promise<{ default: CommandModule }>
  meta?: CommandMeta
}
```

You never build this by hand. Two functions produce it:

- **`defineManifest(routes)`** turns an in-memory `{ 'deploy/aws': awsDeploy }`
  map into a `Manifest`. Good for a handful of commands in one file.
- **`discoverManifest(commandsDir)`** walks a directory of `.ts` files at
  runtime and turns the file tree into routes. Good for CLIs with many commands.

Both produce the same `Manifest` shape, so the router never knows or cares which
one built it. See [Manifest](../features/manifest.md) for the full picture.

### Runtime

The **runtime** is `run()`, the dispatcher every entrypoint calls once:

```typescript
import { run } from 'concise-ti'

void run({ name: 'my-cli', version: '1.0.0' }, import.meta)
```

Given a config and (when discovering commands from disk) `import.meta`, `run()`:

1. Resolves a manifest: `config.manifest` if you set one, otherwise
   `discoverManifest(config.commandsDir ?? 'commands')`
2. Removes any route listed in `config.skip`, then adds default `help` and
   `version` commands for those routes if not already defined (see
   [Default Commands](../features/default-commands.md))
3. Matches `argv` against the manifest using **longest-prefix routing**, so
   `users get 1` resolves to `users/get` with `['1']` left over as positionals
   — empty `argv` resolves to `help`
4. Lazily imports the matched command's module
5. Parses and coerces the remaining argv against the command's `flags`
6. Builds the `Context` and calls `command.run(ctx)`
7. Returns the process exit code (the handler's numeric return, or `0`)

```
argv: ['deploy', '--env=prod', 'src/']
  │
  ▼
resolveRoute()  ──►  matches 'deploy', remaining = ['--env=prod', 'src/']
  │
  ▼
parseAndCoerce() ──► { values: { env: 'prod' }, positionals: ['src/'] }
  │
  ▼
Context built  ──►  { flags, positionals, route, cwd, env, config, io, logger }
  │
  ▼
command.run(ctx)  ──►  exit code
```

Unknown routes and thrown errors are caught by `run()` itself: it writes to
stderr and resolves to exit code `1` rather than throwing out of your entrypoint.

### Flags and positionals

concise-ti distinguishes **flags** (named, declared in `flags`) from **positionals**
(everything else, in order):

```bash
my-cli deploy --environment=prod --verbose src/ dist/
```

```typescript
ctx.flags = { environment: 'prod', verbose: true }
ctx.positionals = ['src/', 'dist/']
```

Flags are declared with a `FlagSpec`, a plain object, not a builder call:

```typescript
flags: {
  environment: { type: 'string', default: 'staging' },
  verbose: { type: 'boolean', short: 'v' },
}
```

See [Flag Parsing](../features/flag-parsing.md) and [Positional Arguments](../features/positional-arguments.md).

### Configuration

**`Config`** is the object you pass to `run()`: name, version, and either a
`manifest` or a `commandsDir` to discover one from.

```typescript
interface Config {
  name: string
  version: string
  commandsDir?: string
  targets?: string[]
  bin?: string
  manifest?: Manifest
  skip?: string[]
}
```

concise-ti doesn't impose a config _loader_: build the object however suits you and
hand it to `run()`. It's available to every command via `ctx.config`.

`skip` removes routes from dispatch entirely — default (`help`/`version`),
manifest, or discovered alike. See [Default Commands](../features/default-commands.md).

`Config` isn't sealed — extend it with your own fields and pass that type to
`run<ConfigType>()` to get a typed `ctx.config` in every command, with no
casting. See [Context: Config](../features/context.md#config).

### I/O

The **`Io`** interface is your window into the terminal: writing output,
coloring it, showing a spinner, or asking the user something.

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
```

`write`/`writeError`/`color` are fully implemented today. `spinner`, `prompt`,
`confirm`, and `select` are stable interfaces backed by no-op stubs right now;
see [Prompts](../features/prompts.md), [Spinners](../features/spinners.md), and
the [Roadmap](../future/roadmap.md) for what's landing next.

### Putting it together

```typescript
import { command, run } from 'concise-ti'

const hello = command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    ctx.io.write(`Hello, ${ctx.positionals[0] ?? 'World'}!`)
  },
})

void run({ name: 'my-cli', version: '1.0.0' }, import.meta)
```

Drop `hello`'s file in `commands/hello.ts`, and `run()` discovers it automatically,
with no manifest to write by hand. That's the entire mental model.

### Next

- **[Building Commands](../guides/building-commands.md)**: practical patterns
- **[Default Commands](../features/default-commands.md)**: `help`, `version`, and `config.skip`
- **[Architecture](../architecture/core.md)**: how `run()` is implemented, module by module
- **[API Reference](../reference/api-reference.md)**: every type and function
