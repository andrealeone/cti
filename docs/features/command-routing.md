# Command Routing

concise-ti routes commands from the file structure of your `commands` directory (or an
inline manifest; see [Manifest](manifest.md)). Each command file becomes a
route; directory nesting becomes a command path.

## File structure to route mapping

```
commands/
├── greet.ts           → app greet
├── db/
│   ├── migrate.ts     → app db migrate
│   └── reset.ts       → app db reset
└── remote/
    └── add.ts         → app remote add
```

There's no limit to nesting depth, and `index.ts` collapses into its parent's
route (`commands/db/index.ts` → `app db`).

## Route resolution

When a user runs `app db migrate --force extra`, the router:

1. Tries the **longest** possible prefix of the arguments against the manifest
   (`db migrate --force extra`, then `db migrate --force`, ... down to `db`)
2. The first prefix that matches a route wins; everything after it becomes
   `remaining`, the argv the parser sees
3. `db migrate` matches, so `remaining = ['--force', 'extra']` is parsed
   against `db migrate`'s `flags`, and `'extra'` ends up in `ctx.positionals`

If nothing matches, `run()` writes `Unknown command: ...` to stderr and
resolves to exit code `1`. There is no group-level help yet for a partial
route like `app db` with no matching leaf command; only exact routes resolve,
including the default `help` and `version` routes described in
[Default Commands](default-commands.md). Running with no arguments at all is
the one exception — it dispatches to `config.entry` (default `'help'`)
rather than erroring.

## Route arrays

Internally a route is a `string[]`: `commands/db/migrate.ts` becomes
`['db', 'migrate']`, available in every handler as `ctx.route`.

## See also

- [Manifest](manifest.md): how routes are built, from a file tree or an inline map
- [Default Commands](default-commands.md): the `help`/`version` routes added automatically, `config.skip`, and `config.entry`
- [Core Module](../architecture/core.md): `buildRouteLookup` / `resolveRoute` implementation
