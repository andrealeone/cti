# Validation

`FlagSpec.choices` and `FlagSpec.validate` (and `ArgSpec.validate`) exist as
types today, but **the parser doesn't call them yet**. See the
[Roadmap](../future/roadmap.md) for enforcement landing in a future release.
Until then, validate inside your handler, where you also control the error
message and exit code.

## The pattern

```typescript
export default command({
  flags: {
    port: { type: 'number' },
  },
  run(ctx) {
    const port = ctx.flags.port as number

    if (!(port > 0 && port < 65536)) {
      ctx.io.writeError('Port must be between 1 and 65535')
      return 1
    }

    // proceed with a valid port
  },
})
```

Returning a non-zero number from `run` is how you signal a usage error. See
[Command Modules](command-modules.md#exit-codes).

## Common checks

**File existence**

```typescript
import { existsSync } from 'node:fs'

run(ctx) {
  const file = ctx.positionals[0]
  if (!file || !existsSync(file)) {
    ctx.io.writeError('File not found')
    return 1
  }
}
```

**Choice constraint** (until `choices` is enforced by the parser)

```typescript
run(ctx) {
  const format = ctx.flags.format as string
  if (!['json', 'csv', 'xml'].includes(format)) {
    ctx.io.writeError(`Invalid format: ${format}. Expected json, csv, or xml.`)
    return 1
  }
}
```

**URL format**

```typescript
run(ctx) {
  try {
    new URL(ctx.flags.url as string)
  } catch {
    ctx.io.writeError('Invalid URL')
    return 1
  }
}
```

## Async validation

Since validation lives in your handler rather than a framework hook, it can be
async without restriction: check a database, call an API, whatever the check
needs:

```typescript
run: async (ctx) => {
  const exists = await checkDatabase(ctx.flags.id)
  if (!exists) {
    ctx.io.writeError('Unknown ID')
    return 1
  }
}
```

## Writing good error messages

Be specific about what was wrong and what's expected:

```typescript
// Clear and actionable
if (value.length < 1) return ctx.io.writeError('Name must not be empty'), 1

// Less helpful
if (value.length < 1) return ctx.io.writeError('Invalid input'), 1
```
