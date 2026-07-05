# Flag Parsing

Flags are declared as plain objects on a command's `flags` map, with no builder
functions to import. concise-ti parses them with Node's `util.parseArgs` and coerces
each value to its declared type.

```typescript
import { command } from 'concise-ti'

export default command({
  flags: {
    verbose: { type: 'boolean', short: 'v' },
    count: { type: 'number', default: 1 },
    output: { type: 'string', short: 'o' },
  },
  run(ctx) {
    ctx.io.write(`${ctx.flags.verbose} ${ctx.flags.count} ${ctx.flags.output}`)
  },
})
```

## Flag types

Three types are supported: `string`, `boolean`, `number`. See
[Type Coercion](type-coercion.md) for exactly how each is converted.

## Short aliases

```bash
app --verbose   # same as
app -v
```

```typescript
verbose: { type: 'boolean', short: 'v' }
```

## Defaults

```typescript
flags: {
  steps: { type: 'number', default: 1 },
  format: { type: 'string', default: 'json' },
}
```

A default is used as-is (never coerced) when the flag is omitted.

## Multiple values

```typescript
tags: { type: 'string', multiple: true }
```

```bash
app --tags foo --tags bar  # ctx.flags.tags = ['foo', 'bar']
```

## `required`, `choices`, `validate`

`FlagSpec` also declares these three:

```typescript
interface FlagSpec {
  type: 'string' | 'boolean' | 'number'
  short?: string
  description?: string
  default?: string | boolean | number
  required?: boolean
  multiple?: boolean
  choices?: readonly string[]
  validate?: (value: unknown) => true | string
}
```

**They are not enforced by the parser yet.** Declaring `required: true` or
`choices: ['json', 'csv']` documents intent and types `ctx.flags` correctly,
but a missing required flag or an out-of-choices value currently passes
through unchecked. Enforcing them during parsing is a tracked
[Roadmap](../future/roadmap.md) item. Until then, check inside your handler:

```typescript
run(ctx) {
  const format = ctx.flags.format as string
  if (!['json', 'csv', 'xml'].includes(format)) {
    ctx.io.writeError(`Invalid format: ${format}`)
    return 1
  }
}
```

## How parsing works

1. Each `FlagSpec` is converted to a Node `parseArgs` option (`type`, `short`,
   `multiple`; a numeric `default` is stringified for `parseArgs` and coerced
   back afterward)
2. `parseArgs` tokenizes `argv` against those options
3. Each parsed value is coerced to its declared type
4. Values with no match fall back to the flag's `default`, if any

See [Core Module](../architecture/core.md) for the implementation.
