# Todo App Demo

A stateful CLI backed by a JSON file, showcasing directory-based command discovery and mutation helpers.

## Commands

### `add <text...>`

Add a new TODO item.

```bash
bun run ./main.ts add Buy milk
```

### `list`

List all TODO items.

```bash
bun run ./main.ts list
```

### `complete <id>`

Mark a TODO as complete.

```bash
bun run ./main.ts complete 1
```

### `delete <id>` (alias: `rm`)

Delete a TODO item.

```bash
bun run ./main.ts delete 1
```

### `clear` (hidden)

Delete all completed TODOs. Kept out of generated help via `meta.hidden`, but still routable.

```bash
bun run ./main.ts clear
```

## Storage

Todos are persisted to a JSON file via `state.ts` (`loadTodos`/`saveTodos`/`mutateById`).

## Key Patterns

1. **`commandsDir: 'lib'`**: commands are discovered from `lib/` instead of the default `commands/`
2. **Shared mutation helper**: `mutateById` in `state.ts` centralizes the load → find → mutate → save cycle
3. **Command aliases**: `delete` is also reachable as `rm`
4. **Hidden commands**: `meta.hidden` removes a command from help output without removing it from routing
