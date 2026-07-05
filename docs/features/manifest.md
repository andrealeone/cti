# Manifest

A **manifest** is the map from route to command module the router dispatches
against. Every CLI has exactly one, whether you write it by hand or let CTI
build it from your filesystem.

```typescript
interface Manifest {
  entries: ManifestEntry[]
}

interface ManifestEntry {
  route: string[] // e.g. ['db', 'migrate']
  sourcePath: string
  importer: () => Promise<{ default: CommandModule }>
  meta?: CommandMeta
}
```

Two functions build one. Both produce the exact same shape, so the router,
argument parsing, and dispatch behave identically regardless of which you use;
swapping one for the other never touches your commands.

## `defineManifest`, inline

Builds a manifest from an in-memory map of routes to command modules:

```typescript
import { command, defineManifest, run } from 'cti'
import type { Config } from 'cti'

const hello = command({
  meta: { description: 'Greet someone' },
  run(ctx) {
    ctx.io.write(`Hello, ${ctx.positionals[0] ?? 'World'}!`)
  },
})

const config: Config = {
  name: 'my-cli',
  version: '1.0.0',
  manifest: defineManifest({ hello }),
}

void run(config)
```

Keys are slash-delimited routes: `'users/list'` becomes `['users', 'list']`,
invoked as `app users list`. Assigning the result to `config.manifest` tells
`run()` to use it directly instead of scanning a directory.

Reach for this when a handful of commands fit comfortably in one file: demos,
tests, and small CLIs.

## `discoverManifest`, filesystem

Walks a directory of `.ts` files at runtime and turns the file tree into
routes, mirroring file paths:

```
commands/
├── hello.ts          → hello
├── users/
│   ├── list.ts       → users list
│   └── get.ts        → users get
└── db/
    └── index.ts      → db
```

`index.ts` collapses into its parent directory's route. This is what `run()`
uses automatically when `config.manifest` is not set; you never call
`discoverManifest` yourself in the common case:

```typescript
import { run } from 'cti'

void run({ name: 'my-cli', version: '1.0.0' }, import.meta)
```

`run()` resolves `config.commandsDir` (default `'commands'`) relative to
`import.meta.dir`, falling back to the parent directory if it's not found there
(so an entrypoint nested in `src/` still finds a top-level `commands/`).

Reach for this once a CLI has more than a handful of commands: new commands
are just new files, with no manifest to update.

## Lazy loading

Every entry carries an `importer`, not the loaded module. Only the command that
matches the resolved route is ever imported, so a CLI with a hundred commands
pays no more startup cost than one with a single command.

## No separate build step

There is no `cti build` or manifest-generation step. `discoverManifest` runs
the same `readdirSync` + dynamic `import()` walk whether the entrypoint is run
with `bun run` or invoked from a `bun build --compile` binary; behavior is
identical in both, because it's the same function doing the same work.

## See also

- [Command Routing](command-routing.md): how the router matches a manifest against argv
- [Core Concepts](../concepts/core-concepts.md): where the manifest fits in the dispatch flow
