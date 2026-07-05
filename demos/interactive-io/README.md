# Interactive I/O Demo

A user profile manager CLI that showcases CTI's interactive and logging features.

## Features Demonstrated

### 1. **Logging** (`ctx.logger`)

- `ctx.logger.info()`: General information about operations
- `ctx.logger.warn()`: Warnings when operations don't complete as expected
- `ctx.logger.debug()`: Debug details when DEBUG env var is set
- `ctx.logger.error()`: Error messages for failed operations

### 2. **Interactive Prompts** (`ctx.io.prompt()`)

- Get user input for profile creation
- Demonstrates fallback behavior when stdin is not available (e.g., in tests)

### 3. **Confirms** (`ctx.io.confirm()`)

- Ask yes/no questions with a fallback value
- Used before creating or destructive operations

### 4. **Select** (`ctx.io.select()`)

- Choose from a list of predefined options
- Used to select a role (admin, user, viewer)

### 5. **Spinners** (`ctx.io.spinner()`)

- Show progress during long-running operations
- Used during profile imports

### 6. **Colors** (`ctx.io.color()`)

- Format output with colors
- Role badges display in different colors (red=admin, green=user, yellow=viewer)

### 7. **Stdin** (`Bun.stdin`)

- Read JSON profiles from stdin
- Import multiple profiles at once

## Commands

### `view <user-id>`

View a specific user profile with colored formatting.

```bash
bun run ./main.ts view user-123-abc
```

### `list`

List all stored profiles with color-coded roles.

```bash
bun run ./main.ts list
```

### `create`

Interactively create a new user profile. Prompts for name, email, and role selection.

```bash
bun run ./main.ts create
```

### `import`

Import profiles from a JSON array on stdin.

```bash
echo '[{"name":"Alice","email":"alice@example.com","role":"admin"}]' | bun run ./main.ts import
```

## Storage

Profiles are persisted to `~/.cti-profiles.json` as a JSON array.

## Testing

The demo is validated end-to-end in `tests/demos.test.ts`. Each command is tested with:

- Proper exit codes
- Expected output fragments
- Stdin feeding (for import)
- Isolated home directories (to avoid touching the real machine)
- Color stripping (NO_COLOR env var) for deterministic assertions

```bash
bun test tests/demos.test.ts
```

## Key Patterns

1. **Discovery-based manifest**: Commands are automatically loaded from `commands/*.ts` files
2. **Async/await**: All commands use async operations (file I/O, stdin, prompts)
3. **Proper error handling**: Validates input and returns exit codes (0 = success, 1 = failure)
4. **Logger-first design**: Important events are logged for debugging and audit trails
5. **Graceful fallbacks**: Interactive prompts/confirms work with stubbed defaults in non-TTY environments
