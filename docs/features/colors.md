# Colors

concise-ti wraps text in ANSI escape codes through `ctx.io.color()`. Output is only
colored when it makes sense to: a real terminal, and the user hasn't opted out.

## `io.color(text, color)`

```typescript
run(ctx) {
  const success = ctx.io.color('Done!', 'green')
  const error = ctx.io.color('Failed!', 'red')
  ctx.io.write(success)
  ctx.io.writeError(error)
}
```

## Available colors

Seven semantic colors: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`,
`gray`. Enough to cover errors, success, warnings, and de-emphasis without
turning into a design system.

## TTY-aware by default

```bash
app command              # colored, if stdout is a terminal
app command | cat        # plain text, since stdout is piped
NO_COLOR=1 app command   # plain text, an explicit opt-out
```

`io.color()` already checks this for you. Call it unconditionally and it does
the right thing in every context.

## `NO_COLOR` and `FORCE_COLOR`

```bash
NO_COLOR=1 app command      # never color, even in a terminal
FORCE_COLOR=1 app command   # always color, even when piped
```

`NO_COLOR` wins if both are set. See [Utils: TTY Detection](../architecture/utils.md).

## Composing colored output

```typescript
run(ctx) {
  const status = ctx.io.color('[OK]', 'green')
  ctx.io.write(`${status} Operation complete`)
}
```

`color()` is pure and has no side effects, so it's safe to call for every line
without a performance concern.
