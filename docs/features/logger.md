# Logger

`ctx.logger` is for diagnostics, separate from `ctx.io.write()`, which is for
the output your command exists to produce.

```typescript
interface Logger {
  level: LogLevel
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}
```

## Levels

```typescript
run(ctx) {
  ctx.logger.debug('Starting operation', { args: ctx.flags })
  ctx.logger.info('Operation successful')
  ctx.logger.warn('Deprecated flag used')
  ctx.logger.error('Operation failed', err)
}
```

`debug` only prints when the `DEBUG` environment variable is set; `info`,
`warn`, and `error` always print:

```bash
app deploy          # debug logs hidden
DEBUG=1 app deploy  # debug logs visible
```

`info`/`debug` go to stdout via `console.log`; `warn`/`error` go to stderr via
`console.warn`/`console.error`. Each is prefixed: `[DEBUG]`, `[INFO]`, `[WARN]`,
`[ERROR]`.

```typescript
logger.info('User logged in:', user.name, 'from', user.ip)
// [INFO] User logged in: alice from 192.168.1.1
```

## `logger` vs. `io.write()`

- `io.write()`: the command's actual output; what a user redirects, greps, or pipes
- `logger`: diagnostics for you and your users while debugging, not the product of the command

## `level`

`Logger.level` is currently descriptive (always `'info'`); it isn't used to
filter which methods print. `debug` gating is the `DEBUG` env var, and the
other three levels always print regardless of `level`.
