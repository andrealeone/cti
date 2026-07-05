# Deploy Tool Demo

A fake deployment CLI that showcases flags, choices, spinners, and colored output.

## Commands

### `deploy`

Deploy to an environment.

```bash
bun run ./main.ts deploy --env production --region us-east-1 --region eu-west-1 --verbose
```

### `rollback`

Roll back to the previous version. Requires `--force` to confirm.

```bash
bun run ./main.ts rollback --env production --force
```

### `status`

Check deployment status.

```bash
bun run ./main.ts status --env production
```

## Key Patterns

1. **Flag types**: string with `choices`, boolean, and `multiple` (repeatable) flags
2. **Manual validation**: `choices` isn't enforced by the parser, so `deploy` validates `env` itself
3. **Spinners and colors**: `ctx.io.spinner()` and `ctx.io.color()` for terminal feedback
4. **Confirmation guard**: destructive actions (`rollback`) require an explicit flag rather than a prompt
