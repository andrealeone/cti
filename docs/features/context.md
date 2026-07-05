# Context

The context object is the single argument passed to every command's `run`
function. It's the only thing a handler reads, and `run()` is the only thing
that writes it, and that separation is what makes commands easy to test.

```typescript
interface Context<F = Record<string, unknown>, C extends Config = Config> {
  flags: F
  positionals: string[]
  route: string[]
  cwd: string
  env: Record<string, string | undefined>
  config: C
  io: Io
  logger: Logger
}
```

## Flags

Parsed and coerced according to the command's `flags` spec. See
[Flag Parsing](flag-parsing.md):

```typescript
export default command({
  flags: {
    verbose: { type: 'boolean', short: 'v' },
    count: { type: 'number', default: 1 },
  },
  run(ctx) {
    ctx.flags.verbose // boolean
    ctx.flags.count // number
  },
})
```

## Positionals

Non-flag arguments left over after routing, in order, always `string[]`. See
[Positional Arguments](positional-arguments.md).

## Route

The matched route as an array, e.g. `['db', 'migrate']` for `app db migrate`:

```typescript
run(ctx) {
  ctx.io.write(ctx.route.join(' ')) // 'db migrate'
}
```

Useful for logging which command ran, or for a command that needs to know its
own path.

## `cwd` and `env`

```typescript
run(ctx) {
  ctx.io.write(`Running in ${ctx.cwd}`)
  const apiKey = ctx.env.API_KEY
}
```

`env` is `process.env`, typed as `Record<string, string | undefined>`.

## Config

The `Config` object passed to `run()`:

```typescript
interface Config {
  name: string
  version: string
  commandsDir?: string
  targets?: string[]
  bin?: string
  manifest?: Manifest
}
```

```typescript
run(ctx) {
  ctx.io.write(`${ctx.config.name} v${ctx.config.version}`)
}
```

Extend `Config` with your own properties (an API base URL, feature flags,
whatever your commands need); concise-ti only reads the fields above.

```typescript
interface ApiClientConfig extends Config {
  apiVersion: string
}

const config: ApiClientConfig = { name: 'api-client', version: '1.0.0', apiVersion: 'v2' }

void run<ApiClientConfig>(config, import.meta)
```

Passing `ApiClientConfig` as `run`'s type argument makes `ctx.config` typed as
`ApiClientConfig` in every command, once that command opts in with the same
type on `command()`:

```typescript
export default command<Record<string, unknown>, ApiClientConfig>({
  run(ctx) {
    ctx.config.apiVersion // string, not a cast
  },
})
```

Without the second `command()` type argument, `ctx.config` stays typed as the
base `Config`. See [Type safety with generics](#type-safety-with-generics)
below and `demos/api-client`.

## `io` and `logger`

```typescript
run(ctx) {
  ctx.io.write('Output')
  ctx.io.writeError('Error')
  ctx.logger.debug('Starting operation')
}
```

See [I/O System](../architecture/io.md) and [Logger](logger.md).

## Type safety with generics

`Context<F, C>` carries your flag shape and your `Config` shape:

```typescript
interface DeployFlags {
  environment: string
  force: boolean
}

export default command<DeployFlags>({
  flags: {
    environment: { type: 'string', default: 'staging' },
    force: { type: 'boolean' },
  },
  run(ctx) {
    ctx.flags.environment // string, not unknown
    ctx.flags.force // boolean, not unknown
  },
})
```

`C` works the same way for an extended `Config` (default `Config` if omitted):

```typescript
export default command<DeployFlags, DeployConfig>({
  run(ctx) {
    ctx.config.someExtendedField // typed, not a cast
  },
})
```
