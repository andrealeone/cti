# Data Transform Demo

A file/stdin transformation CLI showcasing directory-discovered commands, positionals, and stdin reading.

## Commands

### `convert <from> <to> <file>`

Convert a file between `csv`, `json`, and `table` (output only).

```bash
bun run ./main.ts convert csv json data.csv
```

### `format [target]`

Read JSON on stdin and render it as `json` (default), `csv`, or `table`.

```bash
cat data.json | bun run ./main.ts format table
```

### `stats <file>`

Show statistics about a csv or json file (row/column counts, or type/size).

```bash
bun run ./main.ts stats data.csv
```

## Key Patterns

1. **Discovery-based manifest**: commands are loaded from `commands/*.ts` via `run(config, import.meta)`
2. **Shared format helpers**: `lib/formats.ts` centralizes CSV parsing/rendering and table rendering
3. **Stdin reading**: `format` awaits `Bun.stdin.text()` for pipeline-friendly usage
