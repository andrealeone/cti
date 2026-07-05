<h1 align="center">concise-τι</h1>

**Concise Terminal Interface** is a lightweight, dependency-free, Bun-native TypeScript framework for building command-line tools. Install it as a dependency, call it once from your entrypoint, and start writing command files. The tool automatically discovers them, parses their arguments, routes to them, and renders their output.

<br/>

### Vision

Managing a command-line interface should feel like working with Next.js, not starting with a boilerplate kit. Install concise-ti and you're ready to go. Write an entrypoint that's one line long, drop files into a `/commands` directory, and you have a working, typed, compilable CLI. Everything between the argument vector and your handler is concise-ti's job, not yours.

There are no configuration files and no wiring code to handle. The framework handles all the plumbing.

```
                 ┌───────────────────────────┐
   argv    ───►  │   run(config, meta)       │
                 │   The only line you write │
                 └────────────┬──────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Resolve route   Parse & coerce   Build context
       (commands/ tree)  (your flags)   (io, cwd, env…)
              │               │               │
              └───────────────┴───────┬───────┘
                                      ▼
                              Your command's run()
                                      │
                                      ▼
                                  Exit code
```

<br/>

### Features

- **No Boilerplate** No manual imports or routing logic, just create files in the `/commands` directory or define your own.
- **Typed Arguments** Flags and positionals are declared once and arrive in the handler function already parsed, coerced, and typed.
- **Zero-Config** Auto-discover commands from the filesystem, leaving you nothing to wire up by hand.
- **Lightweight** No runtime dependencies: the framework is the only thing in your node modules.
- **Bun-Optimized** Lean on Bun's speed and native TypeScript.
- **Compiles to Binary** Ship your CLI as a single standalone executable with `bun build --compile`.

<br/><br/>

## Getting Started

Requires [Bun](https://bun.sh) 1.3 or later.

The fastest way to start is the CLI's own init wizard, which scaffolds a
working project (either a new folder or right into the one you're in) and
asks whether you want auto-discovered commands or a single-file manifest:

```bash
bunx concise-ti init
```

See [The `concise-ti` CLI](docs/features/cli.md) for what it does and
[Project Init](docs/guides/cli/project-init.md) for the full walkthrough. Or
set it up by hand:

```bash
mkdir new-cli && cd new-cli

bun init -y
bun add concise-ti
```

You only ever touch two kinds of files: the entrypoint, written once, and command
files, dropped in as your CLI grows:

```
new-cli/
├── main.ts      ← written once, never touched again
└── commands/
    └── fib.ts   ← app fib
```

<br/>

Create `commands/fib.ts`:

```typescript
import { command } from 'concise-ti'

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

<br/>

Create `main.ts`:

```typescript
import { run } from 'concise-ti'

void run({ name: 'new-cli', version: '1.0.0' }, import.meta)
```

That's the whole entrypoint, and it's the last time you'll edit it. concise-ti automatically
discovers commands from the `commands` directory, turns `fib.ts` into the `fib` route,
parses argv against its declared flags, and dispatches automatically on every run.
Add a second file and `app second-command` exists with no further wiring —
`bunx concise-ti scaffold` will even ask what the command should look like
and write that file for you. See
[Command Routing](docs/features/command-routing.md) for how the file
structure maps to commands, and [Scaffolding Commands](docs/guides/cli/scaffolding-commands.md)
for the wizard. Prefer to list commands by hand instead of relying on the
filesystem? See [Manifest](docs/features/manifest.md) for the inline
`defineManifest` alternative.

<br/>

Run it:

```bash
bun run ./main.ts fib 10
# Output: 55

bun run ./main.ts fib 10 --sequence
# Output: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55
```

Compile it to a standalone binary:

```bash
bunx concise-ti compile ./main.ts --outfile dist/my-cli
./dist/my-cli fib 10 --sequence
```

A CLI built entirely with `defineManifest`, no `commands/` directory, can
compile directly with `bun build --compile`; `concise-ti compile` is only
needed to make filesystem-discovered commands work inside the compiled
binary. See [Manifest](docs/features/manifest.md).

<br/><br/>

## Documentation

The example above is just a taste. Full docs live in [`/docs`](docs); pick the
one below based on what you're trying to do:

- **Get a working CLI in two minutes** — [Quick Start](docs/getting-started/quickstart.md)
- **Bootstrap or grow a project without hand-writing boilerplate** — [The `concise-ti` CLI](docs/features/cli.md): [Project Init](docs/guides/cli/project-init.md) and [Scaffolding Commands](docs/guides/cli/scaffolding-commands.md)
- **Understand the mental model** — [Core Concepts](docs/concepts/core-concepts.md)
- **Write commands well** — [Building Commands](docs/guides/building-commands.md), [Examples](docs/guides/examples.md), [Demos](docs/guides/demos.md)
- **Look up a flag/routing/I/O detail** — [Features](docs/features/), one page per capability
- **See how concise-ti is built internally** — [Architecture](docs/architecture/core.md): runtime, router, parser, I/O, types
- **Look up an exact type or function** — [API Reference](docs/reference/api-reference.md)
- **Know why concise-ti is shaped this way** — [Vision](docs/principles/vision.md) & [Philosophy](docs/principles/philosophy.md)
- **Contribute or report a bug** — [Contributing Guide](docs/contributing/guide.md), [Testing](docs/contributing/testing.md)
- **Know what's coming next** — [Roadmap](docs/future/roadmap.md)

<br/>
