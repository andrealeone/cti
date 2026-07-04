<h1 align="center">CTI</h1>

CTI (**Concise Terminal Interface**, codename Watson) is a lightweight, dependency-free, Bun-native TypeScript framework for building command-line tools. Install it as a dependency, call it once from your entrypoint, and start writing command files. CTI discovers them, parses their arguments, routes to them, and renders their output.

<br/>

### Vision

Installing a CLI framework should feel like installing Next.js, not like copying a starter kit. You install CTI, write an entrypoint that's one line long, drop files into a `commands` directory, and you have a working, typed, compilable CLI. Everything between the argument vector and your handler is CTI's job, not yours.

There are no configuration files to maintain and no wiring code to write. The framework handles the plumbing, so the developer writes only what each command does.

<br/>

### Features

- **No Boilerplate** No manual imports or routing logic, just files in a `commands` directory.
- **Typed Arguments** Flags and positionals are declared once and arrive in your handler already parsed, coerced, and typed.
- **Zero-Config**: CTI reads your `package.json` and discovers commands from the filesystem; nothing to wire up by hand.
- **Lightweight** No runtime dependencies; the framework is the only thing in your `node_modules` that's CTI.
- **Bun-Optimised** Lean on Bun's speed and native TypeScript.
- **Compiles to Binary** Ship your CLI as a single standalone executable with `bun build --compile`.

<br/><br/>

## Getting Started

Requires [Bun](https://bun.sh) 1.3 or later.

```bash
mkdir new-cli && cd new-cli

bun init -y
bun install
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
import { command } from './core/command'

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

The `flags` block is enough to get a typed, validated `--sequence` toggle
in `ctx.flags`. No manual parsing, no wiring it into a parser yourself.

Create `main.ts`:

```typescript
import { run } from 'cti'

void run({ name: 'new-cli', version: '1.0.0' }, import.meta)
```

That's the whole entrypoint, and it's the last time you'll edit it. CTI automatically
discovers commands from the `commands` directory, turns `fib.ts` into the `fib` route,
parses argv against its declared flags, and dispatches — automatically, on every run.
Add a second file and `app second-command` exists with no further wiring. See
[Command Routing](docs/features/command-routing.md) for how the file
structure maps to commands. Prefer to list commands by hand instead of
relying on the filesystem? See
[Manifest Definition](docs/features/manifest-definition.md) for the inline
`defineManifest` alternative.

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

The example above is just a taste. CTI has comprehensive documentation covering everything from first steps to advanced patterns. Here's where to go.

**New to CTI?**  
Start with the [Quick Start guide](docs/getting-started/quickstart.md) for a five-minute tour, or read [Core Concepts](docs/concepts/core-concepts.md) to understand the mental model.

**Ready to build something?**  
Head to [Building Commands](docs/guides/building-commands.md) for practical patterns, browse [Examples](docs/guides/examples.md) for real-world snippets, or run the [runnable demos](docs/guides/demos.md) in [`/demos`](demos) to see CTI in action.

**Understanding the design**  
Explore [System Overview](docs/architecture/system-design.md) to see how the pieces fit together, then dive into specific modules: [Core](docs/architecture/core.md) (routing and argument parsing), [I/O System](docs/architecture/io.md) (colours, prompts, spinners), [Type System](docs/architecture/types.md) (strong typing), and [Utilities](docs/architecture/utils.md).

**Why these choices?**  
[Value Proposition](docs/principles/value-proposition.md) explains what makes CTI worth your time, and [Philosophy](docs/principles/philosophy.md) compares it to other frameworks.

**Contributing & roadmap**  
[Contribution Guide](docs/contributing/guide.md) covers the development workflow, [Testing](docs/contributing/testing.md) explains the test structure, and [Roadmap](docs/future/roadmap.md) shows where CTI is heading.

**Full reference**  
See the [API Reference](docs/reference/api-reference.md) for type definitions and exports.

<br/>
