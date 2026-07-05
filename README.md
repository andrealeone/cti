<h1 align="center">CTI</h1>

CTI (**Concise Terminal Interface**, codename Watson) is a lightweight, dependency-free, Bun-native TypeScript framework for building command-line tools. Install it as a dependency, call it once from your entrypoint, and start writing command files. CTI discovers them, parses their arguments, routes to them, and renders their output.

<br/>

### Vision

Installing a CLI framework should feel like installing Next.js, not like copying a starter kit. You install CTI, write an entrypoint that's one line long, drop files into a `commands` directory, and you have a working, typed, compilable CLI. Everything between the argument vector and your handler is CTI's job, not yours.

There are no configuration files to maintain and no wiring code to write. The framework handles the plumbing, so the developer writes only what each command does.

```
                 ┌──────────────────────────┐
   argv    ───►  │   run(config, meta)      │
                 │   the only line you write │
                 └────────────┬─────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        resolve route   parse & coerce   build context
       (commands/ tree)   (your flags)   (io, cwd, env…)
              │               │               │
              └───────────────┴───────┬───────┘
                                       ▼
                              your command's run()
                                       │
                                       ▼
                                  exit code
```

<br/>

### Features

- **No Boilerplate** No manual imports or routing logic, just files in a `commands` directory.
- **Typed Arguments** Flags and positionals are declared once and arrive in your handler already parsed, coerced, and typed.
- **Zero-Config** CTI discovers commands from the filesystem; nothing to wire up by hand.
- **Lightweight** No runtime dependencies; the framework is the only thing in your `node_modules` that's CTI.
- **Bun-Optimized** Lean on Bun's speed and native TypeScript.
- **Compiles to Binary** Ship your CLI as a single standalone executable with `bun build --compile`.

<br/><br/>

## Getting Started

Requires [Bun](https://bun.sh) 1.3 or later.

```bash
mkdir new-cli && cd new-cli

bun init -y
bun add cti
```

You only ever touch two kinds of files: the entrypoint, written once, and command
files, dropped in as your CLI grows:

```
new-cli/
├── main.ts      ← written once, never touched again
└── commands/
    └── fib.ts   ← app fib
```

Create `commands/fib.ts`:

```typescript
import { command } from 'cti'

export default command({
  meta: { description: 'Compute a Fibonacci number, or the sequence leading to it' },
  flags: {
    sequence: { type: 'boolean', short: 's', description: 'Print the whole sequence up to n' },
  },
  run(ctx) {
    const n = Number(ctx.positionals[0] ?? 10),
      sequence = ctx.flags.sequence === true,
      values = [0, 1]

    for (let i = 2; i <= n; i++) values.push(values[i - 1] + values[i - 2])

    ctx.io.write(sequence ? values.slice(0, n + 1).join(', ') : String(values[n]))
  },
})
```

The `flags` block is enough to get a typed `--sequence` toggle in `ctx.flags`.
No manual parsing, no wiring it into a parser yourself.

Create `main.ts`:

```typescript
import { run } from 'cti'

void run({ name: 'new-cli', version: '1.0.0' }, import.meta)
```

That's the whole entrypoint, and it's the last time you'll edit it. CTI automatically
discovers commands from the `commands` directory, turns `fib.ts` into the `fib` route,
parses argv against its declared flags, and dispatches automatically on every run.
Add a second file and `app second-command` exists with no further wiring. See
[Command Routing](docs/features/command-routing.md) for how the file
structure maps to commands. Prefer to list commands by hand instead of
relying on the filesystem? See [Manifest](docs/features/manifest.md) for the
inline `defineManifest` alternative.

Run it:

```bash
bun run ./main.ts fib 10
# Output: 55

bun run ./main.ts fib 10 --sequence
# Output: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55
```

Compile it to a standalone binary:

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli fib 10 --sequence
```

<br/><br/>

## Documentation

The example above is just a taste. Full docs live in [`/docs`](docs); pick a
column below based on what you're trying to do:

| I want to...                     | Read                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Get a working CLI in 5 minutes    | [Quick Start](docs/getting-started/quickstart.md)                                                                          |
| Understand the mental model       | [Core Concepts](docs/concepts/core-concepts.md)                                                                            |
| Write commands well                | [Building Commands](docs/guides/building-commands.md), [Examples](docs/guides/examples.md), [Demos](docs/guides/demos.md) |
| Look up a flag/routing/I/O detail | [Features](docs/features/), one page per capability                                                                      |
| See how CTI is built internally   | [Architecture](docs/architecture/core.md): runtime, router, parser, I/O, types                                            |
| Look up an exact type or function | [API Reference](docs/reference/api-reference.md)                                                                           |
| Know why CTI is shaped this way   | [Vision](docs/principles/vision.md) & [Philosophy](docs/principles/philosophy.md)                                          |
| Contribute or report a bug        | [Contributing Guide](docs/contributing/guide.md), [Testing](docs/contributing/testing.md)                                  |
| Know what's coming next           | [Roadmap](docs/future/roadmap.md)                                                                                          |

Start at [`docs/README.md`](docs/README.md) for the full index.

<br/>
