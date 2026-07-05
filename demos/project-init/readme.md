# Project Init Demo

A scaffolding CLI that writes real files to disk, showcasing flags with defaults and filesystem output.

## Commands

### `init [name]`

Scaffold a new project directory (defaults to "my-project").

```bash
bun run ./main.ts init my-app --type cli --typescript
```

Creates `<name>/package.json`, `<name>/README.md`, and (unless `--typescript=false`) `<name>/tsconfig.json`.

## Key Patterns

1. **Boolean flag with default `true`**: `--typescript` is on by default; pass `--typescript=false` to opt out
2. **Filesystem side effects**: uses `node:fs` directly from within a command handler
3. **`ctx.cwd`**: resolves the target directory relative to where the CLI was invoked
