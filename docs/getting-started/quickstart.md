## Quick Start

This walks the same ground as the [top-level README](../../README.md) in more
detail, then points you to what to read next. If you've already run the README's
example, skip to [Next steps](#next-steps).

### Install

Requires [Bun](https://bun.sh) 1.3 or later.

```bash
mkdir my-cli && cd my-cli
bun init -y
bun add cti
```

### Your first command

CTI discovers commands from a `commands/` directory next to your entrypoint -
no manifest to write by hand for this to work.

Create `commands/hello.ts`:

```typescript
import { command } from 'cti'

export default command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    ctx.io.write(`Hello, ${name}!`)
  },
})
```

Create `main.ts`:

```typescript
import { run } from 'cti'

void run({ name: 'my-cli', version: '1.0.0' }, import.meta)
```

Run it:

```bash
bun run ./main.ts hello Alice
# Hello, Alice!
```

### Add a flag

```typescript
export default command({
  meta: { description: 'Greet someone' },
  flags: {
    formal: { type: 'boolean', short: 'f', description: 'Use a formal greeting' },
  },
  run(ctx) {
    const name = ctx.positionals[0] ?? 'World'
    const greeting = ctx.flags.formal ? 'Greetings' : 'Hello'
    ctx.io.write(`${greeting}, ${name}!`)
  },
})
```

```bash
bun run ./main.ts hello Alice --formal
# Greetings, Alice!
```

### Compile to a binary

```bash
bun build ./main.ts --compile --outfile dist/my-cli
./dist/my-cli hello Bob
# Hello, Bob!
```

### Next steps

- **[Core Concepts](../concepts/core-concepts.md)**: the mental model: commands, manifest, runtime
- **[Building Commands](../guides/building-commands.md)**: flags, positionals, I/O, error handling
- **[Manifest](../features/manifest.md)**: when to prefer an inline `defineManifest` over filesystem discovery
- **[Examples](../guides/examples.md)** and **[Demos](../guides/demos.md)**: more real-world usage
