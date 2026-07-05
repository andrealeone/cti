# Command Modules

A command module is the default export of a command file: a plain object
describing what the command does, what flags/positionals it accepts, and how
it runs.

```typescript
import { command } from 'concise-ti'

export default command({
  meta: {
    description: 'Apply pending database migrations',
    examples: ['app db migrate', 'app db migrate --steps 2'],
  },
  flags: {
    steps: { type: 'number', default: 1, description: 'Migrations to apply' },
  },
  run(ctx) {
    ctx.io.write(`Applying ${ctx.flags.steps} migration(s)`)
  },
})
```

## The `command()` wrapper

`command()` is the identity function: it returns its argument unchanged. Its
only job is giving TypeScript enough context to infer `ctx.flags`' shape from
your `flags` declaration, so wrap every command definition with it rather than
exporting a plain object literal.

```typescript
export function command<F = Record<string, unknown>>(module: CommandModule<F>): CommandModule<F> {
  return module
}
```

It does not validate anything at load time; a malformed `FlagSpec` or missing
`run` is caught by the TypeScript compiler (`bun run check:types`), not at
runtime.

## Minimal command

Only `run` is required:

```typescript
export default command({
  run(ctx) {
    ctx.io.write('Hello!')
  },
})
```

## `meta`

```typescript
interface CommandMeta {
  description?: string
  aliases?: readonly string[]
  hidden?: boolean
  examples?: readonly string[]
}
```

All optional, all currently just data carried on the manifest entry.
`description`/`examples` will back generated `--help` output once that lands
(see the [Roadmap](../future/roadmap.md)); `aliases` and `hidden` are likewise
reserved for the help/routing system, not yet read anywhere.

## `flags` and `args`

```typescript
export default command({
  flags: {
    verbose: { type: 'boolean', short: 'v' },
    output: { type: 'string', short: 'o' },
  },
  args: [{ name: 'target', required: false }],
  run(ctx) {
    // ctx.flags.verbose, ctx.flags.output: parsed and typed
    // ctx.positionals[0]: the raw string; args[] is descriptive only today
  },
})
```

See [Flag Parsing](flag-parsing.md) and [Positional Arguments](positional-arguments.md)
for the full spec of each, including what's enforced today versus documented
for later.

## `rawArgs`

Set `rawArgs: true` to bypass flag parsing entirely and receive the command's
remaining argv verbatim in `ctx.positionals`, with `ctx.flags` left `{}`:

```typescript
export default command({
  rawArgs: true,
  run(ctx) {
    // ctx.positionals is the untouched argv tail, e.g. ['./main.ts', '--outfile', 'dist/x']
  },
})
```

This is for commands that forward arbitrary flags to another CLI rather than
declaring their own — `concise-ti compile` uses it to pass `--outfile` and
other `bun build` flags straight through, since strict flag parsing would
otherwise reject any flag not declared on the command itself.

## Nested commands

A file at `commands/db/migrate.ts` is the `db migrate` command. Nesting is
purely a filesystem convention; the module shape doesn't change:

```typescript
// commands/db/migrate.ts
export default command({
  meta: { description: 'Run pending migrations' },
  run(ctx) {
    ctx.io.write('Running migrations...')
  },
})
```

See [Command Routing](command-routing.md).

## The `run` handler

Receives one argument, the `Context`. Destructure what you need or take it
whole:

```typescript
run(ctx) { /* ctx.flags, ctx.positionals, ctx.io, ... */ }
run({ flags, io }) { /* only what you use */ }
run: async (ctx) => { await doWork(ctx) }
```

## Exit codes

```typescript
run(ctx) {
  if (somethingWrong) {
    ctx.io.writeError('Failed!')
    return 1
  }
  return 0
}
```

Returning nothing is equivalent to `0`.
