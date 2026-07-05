# Positional Arguments

Positional arguments are the non-flag tokens left over after routing and flag
parsing, in the order they were given. CTI exposes them as `ctx.positionals: string[]`,
with no per-argument typing or coercion; they're always strings.

## Accessing them

```typescript
export default command({
  run(ctx) {
    const source = ctx.positionals[0]
    const dest = ctx.positionals[1]

    if (!source || !dest) {
      ctx.io.writeError('Usage: copy <source> <dest>')
      return 1
    }

    ctx.io.write(`Copying ${source} to ${dest}`)
  },
})
```

## Where they come from

Positionals are whatever's left after the router consumes the route and the
parser consumes recognized flags:

```bash
my-cli deploy src/ dist/ --force
```

```typescript
ctx.flags = { force: true }
ctx.positionals = ['src/', 'dist/']
```

Route segments never appear in `positionals`; `resolveRoute` strips them
before the parser sees anything. See [Command Routing](command-routing.md).

## `args` metadata

`CommandModule` has an optional `args: ArgSpec[]` field for documenting a
command's expected positionals:

```typescript
interface ArgSpec {
  name: string
  description?: string
  required?: boolean
  variadic?: boolean
  validate?: (value: string) => true | string
}
```

This is currently **descriptive only**; the runtime doesn't read `args` at
all today. Declaring `args: [{ name: 'file', required: true }]` documents
intent (and will back generated `--help` text and validation once that lands,
per the [Roadmap](../future/roadmap.md)), but CTI won't reject a missing or
malformed positional for you. Validate and report errors yourself, as in the
example above.

## Everything is a string

Because there's no coercion step for positionals, `ctx.positionals[1]` is
always `string`, never `number`; convert it yourself:

```typescript
run(ctx) {
  const port = Number(ctx.positionals[0])
  if (Number.isNaN(port)) {
    ctx.io.writeError('Port must be a number')
    return 1
  }
}
```

If a value should be typed and validated by the framework, prefer a **flag**
over a positional. See [Flag Parsing](flag-parsing.md).
