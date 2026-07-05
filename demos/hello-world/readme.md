# Hello World Demo

The smallest possible CTI CLI: two commands, no flags, no I/O beyond stdout.

## Commands

### `hello [name]`

Greet someone (defaults to "World").

```bash
bun run ./main.ts hello Alice
```

### `goodbye [name]`

Say goodbye to someone (defaults to "World").

```bash
bun run ./main.ts goodbye Alice
```

## Key Patterns

1. **Inline manifest**: commands are defined in `main.ts` and wired via `defineManifest`, no `commands/` directory needed
2. **Positional arguments**: `ctx.positionals[0]` reads the first positional with a fallback default
