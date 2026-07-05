# Spinners

`ctx.io.spinner(text)` returns a `SpinnerHandle` for long-running operations.
**The current implementation is a no-op stub**: every method is a stable,
callable placeholder with no visible effect yet; animation is a tracked
[Roadmap](../future/roadmap.md) item.

```typescript
interface SpinnerHandle {
  update: (text: string) => void
  succeed: (text?: string) => void
  fail: (text?: string) => void
  stop: () => void
}
```

## Usage

Write handlers against the real interface; nothing changes when animation
lands:

```typescript
run: async (ctx) => {
  const spinner = ctx.io.spinner('Deploying...')
  try {
    await deploy()
    spinner.succeed('Deployment complete')
  } catch (err) {
    spinner.fail('Deployment failed')
    throw err
  }
}
```

## What each method will do

- **`update(text)`**: change the displayed text while running
- **`succeed(text?)`**: stop with a success indicator, optionally updating the text
- **`fail(text?)`**: stop with a failure indicator, optionally updating the text
- **`stop()`**: stop without indicating success or failure

## Why ship the interface before the implementation

Commands written today (`spinner.succeed(...)` around real async work) don't
need to change when a real animated spinner replaces the stub; only
`createSpinner` in `src/io/spinner.ts` does. See [I/O System](../architecture/io.md).
