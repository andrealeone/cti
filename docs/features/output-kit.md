# Output Kit

`ctx.io` is the TTY-aware interface for everything a command writes to the
terminal or asks the user: plain output, color, spinners, and prompts.

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

## Writing output

```typescript
run(ctx) {
  ctx.io.write('Operation complete')
  ctx.io.writeError('Something went wrong')
}
```

`write` goes to stdout, `writeError` to stderr; both append a newline.

## `isTTY`

```typescript
run(ctx) {
  if (ctx.io.isTTY) {
    // interactive terminal
  } else {
    // piped, redirected, or run in CI
  }
}
```

## `NO_COLOR` / `FORCE_COLOR`

`color()` respects the [NO_COLOR](https://no-color.org) convention and the
`FORCE_COLOR` override automatically. See [Colors](colors.md).

## What's implemented vs. stubbed

`write`, `writeError`, `color`, and `isTTY` are fully implemented. `spinner`,
`prompt`, `confirm`, and `select` are stable interfaces backed by no-op stubs
today. See [Spinners](spinners.md), [Prompts](prompts.md), and the
[Roadmap](../future/roadmap.md).
