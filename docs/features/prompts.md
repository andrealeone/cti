# Prompts

`ctx.io` exposes three prompt primitives — `prompt`, `confirm`, `select` — for
asking the user something. They read real lines from `process.stdin`.

```typescript
run(ctx) {
  const name = await ctx.io.prompt('What is your name?')
  const confirmed = await ctx.io.confirm('Are you sure?', false)
  const choice = await ctx.io.select('Choose an environment:', [
    'development', 'staging', 'production',
  ] as const)
}
```

## `prompt(question)`

Writes `question` to stdout, then reads and trims the next line from stdin.
Resolves to `''` if stdin closes before a line arrives (no input piped, or a
closed/non-interactive stream) — the same value a command gets today if the
user just hits enter.

## `confirm(question, fallback = false)`

Prints `question` with a `(Y/n)`/`(y/N)` hint reflecting `fallback`, then
reads a line. An empty line (including EOF: stdin closes with nothing more to
read) resolves to `fallback`; otherwise resolves to `true` for `y`/`yes`
(case-insensitive), `false` for anything else.

## `select(question, choices)`

`choices` is a plain array of strings (`readonly T[]`, not `{label, value}`
pairs — see [why](#why-plain-strings-not-labelvalue-pairs) below). Prints
`question`, then each choice as a numbered line, then reads a number. An
empty line resolves to the first choice; an out-of-range or non-numeric
answer re-prompts.

```
Choose an environment:
  1) development
  2) staging
  3) production
Enter a number (default: 1)
```

## Why plain strings, not label/value pairs

A richer `{ value, label, hint }` shape would read nicer for something like a
wizard with an explanatory blurb per option, but it would also mean every
`select` call site pays for that shape even when the choices are already
self-describing strings (`demos/interactive-io`'s `ROLES` array, most `enum`-
like use cases). If a choice needs more explanation than its own text
provides, put that explanation in the string itself:

```typescript
await ctx.io.select('Command style?', [
  'Recommended: command auto-discovery — commands live in commands/',
  'Single-file, manifest-based configuration — everything in main.ts',
] as const)
```

`concise-ti init`'s own wizard does exactly this — see
[The `concise-ti` CLI](cli.md).

## Non-interactive / closed stdin

There's no `isTTY` branch: a piped answer (`echo 'Alice' | my-cli greet`) and
a real terminal both just produce a line to read. The only fallback path is
an empty line, which is also what a closed/non-interactive stdin produces
once it hits EOF — so `confirm`'s `fallback` and `select`'s "first choice"
default cover both "the user pressed enter" and "there was no stdin to read"
uniformly, with no separate code path to test.

## Cleanup

All three share one lazily-created `readline` interface on `process.stdin`.
`run()` closes it after every command (`invokeCommand`'s `finally`, in
`src/core/runtime.ts`), whether or not that command prompted — once these
read from a real stream instead of resolving instantly, an unclosed
interface would keep the process alive after dispatch finishes.

## See also

- [The `concise-ti` CLI](cli.md): `concise-ti init`/`scaffold` are built on these same primitives, not a separate implementation
- [Roadmap](../future/roadmap.md): this used to be a tracked "Phase 0" item; it's done
