# Type Coercion

Node's `parseArgs` only understands `string` and `boolean`. concise-ti adds a coercion
step on top so `ctx.flags` matches the type each flag declares, with no manual
casting in handlers.

## How it works

1. `parseArgs` tokenizes `argv` against the flag options
2. For each flag, the declared `type` decides how its raw value is converted
3. The coerced values populate `ctx.flags`

## String

Passed through unchanged:

```typescript
flags: { name: { type: 'string' } }
// --name Alice → ctx.flags.name === 'Alice'
```

## Number

Converted with `Number(value)`; throws if the result is `NaN`:

```typescript
flags: { count: { type: 'number' } }
// --count 42  → ctx.flags.count === 42 (number)
// --count abc → Error: Invalid number: "abc"
```

A thrown coercion error is caught by `run()`, which writes it to stderr and
exits with code `1`, so your handler never sees the bad value.

## Boolean

Already boolean coming out of `parseArgs`; passed through as-is:

```typescript
flags: { verbose: { type: 'boolean' } }
// --verbose      → ctx.flags.verbose === true
// (no flag)      → ctx.flags.verbose === undefined, unless a default is set
```

## Defaults are never coerced

```typescript
flags: { timeout: { type: 'number', default: 5000 } }
```

`5000` is already a `number`, so concise-ti uses it as-is when `--timeout` is omitted.

## Multiple values

Each occurrence is coerced individually:

```typescript
flags: { ports: { type: 'number', multiple: true } }
// --ports 8080 --ports 9000 → ctx.flags.ports = [8080, 9000]
```

## What coercion doesn't do

concise-ti stops at `string` / `number` / `boolean` on purpose: no dates, URLs, or
enum parsing. That logic depends on your domain (timezone? version string vs.
float?), so it belongs in your handler:

```typescript
run(ctx) {
  const birthdate = new Date(ctx.flags.birthdate as string)
  // validate/interpret here
}
```

See [Utils: Coerce](../architecture/utils.md) for the implementation.
