## Utilities Module

Two files, two stateless responsibilities that other modules depend on:

- **`coerce.ts`**: type coercion (string → number, etc.)
- **`tty.ts`**: terminal capability detection

### `coerceValue(value, spec)`

Everything out of `parseArgs` is a `string` or `boolean`. `coerceValue` converts
a parsed value to the type its `FlagSpec` declares:

```typescript
export function coerceValue(value: unknown, spec: FlagSpec): unknown {
  if (value === undefined) return undefined

  if (spec.type === 'boolean') return value
  if (spec.type === 'number') {
    const num = Number(value)
    if (Number.isNaN(num)) throw new Error(`Invalid number: ${JSON.stringify(value)}`)
    return num
  }

  return value
}
```

- **`number`**: `Number(value)`; throws if the result is `NaN`
- **`boolean`**: passed through (already boolean from `parseArgs`)
- **`string`**: passed through unchanged

A thrown coercion error is caught by `run()`'s dispatcher, which writes a
message to stderr and returns exit code `1`, so commands never see a malformed
value.

concise-ti deliberately stops at these three primitive types. Semantic coercion
(dates, URLs, enums beyond `choices`) belongs in your handler, where the right
validation and error message depend on your domain:

```typescript
flags: { birthdate: { type: 'string' } },
run(ctx) {
  const birthdate = new Date(ctx.flags.birthdate as string)
  // validate here
}
```

### `shouldUseColor()` and `isTTY()`

```typescript
export function shouldUseColor(): boolean {
  if (process.env.NO_COLOR) return false
  if (process.env.FORCE_COLOR) return true
  return process.stdout.isTTY === true
}

export function isTTY(): boolean {
  return process.stdout.isTTY === true
}
```

Precedence: `NO_COLOR` always wins (user opt-out), then `FORCE_COLOR` (explicit
override, useful in CI), then actual TTY detection. This is what
[`colorize`](io.md) calls before applying ANSI codes.

### Related

- **[Core Module](core.md)**: where `coerceValue` is called from the parser
- **[I/O System](io.md)**: where `shouldUseColor` is called from `colorize`
- **[Type System](types.md)**: the `FlagSpec` and `Color` types these operate on
