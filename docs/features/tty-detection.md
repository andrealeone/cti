# TTY Detection

CTI checks whether stdout is connected to a terminal (interactive) or piped
(to a file, another process, or a CI log) and adapts color, spinners, and
prompts accordingly.

## `ctx.io.isTTY`

```typescript
run(ctx) {
  if (ctx.io.isTTY) {
    ctx.io.write('Interactive mode')
  } else {
    ctx.io.write('Non-interactive mode')
  }
}
```

```bash
app command              # stdout is a TTY
app command | cat        # stdout is not a TTY
app command > file.txt   # stdout is not a TTY
```

## What changes with TTY status

| Interactive (TTY)     | Non-interactive (piped/redirected) |
| ---------------------- | ----------------------------------- |
| Colors applied          | Colors stripped                     |
| Spinners animate*        | Spinners print once, no animation*   |
| Prompts read input*       | Prompts return their fallback*        |

\* Spinner and prompt implementations are currently no-op stubs. See
[Spinners](spinners.md) and [Prompts](prompts.md). Color is the one primitive
that's fully wired to TTY detection today.

## `NO_COLOR` / `FORCE_COLOR`

```bash
NO_COLOR=1 app command             # no color, even in a terminal
FORCE_COLOR=1 app command | cat    # color, even when piped
```

`io.color()` already checks these; call it unconditionally:

```typescript
run(ctx) {
  ctx.io.write(ctx.io.color('Done', 'blue'))
}
```

## Implementation

```typescript
export function isTTY(): boolean {
  return process.stdout.isTTY === true
}
```

Reliable across platforms; this is the same check Node and Bun use internally.
See [Utils](../architecture/utils.md).
