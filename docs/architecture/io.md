## I/O System

concise-ti's I/O module provides the terminal-interaction primitives every command
gets via `ctx.io` and `ctx.logger`: color, spinners, prompts, and logging.

### Factory pattern

`createIo()` and `createLogger()` are called once per invocation and threaded
through the `Context`:

```typescript
export function createIo(): Io {
  return {
    isTTY: isTTY(),
    color: colorize,
    write: (text) => process.stdout.write(text + '\n'),
    writeError: (text) => process.stderr.write(text + '\n'),
    spinner: createSpinner,
    prompt,
    confirm,
    select,
  }
}
```

This makes `io` mockable in tests (pass a fake `Io` into a handler directly)
and guarantees every command in a run shares the same instance.

### Color

```typescript
const ANSI_COLORS: Record<Color, string> = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

export function colorize(text: string, color: Color): string {
  if (!shouldUseColor()) return text
  return `${ANSI_COLORS[color]}${text}${ANSI_RESET}`
}
```

Seven semantic colors, plain ANSI escape codes, no dependency. `shouldUseColor()`
(in [`utils.md`](utils.md)) decides whether to apply them: respects `NO_COLOR`,
`FORCE_COLOR`, and falls back to TTY detection.

### Spinner (a stub today)

```typescript
export function createSpinner(_text: string): SpinnerHandle {
  return { update: () => {}, succeed: () => {}, fail: () => {}, stop: () => {} }
}
```

The `SpinnerHandle` interface is stable, but every method is currently a no-op.
Code written against `ctx.io.spinner(...)` today will keep working unchanged
once a real animated implementation lands. See the [Roadmap](../future/roadmap.md).

### Prompt, confirm, select (stubs today)

```typescript
export function prompt(_question: string): Promise<string> {
  return Promise.resolve('')
}

export function confirm(_question: string, fallback?: boolean): Promise<boolean> {
  return Promise.resolve(fallback ?? false)
}

export function select<T extends string>(_question: string, _choices: readonly T[]): Promise<T> {
  return Promise.resolve(_choices[0])
}
```

None of these read stdin yet: `prompt` always resolves to `''`, `confirm`
always resolves to its `fallback` (`false` if omitted), and `select` always
resolves to the first choice, regardless of TTY state. The interface is
designed so real implementations slot in without changing call sites; see
[Prompts](../features/prompts.md).

### Logger

```typescript
export function createLogger(): Logger {
  return {
    level: 'info',
    debug: (...args) => {
      if (process.env.DEBUG) console.log('[DEBUG]', ...args)
    },
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
  }
}
```

`debug` is gated by the `DEBUG` env var; `info`/`warn`/`error` always print.
`warn`/`error` go to stderr via `console.warn`/`console.error`, matching Unix
convention. The `level` field on `Logger` is currently descriptive only; it
isn't used to filter output.

### Why no dependency

ANSI codes, spinners, and line-based prompts don't need a library. Keeping this
layer dependency-free means it loads instantly and there's nothing to audit or
version. If you need a full terminal UI (tables, layouts, rich components), pull
in a library alongside concise-ti; nothing here prevents that.

### Related

- **[Core Concepts](../concepts/core-concepts.md)**: where `Io` fits in the `Context`
- **[Utils: TTY Detection](utils.md)**: `shouldUseColor`, `isTTY`
- **[Type System](types.md)**: full `Io`/`Logger` type definitions
- **[Colors](../features/colors.md)**, **[Prompts](../features/prompts.md)**, **[Spinners](../features/spinners.md)**, **[Logger](../features/logger.md)**
