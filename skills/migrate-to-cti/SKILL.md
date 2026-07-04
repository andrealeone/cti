---
name: migrate-to-cti
description: Use when porting an existing CLI (built with Yargs, Commander.js, Oclif, argparse/click, a hand-rolled argv parser, a shell script, or anything else) onto CTI (the Bun-native TypeScript CLI framework). Covers reading an existing CLI's command/subcommand structure, mapping its flags and positionals onto CTI's FlagSpec/ArgSpec, converting handler logic into CommandModule.run(ctx), replacing bespoke output/prompt/colour code with ctx.io, and running the old and new CLI side by side during the cutover. Not for scaffolding a brand-new CTI project with no prior implementation — use start-building-with-cti for that. Not for explaining what CTI is or pitching it — use about-cti for that.
---

# Migrating an existing CLI to CTI

This skill is the complete, self-contained playbook for porting a working CLI — in any language or framework — onto CTI. It assumes you can read the source of the CLI being migrated but know nothing about CTI going in.

## Before touching code: build the command inventory

Migrations fail when they're done file-by-file with no map. Before writing anything, walk the existing CLI and produce an inventory with one row per command:

- **Route** — the words a user types (`deploy`, `db migrate`, `users list`). Nested subcommands become CTI's space-separated routes.
- **Flags** — name, type (string/boolean/number), short alias, default, required?, choices, and whether it repeats (`multiple`).
- **Positionals** — name, required?, variadic (rest-style, e.g. `cp <src...> <dest>`)?
- **Side effects** — network calls, filesystem writes, prompts, spawned processes — anything the handler does beyond parsing.
- **Output** — what it prints on success, on failure, and what exit code each path uses.
- **Shared state** — helpers, config loading, or module-level variables multiple commands depend on (these become plain `.ts` modules that live *next to*, not *inside*, the commands directory).

This inventory becomes both your route map and your test plan — every row is one migrated command and (at minimum) one test.

## The target shape

A CTI CLI has exactly three moving parts, and everything from the old CLI needs to land in one of them:

1. **Command modules** — plain objects (`CommandModule`) with `meta`, `flags`, `args`, and a `run(ctx)` handler. This is where each old subcommand's handler logic goes, largely unchanged — only the argument-reading and output-writing code at its edges changes.
2. **A manifest** — maps route strings to command modules, built either inline (`defineManifest`) for a handful of commands or by directory scan (`discoverManifest`) for many. Old CLIs with a big subcommand tree (Commander's `.command()` chains, Oclif's `commands/` directory, argparse subparsers) map naturally onto the directory-scanned shape, since the on-disk layout mirrors the old subcommand tree almost 1:1.
3. **The runtime** — `run(config, importMeta?)` replaces whatever dispatch loop, argv parser, and top-level try/catch the old CLI had. You delete that code; you don't port it.

Everything reading `process.argv` manually, hand-rolled `switch` statements over `argv[2]`, or a bespoke help-text generator gets deleted, not translated line-by-line — CTI's router and parser replace all of it.

## Picking inline vs. directory-scanned for the port

- **Old CLI has ≤ ~5 flat commands** (a small Commander/Yargs script, a handful of npm-script-style subcommands): port to the inline shape — one file, `defineManifest({ ...commands })`.
- **Old CLI has a nested command tree** (Oclif's `commands/` directory, Commander's grouped subcommands, argparse subparsers-of-subparsers, a `git`-style `noun verb` CLI): port to the directory-scanned shape, and let the new directory structure mirror the old command tree:

```
my-cli/
├── main.ts           # new entrypoint: run(config, import.meta), no config.manifest set
├── commands/
│   ├── deploy.ts          # was: old CLI's `deploy` command
│   ├── db/
│   │   └── migrate.ts     # was: old CLI's `db migrate` subcommand
│   └── ...
├── package.json
└── tsconfig.json
```

Shared helpers the old commands imported (config loaders, API clients, formatting utilities) move to plain modules alongside `commands/` (e.g. `lib/`, `state.ts`) — they must **not** live inside the commands directory, since CTI turns every `.ts` file under it into a route. A file named `index.ts` collapses into its parent's route (`commands/db/index.ts` → `db`); files matching `*.test.ts` are skipped.

## Step-by-step conversion

### 1. Set up the entrypoint

```typescript
// main.ts
import { run } from 'cti'

void run({ name: 'my-cli', commandsDir: 'commands', version: '1.0.0' }, import.meta)
```

or, for the inline shape:

```typescript
import { command, defineManifest, run } from 'cti'

const deploy = command({ /* ... */ })
const rollback = command({ /* ... */ })

void run({ name: 'my-cli', version: '1.0.0', manifest: defineManifest({ deploy, rollback }) })
```

`Config` is `{ name, version, commandsDir?, targets?, bin?, manifest? }` — carry over the old CLI's package name/version/bin name here. There's no config file format to migrate to; it's just a plain object.

### 2. Convert one command at a time

For each row in your inventory, create the command file at the path matching its route, and build it with the `command()` helper:

```typescript
import { command } from 'cti'

interface DeployFlags {
  env: string
  force: boolean
}

export default command<DeployFlags>({
  meta: {
    description: 'Deploy application to an environment',
    // carry over old --help text and usage examples here
    examples: ['my-cli deploy', 'my-cli deploy --env=prod --force'],
  },
  flags: {
    env: { type: 'string', default: 'staging', description: 'Target environment' },
    force: { type: 'boolean', short: 'f', description: 'Skip confirmation' },
  },
  run(ctx) {
    const env = ctx.flags.env // typed, not any — because of the <DeployFlags> generic
    // paste the old handler's body here, then work through the mapping table below
  },
})
```

Map old constructs onto CTI's contract:

| Old CLI concept                                    | CTI equivalent                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `.option('--env <env>', 'desc', 'staging')`          | `flags: { env: { type: 'string', default: 'staging', description: 'desc' } }`   |
| `.option('-f, --force')` (boolean flag)              | `flags: { force: { type: 'boolean', short: 'f' } }`                             |
| Flag repeated / array-valued (`--tag a --tag b`)     | `flags: { tag: { type: 'string', multiple: true } }`                            |
| `.choices(['dev', 'staging', 'prod'])`               | `flags: { env: { type: 'string', choices: ['dev', 'staging', 'prod'] as const } }` |
| Custom flag validation function                     | `flags: { env: { validate: (v) => isValid(v) || 'must be dev/staging/prod' } }` |
| `.argument('<source>')` / `.argument('[dest]')`      | Declare in `args` for documentation; read via `ctx.positionals[0]` — CTI doesn't enforce arity for you, so validate at the top of `run()` |
| Variadic positional (`<files...>`)                   | `args: [{ name: 'files', variadic: true }]`, read the tail of `ctx.positionals` yourself |
| `process.exit(1)` on failure                         | `return 1` from `run()` — the runtime sets `process.exitCode`, never call `process.exit()` yourself |
| Top-level `try/catch` around the whole CLI           | Delete it — the runtime already catches thrown errors, formats them as `Error: <message>`, and exits 1. Keep your own `try/catch` only where you want a *better* message than the generic one |
| `chalk`/`kleur`/ANSI-escape output                   | `ctx.io.color(text, colorName)` — American spelling, `Color` is `'red' \| 'green' \| 'yellow' \| 'blue' \| 'magenta' \| 'cyan' \| 'gray'` |
| `console.log` / `process.stdout.write`               | `ctx.io.write(text)`                                                            |
| `console.error` / `process.stderr.write`             | `ctx.io.writeError(text)`                                                        |
| `inquirer`/`prompts`/readline-based prompt            | `await ctx.io.prompt(question)`, `await ctx.io.confirm(question, fallback)`, `await ctx.io.select(question, choices)` |
| `ora` or hand-rolled spinner                         | `ctx.io.spinner(text)` → `.succeed(msg)` / `.fail(msg)`                          |
| debug logging behind a `--verbose`/`DEBUG` env check | `ctx.logger.debug(...)` — already gated on the `DEBUG` env var; `logger.info/warn/error` always print |
| Global config object / env lookup                    | `ctx.config` (whatever you built in `main.ts`) and `ctx.env` (a snapshot of `process.env`) |
| `process.cwd()` scattered through handlers            | `ctx.cwd`                                                                        |

### 3. Delete the old dispatch layer

Once every command from the inventory has a CTI file, remove:
- The old argv-parsing library and its setup code (`yargs()`, `program.parse()`, Oclif's `Command` base class boilerplate, etc.)
- Any hand-written help/usage text generator — `meta.description` and `meta.examples` replace it
- The old top-level error handler / process-exit-code plumbing
- Old flag-coercion helpers (string-to-number, string-to-boolean parsing) — CTI's flag `type` does this via `util.parseArgs` under the hood, including for numeric defaults

### 4. Verify parity before cutting over

For every inventory row, run the same invocation against both the old and new CLI and diff stdout/stderr/exit code (modulo cosmetic differences like colour codes or spinner frames — compare on substrings/regex, not byte-for-byte). This catches the two most common regressions in this kind of port:
- A flag default that was implicit in the old parser and got dropped when it was made explicit in `FlagSpec`
- A positional that the old CLI treated as required (and errored without) but which CTI leaves as `undefined` unless you add your own check

Add a unit test per migrated command as you go — construct a `Context` directly and call `command.run(ctx)`:

```typescript
import { describe, test, expect } from 'bun:test'
import command from './commands/deploy'
import type { Context, Io, Logger } from 'cti'

test('deploys to the given environment', async () => {
  const ctx: Context<{ env: string; force: boolean }> = {
    flags: { env: 'prod', force: false },
    positionals: [],
    route: ['deploy'],
    cwd: '/tmp',
    env: {},
    config: { name: 'my-cli', version: '1.0.0' },
    io: { write: () => {}, writeError: () => {}, confirm: async () => true } as unknown as Io,
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } as Logger,
  }
  expect(await command.run(ctx)).toBe(0)
})
```

Mirror the new `commands/` layout in the test directory (`commands/db/migrate.ts` → `tests/unit/commands/db/migrate.test.ts`), and add one black-box test per command that spawns the real entrypoint (`Bun.spawn(['bun', 'run', 'main.ts', ...args])`) so routing and flag-parsing are exercised together, matching how a user actually invokes the CLI.

### 5. Rebuild the distribution step

Whatever packaged the old CLI (`pkg`, `nexe`, a Docker image wrapping Node, a shebang'd JS file) is replaced by one command:

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli deploy --env=prod
```

Drop the old build pipeline entirely — there is no separate bundling/minification/packaging step to keep around.

## Common pitfalls when migrating

- **Porting the dispatch loop instead of deleting it.** The single biggest source of wasted effort is trying to keep the old argv-parsing/routing code "just in case." CTI's router and parser fully replace it — if a command isn't reachable after the port, that's a missing manifest entry or misplaced file, not a gap to patch with old code.
- **Forgetting positionals aren't validated for you.** Frameworks like Commander throw automatically on a missing required argument. CTI hands you `ctx.positionals` as a plain array; a missing required positional is just `undefined` until you check for it yourself.
- **Leaving shared helpers inside the commands directory.** In a directory-scanned CLI, any `.ts` file under `commandsDir` becomes a route unless it's `*.test.ts`. A helper module accidentally left in `commands/` becomes a phantom command.
- **Assuming `colour` (British spelling) works.** The interface is `ctx.io.color` with type `Color`. Any ported snippet, comment, or documentation that says `colour`/`Colour` needs the American spelling substituted before it will compile.
- **Re-wrapping errors that don't need it.** The runtime already catches thrown errors and reports them with exit code 1. Only add your own `try/catch` where you want to show a more specific message than the generic `Error: <message>`.
